import { useState } from 'react';
import api from '../api/api';
import { classLabel, PRESET_DEPARTMENTS } from '../constants';

export default function ClassBar({ classes, deptClasses, activeDept, onChanged, onSelectDept, pickClass, onPick }) {
  const [mode, setMode] = useState('');
  const [dept, setDept] = useState('');
  const [label, setLabel] = useState('');
  const [sem, setSem] = useState('');
  const [msg, setMsg] = useState('');

  const suggestions = [...new Set([...PRESET_DEPARTMENTS, ...classes.map((c) => c.department)])];

  const openForm = (m) => {
    if (mode === m) { setMode(''); return; }
    setDept(m === 'class' ? activeDept || '' : '');
    setLabel('');
    setSem('');
    setMsg('');
    setMode(m);
  };

  const add = async () => {
    const semester = Number(sem);
    const name = dept.trim();
    if (!name || !semester) {
      setMsg(mode === 'dept' ? 'Department name and semester/year are required.' : 'Semester/year is required.');
      return;
    }
    try {
      await api.post('/classes', { department: name, label: label.trim(), semester, totalSections: 4 });
      const wasDept = mode === 'dept';
      setMode('');
      setMsg('');
      await onChanged();
      if (wasDept && onSelectDept) onSelectDept(name);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not add.');
    }
  };

  const remove = async (c) => {
    if (!window.confirm('Delete ' + classLabel(c) + ' and all of its lectures?')) return;
    try {
      await api.delete('/classes/' + c._id);
      setMsg('');
      onChanged();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not delete the class.');
    }
  };

  return (
    <div className="class-bar">
      <div className="chip-row">
        {deptClasses.length > 1 && (
          <button type="button" className={!pickClass ? 'chip chip-sm active' : 'chip chip-sm'} onClick={() => onPick('')}>All classes</button>
        )}
        {deptClasses.map((c) => (
          <span className="chip-wrap" key={c._id}>
            <button type="button" className={pickClass === c._id ? 'chip chip-sm active' : 'chip chip-sm'} onClick={() => onPick(pickClass === c._id ? '' : c._id)}>{classLabel(c)}</button>
            <button type="button" className="chip-x" title="Delete class" onClick={() => remove(c)}>&times;</button>
          </span>
        ))}
        {activeDept && (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => openForm('class')}>+ Add class</button>
        )}
        <button type="button" className="btn btn-small" onClick={() => openForm('dept')}>+ Add department</button>
      </div>

      {msg && <div className="notice">{msg}</div>}

      {mode && (
        <div className="add-new-row class-form" onKeyDown={(e) => { if (e.key === "Escape") setMode(""); }}>
          {mode === 'dept' ? (
            <>
              <input className="room-input" autoFocus list="class-dept-list" placeholder="New department name" value={dept} onChange={(e) => setDept(e.target.value)} />
              <datalist id="class-dept-list">
                {suggestions.map((d) => <option key={d} value={d} />)}
              </datalist>
            </>
          ) : (
            <span className="chip chip-sm static">Adding to: {activeDept}</span>
          )}
          <input className="room-input" placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className="new-small" placeholder="Sem" title="Semester / Year" value={sem} onChange={(e) => setSem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
          <button type="button" className="btn btn-small" onClick={add}>{mode === 'dept' ? 'Create' : 'Add'}</button>
          <button type="button" className="form-close" title="Close" onClick={() => setMode('')}>&times;</button>
        </div>
      )}
    </div>
  );
}





