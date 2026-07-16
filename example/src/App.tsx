import { Routes, Route } from 'react-router-dom';
import { useAuthorizer } from 'authorizer-react';
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import ResetPassword from './pages/resetPassword';
import Settings from './pages/settings';

function App() {
  const { token, loading } = useAuthorizer();

  if (loading) {
    return <h1>Loading...</h1>;
  }

  if (token) {
    return (
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  );
}

export default App;
