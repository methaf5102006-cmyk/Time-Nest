const express = require('express');
const Subject = require('../models/Subject');
const Lecture = require('../models/Lecture');

const router = express.Router();

router.get('/', async (req, res) => {
  const subjects = await Subject.find().sort('name');
  res.json(subjects);
});

router.post('/', async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json(subject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const used = await Lecture.countDocuments({ subject: req.params.id });
    if (used > 0) {
      return res
        .status(409)
        .json({ message: `This subject is used in ${used} lecture(s). Remove them first.` });
    }
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Change the weekly target of a subject
router.put('/:id', async (req, res) => {
  try {
    const target = Math.max(1, Number(req.body && req.body.weeklyTarget) || 1);
    const subject = await Subject.findByIdAndUpdate(req.params.id, { weeklyTarget: target }, { new: true });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

