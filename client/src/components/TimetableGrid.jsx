import { useState } from 'react';
import { classLabel, scheduleFor } from '../constants';
import TimeEditModal from './TimeEditModal';
import api from '../api/api';
import { reloadKeep } from '../keepScroll';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

// Text color that stays readable on a given background
function inkFor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const r = n >> 16;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0f172a' : '#fff';
}

// Lectures with the same subject, teacher, room and color become one card
function groupLectures(list) {
  const map = new Map();
  list.forEach((l) => {
    const key = [l.subject._id, l.teacher._id, l.room || '', l.color || ''].join('|');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(l);
  });
  return [...map.values()].map((g) =>
    g.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
  );
}

export default function TimetableGrid({
  title, classes, lectures, colors, clashIds, highlightIds, exportRef,
  onCellClick, onLectureClick, onMove, onDeleteClass, onReorder,
}) {
  const [overKey, setOverKey] = useState('');
  const [timeEdit, setTimeEdit] = useState(null);
  const [dragCol, setDragCol] = useState('');

  const rowNos = [...new Set(classes.flatMap((cc) => scheduleFor(cc).slots.map((x) => x.no)))].sort((p, q) => p - q);

  const swapRows = async (no, dir) => {
    const i = rowNos.indexOf(no);
    const other = rowNos[i + dir];
    if (other === undefined) return;
    const missing = classes.some((cc) => {
      const n = scheduleFor(cc).slots.map((x) => x.no);
      return !n.includes(no) || !n.includes(other);
    });
    if (missing) { window.alert('These two rows do not exist in every class, so they cannot be swapped.'); return; }
    try {
      await api.post('/lectures/swap-slots', { classGroups: classes.map((cc) => cc._id), a: no, b: other });
      reloadKeep();
    } catch {
      window.alert('Could not move the row.');
    }
  };

  const deleteRow = async (no) => {
    if (rowNos.length <= 1) { window.alert('At least one row must remain.'); return; }
    const mine = lectures.filter((l) => l.slot === no);
    if (!window.confirm('Delete this whole row from all classes? ' + mine.length + ' lecture(s) will be deleted.')) return;
    try {
      for (const l of mine) await api.delete('/lectures/' + l._id);
      for (const cc of classes) {
        const sc = scheduleFor(cc);
        const slots = sc.slots.filter((x) => x.no !== no);
        if (slots.length === sc.slots.length || slots.length === 0) continue;
        let breakAfter = sc.breakAfter;
        if (breakAfter === no) {
          const before = slots.filter((x) => x.no < no).map((x) => x.no);
          breakAfter = before.length ? Math.max(...before) : 0;
        }
        await api.put('/classes/' + cc._id + '/schedule', {
          slots, breakAfter, breakTime: sc.breakTime, breakFridayTime: sc.breakFridayTime, applyTo: 'class',
        });
      }
      reloadKeep();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not delete the row.');
    }
  };
  const rowCount = (no) => Math.max(0, ...classes.map((cc) => groupLectures(lectures.filter((l) => l.slot === no && l.classGroup._id === cc._id)).length));

  if (classes.length === 0) {
    return <div className="empty">Add a class (+ Add class) to see its timetable.</div>;
  }

  return (
    <div className="tt-wrap">
      {timeEdit && (
        <TimeEditModal
          cls={timeEdit.cls}
          classes={classes}
          target={timeEdit.target}
          scope={timeEdit.scope}
          onClose={() => setTimeEdit(null)}
        />
      )}

      <div className="export-area" ref={exportRef}>
        <div className="tt-banner">
          <span className="tt-brand">Time Nest</span>
          {title && <span className="tt-title">{title}</span>}
        </div>

        <div className="tt-cols">
          {classes.map((c) => {
            const sc = scheduleFor(c);
            const total = lectures.filter((l) => l.classGroup._id === c._id).length;

            return (
              <section
                className={'tt-col' + (dragCol && dragCol !== c._id ? ' col-target' : '')}
                key={c._id}
                onDragOver={(e) => { if (dragCol) e.preventDefault(); }}
                onDrop={(e) => {
                  if (!dragCol) return;
                  e.preventDefault();
                  onReorder(dragCol, c._id);
                  setDragCol('');
                }}
              >
                <header className="tt-col-head" draggable title="Drag to move this class" onDragStart={(e) => { e.dataTransfer.setData("application/x-col", c._id); setDragCol(c._id); }} onDragEnd={() => setDragCol("")}>
                  <div className="tt-col-name">{classLabel(c)}</div>
                  <span className="tt-count" data-html2canvas-ignore="true">{total} {total === 1 ? 'lecture' : 'lectures'}</span>
                <button type="button" className="tt-col-x" data-html2canvas-ignore="true" title="Delete this class" onClick={() => onDeleteClass(c)}>&times;</button></header>

                {sc.slots.map((s) => {
                  const key = s.no + '-' + c._id;
                  const here = lectures.filter((l) => l.slot === s.no && l.classGroup._id === c._id);
                  const hasBreak = sc.breakAfter === s.no && sc.breakTime;

                  return (
                    <div key={s.no}>
                      <div
                        className={'tt-slot' + (overKey === key ? ' drop-over' : '')} style={{ minHeight: 56 + Math.max(rowCount(s.no), 1) * 72 }}
                        onDragOver={(e) => { e.preventDefault(); setOverKey(key); }}
                        onDragLeave={() => setOverKey('')}
                        onDrop={(e) => {
                          e.preventDefault();
                          setOverKey('');
                          const ids = e.dataTransfer.getData('text/plain');
                          if (ids) ids.split(',').forEach((id) => onMove(id, s.no, c._id));
                        }}
                      >
                        <button
                          type="button"
                          className="tt-time"
                          title="Click to change this time"
                          onClick={() => setTimeEdit({ cls: c, target: s.no, scope: 'department' })}
                        >
                          <span className="tt-dot" />
                          {s.time}
                          {s.fridayTime ? <em>Fri {s.fridayTime}</em> : null}
                        </button>

                        {groupLectures(here).map((g) => {
                          const l = g[0];
                          const color = l.color || colors[l.teacher._id] || '#1e3a8a';
                          const clash = g.some((x) => clashIds.has(x._id));
                          const hl = g.some((x) => highlightIds.includes(x._id));
                          const days = g.map((x) => SHORT[x.day]).filter(Boolean);
                          return (
                            <div
                              key={g.map((x) => x._id).join('-')}
                              className={'tt-card' + (clash ? ' clash' : '') + (hl ? ' highlight' : '') + (l.color && !clash ? ' filled' : '')}
                              style={l.color && !clash ? { '--c': color, '--fill': l.color, '--ink': inkFor(l.color) } : { '--c': color }}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('text/plain', g.map((x) => x._id).join(','))}
                              onClick={(e) => { e.stopPropagation(); onLectureClick(l, g); }}
                            >
                              {clash && <span className="tt-clash">CLASH</span>}
                    <button type="button" className="tt-card-x" data-html2canvas-ignore="true" title="Delete this lecture"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const n = g.length;
                        if (!window.confirm(n > 1 ? 'Delete this lecture on all ' + n + ' days?' : 'Delete this lecture?')) return;
                        try {
                          for (const x of g) await api.delete('/lectures/' + x._id);
                          reloadKeep();
                        } catch {
                          window.alert('Could not delete the lecture.');
                        }
                      }}>&times;</button>
                              <div className="tt-subject" title={l.subject.name}>
                                {l.subject.name}
                                {l.subject.type === 'practical' && <span className="tt-prac">Practical</span>}
                              </div>
                              <div className="tt-teacher">{l.teacher.name}</div>
                              <div className="tt-foot">
                                {l.room ? <span className="tt-room">Room {l.room}</span> : null}
                                {days.map((d) => <span key={d} className="tt-day">{d}</span>)}
                              </div>
                            </div>
                          );
                        })}

                        <span className="tt-rowtools" data-html2canvas-ignore="true">
                          <button type="button" title="Move this row up (all classes)" onClick={(e) => { e.stopPropagation(); swapRows(s.no, -1); }}>&uarr;</button>
                          <button type="button" title="Move this row down (all classes)" onClick={(e) => { e.stopPropagation(); swapRows(s.no, 1); }}>&darr;</button>
                          <button type="button" className="rt-del" title="Delete this row (all classes)" onClick={(e) => { e.stopPropagation(); deleteRow(s.no); }}>&times;</button>
                        </span>
                        <button type="button" className="tt-add" data-html2canvas-ignore="true" onClick={() => onCellClick(s.no, c)}>
                          <span className="tt-plus">+</span>
                          {here.length === 0 ? 'Add lecture' : 'Add another'}
                        </button>
                      </div>

                      {hasBreak && (
                        <button
                          type="button"
                          className="tt-break"
                          title="Click to change break"
                          onClick={() => setTimeEdit({ cls: c, target: 'break', scope: 'department' })}
                        >
                          BREAK &middot; {sc.breakTime}
                          {sc.breakFridayTime ? ' | Fri ' + sc.breakFridayTime : ''}
                        </button>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  className="tt-add-slot" data-html2canvas-ignore="true"
                  onClick={() => setTimeEdit({ cls: c, target: 'new', scope: 'class' })}
                >
                  + Add slot
                </button>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}












