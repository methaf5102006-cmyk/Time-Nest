const { getSchedule, timeForClass } = require('./schedule');
const Lecture = require('../models/Lecture');

const SLOT_TIMES = {
  1: '08:00 - 08:45',
  2: '08:45 - 09:30',
  3: '09:30 - 10:15',
  4: '10:45 - 11:30',
  5: '11:30 - 12:15',
  6: '12:15 - 13:00',
};

// Loads every lecture with its class, subject and teacher filled in.
async function loadLectures() {
  const lectures = await Lecture.find()
    .populate('classGroup')
    .populate('subject')
    .populate('teacher')
    .lean();
  const cfg = await getSchedule();
  const valid = lectures.filter((l) => l.classGroup && l.subject && l.teacher);
  valid.forEach((l) => {
    l.slotTime = timeForClass(cfg, l);
  });
  return valid;
}

function classLabel(cg) {
  return `${cg.department}${cg.label ? ' ' + cg.label : ''} - ${cg.semester}`;
}

function describe(l) {
  const room = l.room ? ` (${l.room})` : '';
  return `${classLabel(l.classGroup)}: ${l.subject.name}${room}`;
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (key === null) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

// Start and end of a lecture in minutes. If the time cannot be read, the slot number is used.
function rangeOf(l) {
  const m = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/.exec(l.slotTime || '');
  if (m) return [Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])];
  return [l.slot * 1000, l.slot * 1000 + 1];
}

// Splits a list of lectures into groups whose times really overlap (groups of 2 or more only)
function overlapGroups(items) {
  const sorted = items.map((l) => ({ l, r: rangeOf(l) })).sort((a, b) => a.r[0] - b.r[0]);
  const groups = [];
  let cur = null;
  for (const it of sorted) {
    if (cur && it.r[0] < cur.end) {
      cur.items.push(it.l);
      cur.end = Math.max(cur.end, it.r[1]);
    } else {
      cur = { items: [it.l], end: it.r[1] };
      groups.push(cur);
    }
  }
  return groups.filter((g) => g.items.length > 1).map((g) => g.items);
}

function whenLabel(l) {
  const time = l.slotTime || SLOT_TIMES[l.slot];
  return l.day ? `${l.day}, ${time}` : time;
}

function makeConflict(type, title, group) {
  const lectureIds = group.map((l) => String(l._id)).sort();
  return {
    id: `${type}:${lectureIds.join('-')}`,
    type,
    slot: group[0].slot,
    day: group[0].day || null,
    time: group[0].slotTime || SLOT_TIMES[group[0].slot],
    title,
    details: group.map(describe),
    lectureIds,
  };
}

// Looks at all lectures and returns a list of conflicts.
function detectConflicts(lectures) {
  const conflicts = [];

  // 1. Same teacher in two places at overlapping times
  const byTeacher = groupBy(lectures, (l) => `${l.day || 'any'}|${l.teacher._id}`);
  for (const list of byTeacher.values()) {
    for (const group of overlapGroups(list)) {
      conflicts.push(
        makeConflict(
          'TEACHER_CLASH',
          `${group[0].teacher.name} is scheduled for ${group.length} simultaneous classes at ${whenLabel(group[0])}`,
          group
        )
      );
    }
  }

  // 2. Same room used by two classes at overlapping times
  const byRoom = groupBy(lectures, (l) =>
    l.room && l.room.trim() ? `${l.day || 'any'}|${l.room.trim().toLowerCase()}` : null
  );
  for (const list of byRoom.values()) {
    for (const group of overlapGroups(list)) {
      conflicts.push(
        makeConflict(
          'ROOM_CLASH',
          `Room ${group[0].room} has ${group.length} overlapping classes at ${whenLabel(group[0])}`,
          group
        )
      );
    }
  }

  // 3. Same class has two lectures in the same slot
  const byClass = groupBy(lectures, (l) => `${l.day || 'any'}|${l.slot}|${l.classGroup._id}`);
  for (const group of byClass.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        conflicts.push(
          makeConflict(
            'SECTION_CLASH',
            `${classLabel(group[i].classGroup)} has 2 classes at ${whenLabel(group[i])}`,
            [group[i], group[j]]
          )
        );
      }
    }
  }

  return conflicts;
}

module.exports = { loadLectures, detectConflicts, SLOT_TIMES };
