import { useState } from 'react';
import Login from './Login';

export default function AuthGate({ children }) {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));

  const logout = () => {
    localStorage.removeItem('token');
    setLoggedIn(false);
  };

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;

  return (
    <>
      {children}
    </>
  );
}

