import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import AuthGate from './components/AuthGate.jsx';
import ScheduleLoader from './components/ScheduleLoader.jsx';
import './styles/login.css';
import './styles/admin.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>
      <ScheduleLoader>
        <App />
      </ScheduleLoader>
    </AuthGate>
  </StrictMode>
);
