export default function TeacherAssignments({ rows, colors }) {
  return (
    <div className="panel" id="teachers">
      <h3>Teacher Assignments</h3>
      {rows.length === 0 && <div className="empty">No teachers yet. Add one in Settings below.</div>}
      {rows.length > 0 && (
        <table className="data-table">
          <thead>
            <tr><th>Teacher</th><th>Assigned subjects</th><th>Weekly lectures</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.teacherId}>
                <td>
                  <span className="dot" style={{ background: colors[r.teacherId] }} />
                  {r.name}
                </td>
                <td>{r.subjects.length ? r.subjects.join(', ') : '-'}</td>
                <td>
                  <span className={r.weeklyLectures >= 4 ? 'pill ok' : 'pill low'}>
                    {r.weeklyLectures}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
