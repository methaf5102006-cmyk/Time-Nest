import { useState } from 'react';
import api from '../api/api';
import { reloadKeep } from '../keepScroll';
import { scheduleFor, classLabel } from '../constants';

function parse(t) {
  const m = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/.exec(t || '');
  if (!m) return ['', ''];
  return [m[1].padStart(2, '0') + ':' + m[2], m[3].padStart(2, '0') + ':' + m[4]];
}

function build(a, b) {
  if (!a || !b) return '';
  const f = (v) => { const h = Number(v.slice(0, 2)); return String(h > 12 ? h - 12 : h) + v.slice(2); };
  return f(a) + ' - ' + f(b);
}

function Range({ label, value, onChange, optional }) {
  const init = parse(value);
  const [a, setA] = useState(init[0]);
  const [b, setB] = useState(init[1]);
  const update = (na, nb) => {
    if (na && nb && nb <= na && Number(nb.slice(0, 2)) < 12) nb = String(Number(nb.slice(0, 2)) + 12).padStart(2, "0") + nb.slice(2);
    setA(na);
    setB(nb);
    onChange(build(na, nb));
  };
  return (
    <div className="form-row">
      <label>{label}</label>
      <div className="time-range">
        <input type="time" value={a} onChange={(e) => update(e.target.value, b)} />
        <span>to</span>
        <input type="time" value={b} onChange={(e) => update(a, e.target.value)} />
        {optional && (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => update('', '')}>Clear</button>
        )}
      </div>
    </div>
  );
}

export default function TimeEditModal({ cls, classes, target, scope: firstScope, onClose }) {
  const isBreak = target === 'break';
  const isNew = target === 'new';
  const base = scheduleFor(cls);
  const newNo = Math.max(0, ...base.slots.map((s) => s.no)) + 1;
  const slotNo = isNew ? newNo : isBreak ? 0 : target;

  const [cfg, setCfg] = useState({
    slots: [
      ...base.slots.map((s) => ({ ...s })),
      ...(isNew ? [{ no: newNo, time: '', fridayTime: '' }] : []),
    ],
    breakAfter: base.breakAfter,
    breakTime: base.breakTime,
    breakFridayTime: base.breakFridayTime,
  });
  const [scope, setScope] = useState(firstScope === 'department' ? 'dept' : cls._id);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [after, setAfter] = useState(newNo - 1);

  const idx = cfg.slots.findIndex((s) => s.no === slotNo);
  const setSlot = (field, v) =>
    setCfg({ ...cfg, slots: cfg.slots.map((s, j) => (j === idx ? { ...s, [field]: v } : s)) });

  const send = async (data, reset, insertAfter) => {
    setBusy(true);
    setMsg('');
    try {
      const applyTo = scope === 'dept' ? 'department' : scope === 'all' ? 'all' : 'class';
      const id = scope === 'dept' || scope === 'all' ? cls._id : scope;
      await api.put('/classes/' + id + '/schedule', reset ? { reset: true, applyTo } : { ...data, applyTo, insertAfter });
      reloadKeep();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not save.');
      setBusy(false);
    }
  };

  const insertCfg = () => {
    const fresh = cfg.slots.find((s) => s.no === newNo);
    const old = cfg.slots.filter((s) => s.no !== newNo).map((s) => (s.no > after ? { ...s, no: s.no + 1 } : s));
    const slots = [...old, { ...fresh, no: after + 1 }].sort((a, b) => a.no - b.no);
    return { ...cfg, slots, breakAfter: cfg.breakAfter > after ? cfg.breakAfter + 1 : cfg.breakAfter };
  };

  const save = () => {
    if (!isBreak && !cfg.slots[idx].time) { setMsg('Start and end time are required.'); return; }
    if (isBreak && cfg.breakAfter && !cfg.breakTime) { setMsg('Enter the break time.'); return; }
    send(isNew ? insertCfg() : cfg, false, isNew ? after : undefined);
  };

  const removeSlot = () => {
    if (!window.confirm('Delete slot ' + slotNo + '?')) return;
    const rest = cfg.slots.filter((s) => s.no !== slotNo);
    if (rest.length === 0) { setMsg('At least one slot must remain.'); return; }
    let breakAfter = cfg.breakAfter || 0;
    if (breakAfter === slotNo) {
      const before = rest.filter((s) => s.no < slotNo).map((s) => s.no);
      breakAfter = before.length ? Math.max(...before) : 0;
    }
    send({ ...cfg, slots: rest, breakAfter }, false);
  };

  const resetAll = () => {
    if (!window.confirm('Go back to the common default times?')) return;
    send(null, true);
  };

  const title = isBreak ? 'Change Break Time' : isNew ? 'Add New Slot' : 'Change Time: Slot ' + slotNo;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal lecture-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-close-wrap">
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <h3>{title}</h3>
        {msg && <div className="notice">{msg}</div>}

        <div className="form-row">
          <label>Apply to</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="dept">All classes of {cls.department}</option>
            <option value="all">All classes (every department)</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>Only {classLabel(c)}</option>
            ))}
          </select>
        </div>

        {isNew && (
          <div className="form-row">
            <label>Add after</label>
            <select value={after} onChange={(e) => setAfter(Number(e.target.value))}>
              <option value={0}>At the very start</option>
              {base.slots.map((s) => (
                <option key={s.no} value={s.no}>After slot {s.no} ({s.time})</option>
              ))}
            </select>
          </div>
        )}

        {!isBreak && idx >= 0 && (
          <>
            <Range label="Mon - Thu, Sat" value={cfg.slots[idx].time} onChange={(v) => setSlot('time', v)} />
            <Range label="Friday (optional)" value={cfg.slots[idx].fridayTime} onChange={(v) => setSlot('fridayTime', v)} optional />
          </>
        )}

        {isBreak && (
          <>
            <div className="form-row">
              <label>Break comes</label>
              <select value={cfg.breakAfter || 0} onChange={(e) => setCfg({ ...cfg, breakAfter: Number(e.target.value) })}>
                <option value={0}>No break</option>
                {cfg.slots.map((s) => (
                  <option key={s.no} value={s.no}>After slot {s.no}</option>
                ))}
              </select>
            </div>
            <Range label="Break time" value={cfg.breakTime} onChange={(v) => setCfg({ ...cfg, breakTime: v })} />
            <Range label="Friday break (optional)" value={cfg.breakFridayTime} onChange={(v) => setCfg({ ...cfg, breakFridayTime: v })} optional />
          </>
        )}

        <div className="modal-actions">
          {!isBreak && !isNew && (
            <button className="btn btn-danger" disabled={busy} onClick={removeSlot}>Delete slot</button>
          )}
          <button className="btn btn-secondary" disabled={busy} onClick={resetAll}>Reset to default</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving...' : isNew ? 'Add Slot' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}










