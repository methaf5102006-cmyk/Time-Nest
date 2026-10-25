import { reloadKeep } from './keepScroll';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import api from './api/api';

import ConflictSide from './components/ConflictSide';
import SubjectProgress from './components/SubjectProgress';

import DepartmentTabs from './components/DepartmentTabs';
import ClassBar from './components/ClassBar';
import TimetableGrid from './components/TimetableGrid';
import LectureModal from './components/LectureModal';
import ShareModal from './components/ShareModal';
import './styles/admin.css';
import './styles/extra.css';

export default function App() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [progress, setProgress] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [highlightIds, setHighlightIds] = useState([]);
  const [dept, setDept] = useState(() => localStorage.getItem('dept') || '');
  const [pickClass, setPickClass] = useState(() => localStorage.getItem('pickClass') || '');
  const [modal, setModal] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState('');
  const exportRef = useRef(null);

  useEffect(() => { localStorage.setItem('dept', dept); }, [dept]);
  useEffect(() => { localStorage.setItem('pickClass', pickClass); }, [pickClass]);
  useEffect(() => {
    const y = sessionStorage.getItem('keepY');
    if (y && classes.length > 0) {
      window.scrollTo(0, Number(y));
      sessionStorage.removeItem('keepY');
    }
  }, [classes]);

  const loadAll = useCallback(async () => {
    try {
      const [c, t, s, l, st, a, p, cf] = await Promise.all([
        api.get('/classes'),
        api.get('/teachers'),
        api.get('/subjects'),
        api.get('/lectures'),
        api.get('/lectures/stats'),
        api.get('/lectures/teacher-assignments'),
        api.get('/lectures/subject-progress'),
        api.get('/lectures/conflicts'),
      ]);
      setClasses(c.data);
      setTeachers(t.data);
      setSubjects(s.data);
      setLectures(l.data.filter((x) => x.classGroup && x.subject && x.teacher));
      setStats(st.data);
      setAssignments(a.data);
      setProgress(p.data);
      setConflicts(cf.data);
      setError('');
    } catch {
      setError('Cannot reach the server. Make sure it is running on port 5000.');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const colors = useMemo(() => {
    const map = {};
    teachers.forEach((t) => { map[t._id] = t.color; });
    return map;
  }, [teachers]);

  const clashIds = useMemo(() => new Set(conflicts.flatMap((c) => c.lectureIds)), [conflicts]);

  const departments = useMemo(() => [...new Set(classes.map((c) => c.department))], [classes]);
  const activeDept = departments.includes(dept) ? dept : departments[0] || '';
  const deptClasses = classes.filter((c) => c.department === activeDept);
  const deptClassIds = new Set(deptClasses.map((c) => c._id));
  const deptLectures = lectures.filter((l) => deptClassIds.has(l.classGroup._id));
  const validPick = deptClasses.some((c) => c._id === pickClass) ? pickClass : '';
  const baseClasses = validPick ? deptClasses.filter((c) => c._id === validPick) : deptClasses;
  const shownClasses = baseClasses;
  const shownLectures = validPick ? deptLectures.filter((l) => l.classGroup._id === validPick) : deptLectures;
  const deptProgress = progress.filter((p) => deptClassIds.has(p.classGroupId));

  const afterSave = () => {
    setModal(null);
    loadAll();
  };

  const moveLecture = async (id, slot, classGroup) => {
    try {
      await api.put('/lectures/' + id, { slot, classGroup });
      loadAll();
    } catch {
      setError('Could not move the lecture.');
    }
  };

  const deleteDept = async (name) => {
    const n = classes.filter((c) => c.department === name).length;
    const lc = lectures.filter((l) => l.classGroup.department === name).length;
    if (!window.confirm('Delete "' + name + '" with its ' + n + ' class(es) and ' + lc + ' lecture(s)? This cannot be undone.')) return;
    try {
      await api.delete('/classes/department/' + encodeURIComponent(name));
      setDept('');
      loadAll();
    } catch {
      setError('Could not delete the department.');
    }
  };

  const deleteClass = async (c) => {
    const lc = lectures.filter((l) => l.classGroup._id === c._id).length;
    if (!window.confirm('Delete this class with its ' + lc + ' lecture(s)?')) return;
    try {
      await api.delete('/classes/' + c._id);
      loadAll();
    } catch {
      setError('Could not delete the class.');
    }
  };

  const reorderClasses = async (fromId, toId) => {
    const ids = deptClasses.map((c) => c._id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    try {
      await api.put('/classes/reorder', { ids });
      loadAll();
    } catch {
      setError('Could not move the class.');
    }
  };

  const highlight = (ids) => {
    setHighlightIds(ids);
    document.getElementById('timetable')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => setHighlightIds([]), 6000);
  };

  return (
    <div className="layout">
      <main className="main">
        <div className="page-head">
          <div>
            <h1 className="page-title">Weekly Timetable</h1>
            <p className="page-sub">TimeNest</p>
          </div>
          <div className="head-actions">
            <button className="btn" onClick={() => setShareOpen(true)}>Save and Share</button>
            <button className="btn btn-outline" onClick={() => { localStorage.removeItem('token'); reloadKeep(); }}>Log out</button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="panel top-panel">
          <DepartmentTabs departments={departments} active={activeDept} onChange={(d) => { setDept(d); setPickClass(''); }} onDelete={deleteDept} />
          <ClassBar classes={classes} deptClasses={deptClasses} activeDept={activeDept} onChanged={loadAll} onSelectDept={(d) => { setDept(d); setPickClass(''); }} pickClass={validPick} onPick={setPickClass} />
        </div>

        <SubjectProgress classes={shownClasses} lectures={shownLectures} subjects={subjects} onChanged={loadAll} />

        <ConflictSide conflicts={conflicts} lectures={lectures} onMove={moveLecture} onHighlight={highlight} />

        <div className="panel" id="timetable">
          <TimetableGrid
            title={activeDept ? activeDept + ' - Weekly Timetable' : ''}
            classes={shownClasses}
            lectures={shownLectures}
            colors={colors}
            clashIds={clashIds}
            highlightIds={highlightIds}
            exportRef={exportRef}
            onCellClick={(slot, classGroup) => setModal({ slot, classGroup, lecture: null })}
            onLectureClick={(lecture, group) => setModal({ slot: lecture.slot, classGroup: lecture.classGroup, lecture, group })}
            onDeleteClass={deleteClass}
            onReorder={reorderClasses}
            onMove={moveLecture}
          />
        </div>
      </main>

      {modal && (
        <LectureModal
          slot={modal.slot}
          classGroup={modal.classGroup}
          lecture={modal.lecture}
          group={modal.group}
          teachers={teachers}
          subjects={subjects}
          onClose={() => setModal(null)}
          onSaved={afterSave}
          onAdded={loadAll}
        />
      )}

      {shareOpen && (
        <ShareModal
          exportRef={exportRef}
          title={activeDept}
          deptLectures={deptLectures}
          allLectures={lectures}
          teachers={teachers}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}