const express = require('express');
const ClassGroup = require('../models/ClassGroup');
const Lecture = require('../models/Lecture');

const router = express.Router();

router.get('/', async (req, res) => {
  const classes = await ClassGroup.find().sort({ department: 1, order: 1, semester: 1, label: 1 }).collation({ locale: 'en', numericOrdering: true });
  res.json(classes);
});

router.post('/', async (req, res) => {
  try {
    const classGroup = await ClassGroup.create(req.body);
    res.status(201).json(classGroup);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Deleting a class also deletes its lectures
router.delete('/:id', async (req, res) => {
  try {
    await Lecture.deleteMany({ classGroup: req.params.id });
    await ClassGroup.findByIdAndDelete(req.params.id);
    res.json({ message: 'Class deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Each class can have its own slot times and break. reset:true goes back to the common times.
router.put('/:id/schedule', async (req, res) => {
  try {
    const cls = await ClassGroup.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    const b = req.body || {};

    let targets = [cls];
    if (b.applyTo === 'department') targets = await ClassGroup.find({ department: cls.department });
    if (b.applyTo === 'all') targets = await ClassGroup.find();
    const ids = targets.map((t) => t._id);

    if (b.reset) {
      await ClassGroup.updateMany({ _id: { $in: ids } }, { $set: { schedule: null } });
      return res.json({ message: 'Reset', classes: ids.length });
    }

    const slots = (Array.isArray(b.slots) ? b.slots : [])
      .map((s) => ({
        no: Number(s.no),
        time: String(s.time || '').trim(),
        fridayTime: String(s.fridayTime || '').trim(),
      }))
      .sort((a, c) => a.no - c.no);

    if (slots.length === 0) return res.status(400).json({ message: 'Add at least one slot.' });
    const nos = slots.map((s) => s.no);
    if (nos.some((n) => !Number.isInteger(n) || n < 1 || n > 20) || new Set(nos).size !== nos.length) {
      return res.status(400).json({ message: 'Slot numbers must be unique whole numbers from 1 to 20.' });
    }
    if (slots.some((s) => !s.time)) return res.status(400).json({ message: 'Every slot needs a time.' });

    const breakAfter = Number(b.breakAfter) || 0;
    if (breakAfter !== 0 && !nos.includes(breakAfter)) {
      return res.status(400).json({ message: 'The break must come after an existing slot.' });
    }

    for (const t of targets) {
      const ins = Number.isInteger(b.insertAfter) ? b.insertAfter : null;
      const used = (await Lecture.distinct('slot', { classGroup: t._id })).map((n) => (ins !== null && n > ins ? n + 1 : n)).filter((n) => !nos.includes(n));
      if (used.length > 0) {
        const name = `${t.department}${t.label ? ' ' + t.label : ''} - ${t.semester}`;
        return res.status(409).json({
          message: `${name}: slot ${used.join(', ')} still has lectures. Move or delete them first.`,
        });
      }
    }

    if (Number.isInteger(b.insertAfter)) {
      await Lecture.updateMany({ classGroup: { $in: ids }, slot: { $gt: b.insertAfter } }, { $inc: { slot: 1 } });
    }
    const schedule = {
      slots,
      breakAfter,
      breakTime: String(b.breakTime || '').trim(),
      breakFridayTime: String(b.breakFridayTime || '').trim(),
    };
    await ClassGroup.updateMany({ _id: { $in: ids } }, { $set: { schedule } });
    res.json({ message: 'Saved', classes: ids.length });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// Save the left-to-right order of classes
router.put('/reorder', async (req, res) => {
  try {
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
    await Promise.all(ids.map((id, i) => ClassGroup.updateOne({ _id: id }, { $set: { order: i } })));
    res.json({ message: 'Saved' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a whole department with its classes and lectures
router.delete('/department/:name', async (req, res) => {
  try {
    const list = await ClassGroup.find({ department: req.params.name });
    const ids = list.map((c) => c._id);
    await Lecture.deleteMany({ classGroup: { $in: ids } });
    await ClassGroup.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Department deleted', classes: ids.length });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;






