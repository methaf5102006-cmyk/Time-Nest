export default function DepartmentTabs({ departments, active, onChange, onDelete }) {
  if (departments.length === 0) return null;
  return (
    <div className="dept-block">
      <div className="dept-label">Select Department</div>
      <div className="dept-tabs">
      {departments.map((d) => (
        <span className="dept-wrap" key={d}>
          <button
            type="button"
            className={d === active ? 'dept-tab active' : 'dept-tab'}
            onClick={() => onChange(d)}
          >
            {d}
          </button>
          <button
            type="button"
            className="dept-x"
            title={'Delete ' + d}
            onClick={() => onDelete(d)}
          >
            &times;
          </button>
        </span>
      ))}
      </div>
    </div>
  );
}


