import { DAYS, SLOTS, BREAK_AFTER_SLOT } from '../constants';

export default function TeacherSchedule({ teacher, lectures, color }) {
  const mine = lectures.filter((l) => l.teacher._id === teacher._id);

  const rows = [];
  SLOTS.forEach((slot) => {
    rows.push(
      <tr key={slot.no}>
        <td className="time-cell">{slot.time}</td>
        {DAYS.map((d) => {
          const here = mine.filter((l) => l.day === d && l.slot === slot.no);
          return (
            <td key={d} className="slot-cell">
              {here.map((l) => (
                <div
                  key={l._id}
                  className="lecture-card"
                  style={{ background: color.bg, borderLeft: '5px solid ' + color.border }}
                >
                  <div className="lecture-subject">
                    {l.classGroup.department} - {l.classGroup.semester}
                  </div>
                  <div className="lecture-meta">{l.subject.name}</div>
                  
                </div>
              ))}
            </td>
          );
        })}
      </tr>
    );
    if (slot.no === BREAK_AFTER_SLOT) {
      rows.push(
        <tr key="break" className="break-row">
          <td>10:15 - 10:45</td>
          <td colSpan={DAYS.length}>BREAK</td>
        </tr>
      );
    }
  });

  return (
    <div className="teacher-schedule">
      <h3>{teacher.name} ka poora hafta ({mine.length} lectures)</h3>
      <div className="table-wrap">
        <table className="timetable">
          <thead>
            <tr>
              <th>TIME</th>
              {DAYS.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );
}

