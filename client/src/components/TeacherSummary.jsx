import { REQUIRED_PER_CLASS } from '../constants';

export default function TeacherSummary({ teachers, lectures, colorMap, onSelect }) {
  return (
    <div className="panel">
      <h3>Teacher ke lectures (class ke hisaab se)</h3>
      <div className="summary-grid">
        {teachers.map((t) => {
          const col = colorMap[t._id];
          const mine = lectures.filter((l) => l.teacher._id === t._id);

          const perClass = {};
          mine.forEach((l) => {
            const id = l.classGroup._id;
            if (!perClass[id]) {
              perClass[id] = {
                name: l.classGroup.department + ' - ' + l.classGroup.semester,
                count: 0,
              };
            }
            perClass[id].count += 1;
          });
          const entries = Object.values(perClass);

          return (
            <div
              key={t._id}
              className="summary-card"
              style={{ background: col.bg, border: '2px solid ' + col.border }}
              onClick={() => onSelect(t._id)}
            >
              <div className="summary-name">{t.name}</div>
              {entries.length === 0 && (
                <div className="summary-line summary-low">Abhi koi lecture nahi laga</div>
              )}
              {entries.map((e) => {
                const done = e.count >= REQUIRED_PER_CLASS;
                return (
                  <div
                    key={e.name}
                    className={done ? 'summary-line summary-ok' : 'summary-line summary-low'}
                  >
                    {done
                      ? e.name + ' mein ' + e.count + ' lectures lag gaye ✓'
                      : e.name + ': ' + e.count + '/' + REQUIRED_PER_CLASS + ' (' + (REQUIRED_PER_CLASS - e.count) + ' baqi)'}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
