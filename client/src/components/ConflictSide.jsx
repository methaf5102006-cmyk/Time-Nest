import { useState } from 'react';
import { scheduleFor, slotTimeFor, timesOverlap, classLabel } from '../constants';

const SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

export default function ConflictSide({ conflicts, lectures, onMove, onHighlight }) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState('');

  if (!conflicts || conflicts.length === 0) return null;

  const byId = new Map(lectures.map((l) => [l._id, l]));

  // A slot is free if the class has no lecture there and the teacher has no lecture at an overlapping time that day
  const freeSlots = (l) =>
    scheduleFor(l.classGroup).slots.filter((s) => {
      if (s.no === l.slot) return false;
      const t = slotTimeFor(s.no, l.day, l.classGroup);
      return !lectures.some(
        (x) =>
          x._id !== l._id &&
          x.day === l.day &&
          ((x.classGroup._id === l.classGroup._id && x.slot === s.no) ||
            (x.teacher._id === l.teacher._id && timesOverlap(slotTimeFor(x.slot, x.day, x.classGroup), t)))
      );
    });

  const move = async (l, slotNo) => {
    setBusy(l._id);
    await onMove(l._id, slotNo, l.classGroup._id);
    setBusy('');
  };

  return (
    <div className="cs-box">
      <div className="cs-head" onClick={() => setOpen(!open)}>
        <span>
          {'\u26A0'} {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} found. Move a lecture to a free slot to fix it.
        </span>
        <span className="cs-arrow">{open ? '\u25B2' : '\u25BC'}</span>
      </div>

      {open && (
        <div className="cs-grid">
          {conflicts.map((c, i) => {
            const ls = (c.lectureIds || []).map((id) => byId.get(id)).filter(Boolean);
            if (ls.length === 0) return null;
            const first = ls[0];
            const sameTeacher = ls.every((x) => x.teacher._id === first.teacher._id);
            const sameClass = ls.every((x) => x.classGroup._id === first.classGroup._id);
            const why =
              c.type === 'ROOM_CLASH'
                ? 'Room ' + first.room + ' is used by ' + ls.length + ' classes at the same time'
                : sameTeacher
                ? first.teacher.name + ' has ' + ls.length + ' lectures at the same time'
                : sameClass
                ? classLabel(first.classGroup) + ' has ' + ls.length + ' lectures at the same time'
                : 'These lectures clash';
            const when = (first.day ? SHORT[first.day] + ', ' : '') + slotTimeFor(first.slot, first.day, first.classGroup);

            return (
              <div className="cs-card" key={i}>
                <div className="cs-title">{why}</div>
                <div className="cs-when">{when}</div>

                {ls.map((l) => {
                  const free = freeSlots(l);
                  return (
                    <div className="cs-lec" key={l._id}>
                      <div className="cs-lec-name">{l.subject.name} ({l.subject.type})</div>
                      <div className="cs-lec-meta">{l.teacher.name} | {classLabel(l.classGroup)} | {slotTimeFor(l.slot, l.day, l.classGroup)}</div>
                      {free.length > 0 ? (
                        <>
                          <div className="cs-hint">Move to a free slot on {l.day ? SHORT[l.day] : 'this day'}:</div>
                          <div className="chip-row">
                            {free.map((s) => (
                              <button
                                type="button"
                                key={s.no}
                                className="chip chip-sm"
                                disabled={busy === l._id}
                                onClick={() => move(l, s.no)}
                              >
                                {slotTimeFor(s.no, l.day, l.classGroup)}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="cs-none">No free slot on this day for this teacher and class.</div>
                      )}
                    </div>
                  );
                })}

                <button type="button" className="link-btn" onClick={() => onHighlight(c.lectureIds)}>
                  Show on timetable
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
