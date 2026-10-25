import { useState } from 'react';
import api from '../api/api';
import { slotTimeFor, classLabel } from '../constants';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

const PRESETS = [
  { label: 'Mon, Tue', days: ['Monday', 'Tuesday'] },
  { label: 'Wed, Thu', days: ['Wednesday', 'Thursday'] },
  { label: 'Fri', days: ['Friday'] },
  { label: 'Mon-Thu', days: DAYS.slice(0, 4) },
  { label: 'All 6 days', days: [...DAYS] },
  { label: 'Clear', days: [] },
];

const COLORS = ['#2563eb', '#7c3aed', '#16a34a', '#ea580c', '#db2777', '#0d9488', '#dc2626', '#ca8a04', '#0891b2', '#4f46e5', '#65a30d', '#475569'];

export default function LectureModal({ slot, classGroup, lecture, group, teachers, subjects, onClose, onSaved, onAdded }) {
  const members = group && group.length ? group : lecture ? [lecture] : [];

  const [subject, setSubject] = useState(lecture ? lecture.subject._id : '');
  const [teacher, setTeacher] = useState(lecture ? lecture.teacher._id : '');
  const [room, setRoom] = useState(lecture ? lecture.room || '' : '');
  const [color, setColor] = useState(lecture ? lecture.color || '' : '');
  const [days, setDays] = useState(members.map((l) => l.day).filter(Boolean));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [applyAll, setApplyAll] = useState(false);

  const [adding, setAdding] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('theory');
  const [newTarget, setNewTarget] = useState('4');

  const [tq, setTq] = useState('');
  const [sq, setSq] = useState('');
  const [openT, setOpenT] = useState(false);
  const [openTh, setOpenTh] = useState(false);
  const [openPr, setOpenPr] = useState(false);

  const hasOldDayless = members.some((l) => !l.day);

  const toggleDay = (d) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
  const sameDays = (a) => a.length > 0 && a.length === days.length && a.every((d) => days.includes(d));

  const removeItem = async (kind, item) => {
    if (!window.confirm('Delete ' + item.name + '?')) return;
    try {
      await api.delete('/' + kind + '/' + item._id);
      if (kind === 'teachers' && teacher === item._id) setTeacher('');
      if (kind === 'subjects' && subject === item._id) setSubject('');
      setMessage('');
      if (onAdded) onAdded();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not delete.');
    }
  };

  const openAdd = (what) => {
    setAdding(adding === what ? '' : what);
    setNewName('');
    setMessage('');
  };

  const addNew = async () => {
    const name = newName.trim();
    if (!name) {
      setMessage('Write a name first.');
      return;
    }
    try {
      if (adding === 'teacher') {
        const r = await api.post('/teachers', { name });
        setTeacher(r.data._id);
      } else {
        const r = await api.post('/subjects', { name, type: newType, weeklyTarget: Number(newTarget) || 4 });
        setSubject(r.data._id);
      }
      setAdding('');
      setNewName('');
      setMessage('');
      if (onAdded) onAdded();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not add.');
    }
  };

  const save = async () => {
    if (!subject || !teacher) {
      setMessage('Subject and teacher are required.');
      return;
    }
    if (days.length === 0) {
      setMessage('Select at least one day.');
      return;
    }
    const base = { slot, classGroup: classGroup._id, subject, teacher, sections: [], room, color };
    setBusy(true);
    try {
      const byDay = new Map();
      const dayless = [];
      members.forEach((l) => (l.day ? byDay.set(l.day, l) : dayless.push(l)));

      for (const d of DAYS) {
        if (!days.includes(d)) continue;
        const existing = byDay.get(d) || dayless.shift();
        if (existing) await api.put('/lectures/' + existing._id, { ...base, day: d });
        else await api.post('/lectures', { ...base, day: d });
      }
      for (const [d, l] of byDay) {
        if (!days.includes(d)) await api.delete('/lectures/' + l._id);
      }
      for (const l of dayless) await api.delete('/lectures/' + l._id);

      if (applyAll) {
        const r = await api.get('/lectures', { params: { teacher } });
        for (const l of r.data) {
          if ((l.color || '') !== color) await api.put('/lectures/' + l._id, { color });
        }
      }

      onSaved();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save the lecture.');
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this lecture for all ' + members.length + ' day(s)?')) return;
    setBusy(true);
    try {
      for (const l of members) await api.delete('/lectures/' + l._id);
      onSaved();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not delete.');
      setBusy(false);
    }
  };

  const match = (name, q) => name.toLowerCase().includes(q.trim().toLowerCase());
  const shownTeachers = teachers.filter((t) => match(t.name, tq));
  const shownSubjects = subjects.filter((s) => match(s.name, sq));
  const theory = shownSubjects.filter((s) => s.type !== 'practical');
  const practical = shownSubjects.filter((s) => s.type === 'practical');

  const LIMIT = 2;
  const clip = (list, open, sel, q) => {
    if (open || q.trim() || list.length <= LIMIT) return list;
    const head = list.slice(0, LIMIT);
    const chosen = list.find((x) => x._id === sel);
    if (chosen && !head.includes(chosen)) head[LIMIT - 1] = chosen;
    return head;
  };
  const more = (list, open, setOpen, q) =>
    list.length > LIMIT && !q.trim() ? (
      <button type="button" className="lm-more" onClick={() => setOpen(!open)}>
        {open ? '\u25B2 Show less' : '\u25BC ' + (list.length - LIMIT) + ' more'}
      </button>
    ) : null;

  const pickedTeacher = teachers.find((t) => t._id === teacher);
  const pickedSubject = subjects.find((s) => s._id === subject);
  const dayText = DAYS.filter((d) => days.includes(d)).map((d) => SHORT[d]).join(', ');

  const subjectChip = (s) => (
    <span className="lm-wrap" key={s._id}>
      <button type="button" className={subject === s._id ? 'lm-chip active' : 'lm-chip'} onClick={() => setSubject(s._id)}>
        {s.name}
      </button>
      <button type="button" className="lm-x" title="Delete subject" onClick={() => removeItem('subjects', s)}>&times;</button>
    </span>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal lm" onClick={(e) => e.stopPropagation()}>
        <div className="lm-head">
          <div>
            <h3>{lecture ? 'Edit Lecture' : 'Add New Lecture'}</h3>
            <div className="lm-sub">
              <span className="lm-pill">{slotTimeFor(slot, '', classGroup)}</span>
              <span className="lm-pill">{classLabel(classGroup)}</span>
            </div>
          </div>
          <button type="button" className="lm-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="lm-body">
          {message && <div className="notice">{message}</div>}
          {hasOldDayless && (
            <div className="notice">This lecture was saved without a day. Select its days below and save.</div>
          )}

          <section className="lm-sec">
            <div className="lm-title">
              <span>1. Teacher</span>
              <button type="button" className="lm-link" onClick={() => openAdd('teacher')}>+ New teacher</button>
            </div>
            {adding === 'teacher' && (
              <div className="lm-add" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setAdding(""); setNewName(""); } }}>
                <input autoFocus placeholder="Teacher name" value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNew(); } }} />
                <button type="button" className="btn btn-small" onClick={addNew}>Add</button>
                <button type="button" className="lm-formx" title="Close" onClick={() => { setAdding(""); setNewName(""); }}>&times;</button>
              </div>
            )}
            {teachers.length > 0 && (
              <input className="lm-search" placeholder="Search teacher..." value={tq} onChange={(e) => setTq(e.target.value)} />
            )}
            <div className="lm-chips">
              {clip(shownTeachers, openT, teacher, tq).map((t) => (
                <span className="lm-wrap" key={t._id}>
                  <button type="button" className={teacher === t._id ? 'lm-chip active' : 'lm-chip'} onClick={() => setTeacher(t._id)}>{t.name}</button>
                  <button type="button" className="lm-x" title="Delete teacher" onClick={() => removeItem('teachers', t)}>&times;</button>
                </span>
              ))}
              {shownTeachers.length === 0 && <span className="lm-none">No teacher found</span>}
              {more(shownTeachers, openT, setOpenT, tq)}
            </div>
          </section>

          <section className="lm-sec">
            <div className="lm-title">
              <span>2. Subject</span>
              <button type="button" className="lm-link" onClick={() => openAdd('subject')}>+ New subject</button>
            </div>
            {adding === 'subject' && (
              <div className="lm-add" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setAdding(""); setNewName(""); } }}>
                <input autoFocus placeholder="Subject name" value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNew(); } }} />
                <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                  <option value="theory">Theory</option>
                  <option value="practical">Practical</option>
                </select>
                <input className="lm-num" title="Lectures per week" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} />
                <button type="button" className="btn btn-small" onClick={addNew}>Add</button>
                <button type="button" className="lm-formx" title="Close" onClick={() => { setAdding(""); setNewName(""); }}>&times;</button>
              </div>
            )}
            {subjects.length > 6 && (
              <input className="lm-search" placeholder="Search subject..." value={sq} onChange={(e) => setSq(e.target.value)} />
            )}
            {theory.length > 0 && (
              <>
                <div className="lm-group">Theory</div>
                <div className="lm-chips">{clip(theory, openTh, subject, sq).map(subjectChip)}{more(theory, openTh, setOpenTh, sq)}</div>
              </>
            )}
            {practical.length > 0 && (
              <>
                <div className="lm-group prac">Practical</div>
                <div className="lm-chips">{clip(practical, openPr, subject, sq).map(subjectChip)}{more(practical, openPr, setOpenPr, sq)}</div>
              </>
            )}
            {shownSubjects.length === 0 && <span className="lm-none">No subject found</span>}
          </section>

          <section className="lm-sec">
            <div className="lm-title"><span>3. Days</span></div>
            <div className="lm-chips">
              {PRESETS.map((p) => (
                <button type="button" key={p.label} className={sameDays(p.days) ? 'lm-chip lm-sm active' : 'lm-chip lm-sm'} onClick={() => setDays(p.days)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="lm-days">
              {DAYS.map((d) => (
                <button type="button" key={d} className={days.includes(d) ? 'lm-day active' : 'lm-day'} onClick={() => toggleDay(d)}>
                  {SHORT[d]}
                </button>
              ))}
            </div>
          </section>

          <div className="lm-two">
            <section className="lm-sec">
              <div className="lm-title"><span>Color</span></div>
              <label className="lm-all">
                <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
                Use this color for all lectures of {pickedTeacher ? pickedTeacher.name : 'this teacher'}
              </label>
              <div className="lm-colors">
                <button type="button" className={color === '' ? 'lm-auto active' : 'lm-auto'} onClick={() => setColor('')}>Auto</button>
                <label className={color && !COLORS.includes(color) ? 'lm-pick active' : 'lm-pick'} title="Pick any color">
                  <input type="color" value={color || '#2563eb'} onChange={(e) => setColor(e.target.value)} />
                  <span>Any color</span>
                </label>
                {COLORS.map((c) => (
                  <button type="button" key={c} className={color === c ? 'lm-dot active' : 'lm-dot'} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
                ))}
              </div>
            </section>
            <section className="lm-sec">
              <div className="lm-title"><span>Room (optional)</span></div>
              <input className="lm-room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. 12" />
            </section>
          </div>
        </div>

        <div className="lm-foot">
          <div className="lm-summary">
            {pickedTeacher || pickedSubject || dayText ? (
              <>
                <b>{pickedTeacher ? pickedTeacher.name : 'No teacher'}</b>
                <span>{pickedSubject ? pickedSubject.name + ' (' + pickedSubject.type + ')' : 'No subject'}</span>
                <span>{dayText || 'No day'}</span>
              </>
            ) : (
              <span>Pick a teacher, subject and days</span>
            )}
          </div>
          <div className="lm-actions">
            {lecture && <button className="btn btn-danger" disabled={busy} onClick={remove}>Delete</button>}
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving...' : lecture ? 'Save' : 'Add Lecture'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}















