const express = require('express');
const Teacher = require('../models/Teacher');
const Lecture = require('../models/Lecture');

const router = express.Router();

const PALETTE = [
  '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#db2777', '#0891b2',
  '#ca8a04', '#4f46e5', '#dc2626', '#0d9488', '#65a30d', '#7c3aed',
];

router.get('/', async (req, res) => {
  const teachers = await Teacher.find().sort('name');
  res.json(
    teachers.map((t, i) => ({
      ...t.toObject(),
      color: t.color || PALETTE[i % PALETTE.length],
    }))
  );
});

router.post('/', async (req, res) => {
  try {
    const count = await Teacher.countDocuments();
    const color = req.body.color || PALETTE[count % PALETTE.length];
    const teacher = await Teacher.create({ ...req.body, color });
    res.status(201).json(teacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const used = await Lecture.countDocuments({ teacher: req.params.id });
    if (used > 0) {
      return res
        .status(409)
        .json({ message: `This teacher still has ${used} lecture(s). Remove them first.` });
    }
    await Teacher.findByIdAndDelete(req.params.id);
    res.json({ message: 'Teacher deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
