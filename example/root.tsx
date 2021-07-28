import * as React from 'react';
import { Switch, Route } from 'react-router-dom';
import { useAuthorizer } from '../.';
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import ResetPassword from './pages/rest-password';

export default function Root() {
  const { token, loading } = useAuthorizer();
  if (loading) {
    <h1>Loading...</h1>;
  }

  if (token) {
    return (
      <Switch>
        <Route path="/" exact>
          <Dashboard />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" exact>
        <Login />
      </Route>
      <Route path="/reset-password">
        <ResetPassword />
      </Route>
    </Switch>
  );
}
