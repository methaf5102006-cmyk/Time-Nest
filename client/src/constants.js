export const DEFAULT_SCHEDULE = {
  slots: [
    { no: 1, time: '08:00 - 08:45', fridayTime: '' },
    { no: 2, time: '08:45 - 09:30', fridayTime: '' },
    { no: 3, time: '09:30 - 10:15', fridayTime: '' },
    { no: 4, time: '10:45 - 11:30', fridayTime: '' },
    { no: 5, time: '11:30 - 12:15', fridayTime: '' },
    { no: 6, time: '12:15 - 1:00', fridayTime: '' },
  ],
  breakAfter: 3,
  breakTime: '10:15 - 10:45',
  breakFridayTime: '',
  fridayDepartments: ['Intermediate'],
};

// These values are replaced by the saved schedule when the app starts.
export let SLOTS = DEFAULT_SCHEDULE.slots;
export let BREAK_AFTER_SLOT = DEFAULT_SCHEDULE.breakAfter;
export let BREAK_TIME = DEFAULT_SCHEDULE.breakTime;
export let BREAK_FRIDAY_TIME = DEFAULT_SCHEDULE.breakFridayTime;
export let FRIDAY_DEPARTMENTS = DEFAULT_SCHEDULE.fridayDepartments;

export function applySchedule(cfg) {
  if (!cfg || !Array.isArray(cfg.slots) || cfg.slots.length === 0) return;
  SLOTS = [...cfg.slots]
    .sort((a, b) => a.no - b.no)
    .map((s) => ({ no: s.no, time: s.time, fridayTime: s.fridayTime || '' }));
  BREAK_AFTER_SLOT = cfg.breakAfter || 0;
  BREAK_TIME = cfg.breakTime || '';
  BREAK_FRIDAY_TIME = cfg.breakFridayTime || '';
  FRIDAY_DEPARTMENTS = cfg.fridayDepartments || [];
}

export function slotTime(no, day, department) {
  const s = SLOTS.find((x) => x.no === no);
  if (!s) return 'Slot ' + no;
  if (day === 'Friday' && s.fridayTime && FRIDAY_DEPARTMENTS.includes(department)) return s.fridayTime;
  return s.time;
}

export const PRESET_DEPARTMENTS = ['BS IT', 'BS English', 'Intermediate'];

// Example: "BS IT - 3" or "Intermediate Pre-Engineering - 1"
export function classLabel(c) {
  return `${c.department}${c.label ? ' ' + c.label : ''} - ${c.semester}`;
}

// Schedule of one class: its own times if it has them, otherwise the common times
export function scheduleFor(c) {
  const cs = c && c.schedule;
  if (cs && Array.isArray(cs.slots) && cs.slots.length > 0) {
    return {
      custom: true,
      slots: [...cs.slots]
        .sort((a, b) => a.no - b.no)
        .map((s) => ({ no: s.no, time: s.time, fridayTime: s.fridayTime || '' })),
      breakAfter: cs.breakAfter || 0,
      breakTime: cs.breakTime || '',
      breakFridayTime: cs.breakFridayTime || '',
    };
  }
  const fri = !!c && FRIDAY_DEPARTMENTS.includes(c.department);
  return {
    custom: false,
    slots: SLOTS.map((s) => ({ no: s.no, time: s.time, fridayTime: fri ? s.fridayTime || '' : '' })),
    breakAfter: BREAK_AFTER_SLOT,
    breakTime: BREAK_TIME,
    breakFridayTime: fri ? BREAK_FRIDAY_TIME : '',
  };
}

export function slotTimeFor(no, day, c) {
  const s = scheduleFor(c).slots.find((x) => x.no === no);
  if (!s) return 'Slot ' + no;
  return day === 'Friday' && s.fridayTime ? s.fridayTime : s.time;
}

export function timeRange(t) {
  const m = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/.exec(t || '');
  if (!m) return null;
  return [Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])];
}

export function timesOverlap(a, b) {
  const x = timeRange(a);
  const y = timeRange(b);
  if (!x || !y) return a === b;
  return x[0] < y[1] && y[0] < x[1];
}

