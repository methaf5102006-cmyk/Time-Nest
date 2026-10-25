const express = require('express');
const Lecture = require('../models/Lecture');
const Teacher = require('../models/Teacher');
const { loadLectures, detectConflicts } = require('../utils/conflictCheck');
const {
  MIN_LECTURES_PER_WEEK,
  buildSubjectProgress,
  buildTeacherAssignments,
} = require('../utils/reports');

const router = express.Router();

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => res.status(400).json({ message: err.message }));

const populateAll = (query) =>
  query.populate('classGroup').populate('subject').populate('teacher');

// All lectures (optional filters: ?classGroup=ID or ?teacher=ID)
router.get(
  '/',
  wrap(async (req, res) => {
    const filter = {};
    if (req.query.classGroup) filter.classGroup = req.query.classGroup;
    if (req.query.teacher) filter.teacher = req.query.teacher;
    const lectures = await populateAll(Lecture.find(filter).sort({ slot: 1 }));
    res.json(lectures);
  })
);

// All current conflicts
router.get(
  '/conflicts',
  wrap(async (req, res) => {
    res.json(detectConflicts(await loadLectures()));
  })
);

// Numbers for the dashboard cards
router.get(
  '/stats',
  wrap(async (req, res) => {
    const lectures = await loadLectures();
    const progress = buildSubjectProgress(lectures);
    res.json({
      totalLectures: lectures.length,
      subjectsOnTarget: progress.filter((p) => p.done).length,
      totalSubjects: progress.length,
      teachersAssigned: new Set(lectures.map((l) => String(l.teacher._id))).size,
      totalTeachers: await Teacher.countDocuments(),
      conflictCount: detectConflicts(lectures).length,
    });
  })
);

router.get(
  '/subject-progress',
  wrap(async (req, res) => {
    res.json(buildSubjectProgress(await loadLectures()));
  })
);

router.get(
  '/teacher-assignments',
  wrap(async (req, res) => {
    const teachers = await Teacher.find().sort('name');
    res.json(buildTeacherAssignments(await loadLectures(), teachers));
  })
);

// Kept so the current screen keeps working until the new admin panel replaces it
router.get(
  '/teacher-load',
  wrap(async (req, res) => {
    const teachers = await Teacher.find().sort('name');
    const rows = buildTeacherAssignments(await loadLectures(), teachers);
    res.json(
      rows.map((r) => ({
        teacher: r.name,
        lectures: r.weeklyLectures,
        required: MIN_LECTURES_PER_WEEK,
        ok: r.weeklyLectures >= MIN_LECTURES_PER_WEEK,
      }))
    );
  })
);

// Add a lecture. Clashes are saved and reported back, not blocked.
router.post(
  '/',
  wrap(async (req, res) => {
    const lecture = await Lecture.create(req.body);
    const id = String(lecture._id);
    const conflicts = detectConflicts(await loadLectures()).filter((c) =>
      c.lectureIds.includes(id)
    );
    res.status(201).json({
      lecture: await populateAll(Lecture.findById(id)),
      conflicts,
    });
  })
);

// Edit or move a lecture. Only the fields you send are changed.
router.put(
  '/:id',
  wrap(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ message: 'Lecture not found' });
    lecture.set(req.body);
    await lecture.save();
    const id = String(lecture._id);
    const conflicts = detectConflicts(await loadLectures()).filter((c) =>
      c.lectureIds.includes(id)
    );
    res.json({
      lecture: await populateAll(Lecture.findById(id)),
      conflicts,
    });
  })
);

router.delete(
  '/:id',
  wrap(async (req, res) => {
    await Lecture.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lecture deleted' });
  })
);

// Swap all lectures of two slots for the given classes
router.post(
  '/swap-slots',
  wrap(async (req, res) => {
    const ids = Array.isArray(req.body.classGroups) ? req.body.classGroups : [];
    const a = Number(req.body.a);
    const b = Number(req.body.b);
    if (!ids.length || !a || !b) return res.status(400).json({ message: 'Invalid request' });
    await Lecture.updateMany({ classGroup: { $in: ids }, slot: a }, { $set: { slot: 1000 } });
    await Lecture.updateMany({ classGroup: { $in: ids }, slot: b }, { $set: { slot: a } });
    await Lecture.updateMany({ classGroup: { $in: ids }, slot: 1000 }, { $set: { slot: b } });
    res.json({ message: 'Swapped' });
  })
);

module.exports = router;

