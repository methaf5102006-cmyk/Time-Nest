import { useEffect, useState } from 'react';
import api from '../api/api';
import { applySchedule } from '../constants';

export default function ScheduleLoader({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .get('/schedule')
      .then((r) => applySchedule(r.data))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <div style={{ padding: 40, color: '#64748b' }}>Loading...</div>;
  return children;
}
