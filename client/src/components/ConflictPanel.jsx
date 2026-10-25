export default function ConflictPanel({ conflicts, onHighlight }) {
  if (conflicts.length === 0) {
    return (
      <div className="conflict-panel clean">
        <h3>No timeline conflicts</h3>
      </div>
    );
  }
  return (
    <div className="conflict-panel">
      <h3>Timeline conflicts detected ({conflicts.length})</h3>
      {conflicts.map((c) => (
        <div key={c.id} className="conflict-item">
          <div className="conflict-title">{c.title}</div>
          {c.details.map((d, i) => (
            <div key={i} className="conflict-detail">{d}</div>
          ))}
          <button className="link-btn" onClick={() => onHighlight(c.lectureIds)}>
            Highlight on timetable
          </button>
        </div>
      ))}
    </div>
  );
}
