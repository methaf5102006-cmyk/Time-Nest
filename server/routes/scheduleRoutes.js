const express = require('express');
const TimeConfig = require('../models/TimeConfig');
const Lecture = require('../models/Lecture');
const { getSchedule } = require('../utils/schedule');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.json(await getSchedule());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const b = req.body || {};
    const slots = (Array.isArray(b.slots) ? b.slots : [])
      .map((s) => ({
        no: Number(s.no),
        time: String(s.time || '').trim(),
        fridayTime: String(s.fridayTime || '').trim(),
      }))
      .sort((a, c) => a.no - c.no);

    if (slots.length === 0) {
      return res.status(400).json({ message: 'Add at least one slot.' });
    }
    const nos = slots.map((s) => s.no);
    if (nos.some((n) => !Number.isInteger(n) || n < 1 || n > 20) || new Set(nos).size !== nos.length) {
      return res.status(400).json({ message: 'Slot numbers must be unique whole numbers from 1 to 20.' });
    }
    if (slots.some((s) => !s.time)) {
      return res.status(400).json({ message: 'Every slot needs a time.' });
    }

    const used = await Lecture.distinct('slot', { slot: { $nin: nos } });
    if (used.length > 0) {
      return res.status(409).json({
        message: `Slot ${used.join(', ')} still has lectures. Move or delete those lectures first.`,
      });
    }

    const breakAfter = Number(b.breakAfter) || 0;
    if (breakAfter !== 0 && !nos.includes(breakAfter)) {
      return res.status(400).json({ message: 'The break must come after an existing slot.' });
    }

    const doc = await TimeConfig.findOneAndUpdate(
      { key: 'main' },
      {
        key: 'main',
        slots,
        breakAfter,
        breakTime: String(b.breakTime || '').trim(),
        breakFridayTime: String(b.breakFridayTime || '').trim(),
        fridayDepartments: (Array.isArray(b.fridayDepartments) ? b.fridayDepartments : [])
          .map((d) => String(d).trim())
          .filter(Boolean),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
