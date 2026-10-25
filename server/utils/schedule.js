const TimeConfig = require('../models/TimeConfig');

const DEFAULT_SCHEDULE = {
  slots: [
    { no: 1, time: '08:00 - 08:45', fridayTime: '' },
    { no: 2, time: '08:45 - 09:30', fridayTime: '' },
    { no: 3, time: '09:30 - 10:15', fridayTime: '' },
    { no: 4, time: '10:45 - 11:30', fridayTime: '' },
    { no: 5, time: '11:30 - 12:15', fridayTime: '' },
    { no: 6, time: '12:15 - 13:00', fridayTime: '' },
  ],
  breakAfter: 3,
  breakTime: '10:15 - 10:45',
  breakFridayTime: '',
  fridayDepartments: ['Intermediate'],
};

async function getSchedule() {
  const doc = await TimeConfig.findOne({ key: 'main' }).lean();
  return doc || DEFAULT_SCHEDULE;
}

function timeFor(cfg, slotNo, day, department) {
  const s = cfg.slots.find((x) => x.no === slotNo);
  if (!s) return `Slot ${slotNo}`;
  if (day === 'Friday' && s.fridayTime && (cfg.fridayDepartments || []).includes(department)) {
    return s.fridayTime;
  }
  return s.time;
}

// Time of a lecture, using the class's own schedule if it has one
function timeForClass(cfg, l) {
  const cs = l.classGroup && l.classGroup.schedule;
  if (cs && Array.isArray(cs.slots) && cs.slots.length > 0) {
    const s = cs.slots.find((x) => x.no === l.slot);
    if (!s) return `Slot ${l.slot}`;
    if (l.day === 'Friday' && s.fridayTime) return s.fridayTime;
    return s.time;
  }
  return timeFor(cfg, l.slot, l.day, l.classGroup.department);
}
module.exports = { DEFAULT_SCHEDULE, getSchedule, timeFor, timeForClass };

