import { useState } from 'react';
import api from '../api/api';

export default function LoginModal({ onClose, onLoggedIn }) {
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const login = async () => {
    try {
      const res = await api.post('/auth/login', { password });
      localStorage.setItem('adminToken', res.data.token);
      onLoggedIn();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Login nahi ho saka');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Admin Login</h3>
        {msg && <div className="conflict-box">{msg}</div>}
        <div className="form-row">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={login}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
