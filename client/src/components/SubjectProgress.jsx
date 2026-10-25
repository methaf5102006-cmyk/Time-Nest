import api from '../api/api';
import { classLabel } from '../constants';

const key = (n) => String(n || '').trim().toLowerCase();

function TargetInput({ subject, onChanged }) {
  const save = async (e) => {
    const v = Math.max(1, Number(e.target.value) || 1);
    if (v === subject.weeklyTarget) return;
    try {
      await api.put('/subjects/' + subject._id, { weeklyTarget: v });
    } catch {
      /* ignore */
    }
    onChanged();
  };
  return (
    <input
      key={subject.weeklyTarget}
      className="pg-in"
      type="number"
      min="1"
      defaultValue={subject.weeklyTarget}
      title="Change the target"
      onBlur={save}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
    />
  );
}

function Bar({ label, count, subject, onChanged }) {
  const target = subject.weeklyTarget || 1;
  const done = count >= target;
  return (
    <div className={done ? 'pg-row done' : 'pg-row'}>
      <span className="pg-label">{label}</span>
      <div className="pg-bar">
        <div className="pg-fill" style={{ width: Math.min(100, (count / target) * 100) + '%' }} />
      </div>
      <span className="pg-num">{count} / <TargetInput subject={subject} onChanged={onChanged} /></span>
    </div>
  );
}

export default function SubjectProgress({ classes, lectures, subjects, onChanged }) {
  const cards = [];
  classes.forEach((c) => {
    const mine = lectures.filter((l) => l.classGroup._id === c._id);
    const names = new Map();
    mine.forEach((l) => {
      const k = key(l.subject.name);
      if (!names.has(k)) names.set(k, l.subject.name);
    });
    [...names.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([k, name]) => {
        const count = (type) => mine.filter((l) => key(l.subject.name) === k && l.subject.type === type).length;
        cards.push({
          id: c._id + k,
          cls: classLabel(c),
          name,
          th: subjects.find((s) => key(s.name) === k && s.type === 'theory'),
          pr: subjects.find((s) => key(s.name) === k && s.type === 'practical'),
          thCount: count('theory'),
          prCount: count('practical'),
        });
      });
  });

  return (
    <div className="panel" id="subjects">
      <h3>Subject progress</h3>
      {cards.length === 0 && <div className="empty">No lectures scheduled yet.</div>}
      <div className="progress-grid">
        {cards.map((p) => (
          <div key={p.id} className="progress-card">
            <div className="progress-name" title={p.name}>{p.name}</div>
            <div className="progress-class">{p.cls}</div>
            {p.th && <Bar label="Theory" count={p.thCount} subject={p.th} onChanged={onChanged} />}
            {p.pr && <Bar label="Practical" count={p.prCount} subject={p.pr} onChanged={onChanged} />}
          </div>
        ))}
      </div>
    </div>
  );
}
