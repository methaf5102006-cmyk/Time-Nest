const MIN_LECTURES_PER_WEEK = 4;

// Progress per subject and class, for example "Data Structures, BS IT - 3: 3 of 4".
function buildSubjectProgress(lectures) {
  const groups = new Map();
  for (const l of lectures) {
    const key = `${l.subject._id}|${l.classGroup._id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        subjectId: String(l.subject._id),
        subject: l.subject.name,
        classGroupId: String(l.classGroup._id),
        className: `${l.classGroup.department}${l.classGroup.label ? " " + l.classGroup.label : ""} - ${l.classGroup.semester}`,
        count: 0,
        target: l.subject.weeklyTarget || MIN_LECTURES_PER_WEEK,
      });
    }
    groups.get(key).count += 1;
  }
  return [...groups.values()]
    .map((g) => ({ ...g, done: g.count >= g.target }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

// One row per teacher: subjects taught and total weekly lectures.
function buildTeacherAssignments(lectures, teachers) {
  return teachers.map((t, i) => {
    const mine = lectures.filter((l) => String(l.teacher._id) === String(t._id));
    return {
      teacherId: String(t._id),
      name: t.name,
      color: t.color || null,
      subjects: [...new Set(mine.map((l) => l.subject.name))],
      weeklyLectures: mine.length,
    };
  });
}

module.exports = { MIN_LECTURES_PER_WEEK, buildSubjectProgress, buildTeacherAssignments };

