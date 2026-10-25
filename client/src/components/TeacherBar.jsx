export default function TeacherBar({ teachers, lectures, colorMap, selected, onSelect }) {
  return (
    <div className="teacher-bar">
      <div className="teacher-bar-label">
        Teacher ke naam par click karo, neeche uska poora hafta nazar aayega
      </div>
      {teachers.length === 0 && <span className="hint">Abhi koi teacher nahi</span>}
      {teachers.map((t) => {
        const col = colorMap[t._id];
        const total = lectures.filter((l) => l.teacher._id === t._id).length;
        const isSel = selected === t._id;
        return (
          <button
            key={t._id}
            className={isSel ? 'teacher-chip selected' : 'teacher-chip'}
            style={{
              borderColor: col.border,
              background: isSel ? col.border : col.bg,
            }}
            onClick={() => onSelect(isSel ? null : t._id)}
          >
            {t.name} ({total})
          </button>
        );
      })}
    </div>
  );
}
