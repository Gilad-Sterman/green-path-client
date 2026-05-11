import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuthStatus } from './store/slices/authSlice';

import LoginPage        from './pages/LoginPage/LoginPage';
import AppShell         from './components/layout/AppShell';
import AuthGuard        from './components/AuthGuard';
import RoleRoute        from './components/RoleRoute';
import ManagerDashboard from './pages/DashboardPage/ManagerDashboard';
import EmployeeDashboard from './pages/DashboardPage/EmployeeDashboard';
import AdminDashboard     from './pages/AdminPages/AdminDashboard';
import FactoriesPage      from './pages/AdminPages/FactoriesPage';
import FactoryDetailPage  from './pages/AdminPages/FactoryDetailPage';
import AdminUsersPage     from './pages/AdminPages/AdminUsersPage';

// Redirect to the correct home based on role
const RootRedirect = () => {
  const { user } = useSelector((state) => state.auth);
  if (user?.role === 'internal_admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
};

// Dashboard renders the right component based on role
const DashboardPage = () => {
  const { user } = useSelector((state) => state.auth);
  if (user?.role === 'employee') return <EmployeeDashboard />;
  return <ManagerDashboard />;
};

const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />

        {/* Protected — all authenticated users get AppShell as the layout */}
        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            <Route index element={<RootRedirect />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* internal_admin only */}
            <Route element={<RoleRoute roles={['internal_admin']} />}>
              <Route path="admin"                       element={<AdminDashboard />} />
              <Route path="admin/factories"             element={<FactoriesPage />} />
              <Route path="admin/factories/:id"         element={<FactoryDetailPage />} />
              <Route path="admin/users"                 element={<AdminUsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
