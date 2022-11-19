import { Routes, Route } from 'react-router-dom';
import { useAuthorizer } from 'authorizer-react';
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import ResetPassword from './pages/rest-password';

function App() {
  const { token, loading } = useAuthorizer();

  if (loading) {
    return <h1>Loading...</h1>;
  }

  if (token) {
    return (
      <Routes>
        <Route path="/" element={<Dashboard />} />
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
