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
import SuppliersPage     from './pages/ManagerPages/SuppliersPage';
import CustomersPage     from './pages/ManagerPages/CustomersPage';
import ProductsPage      from './pages/ManagerPages/ProductsPage';
import IntakesPage      from './pages/ManagerPages/IntakesPage';
import BatchesPage      from './pages/ManagerPages/BatchesPage';
import ShipmentsPage    from './pages/ManagerPages/ShipmentsPage';
import CreditsPage      from './pages/ManagerPages/CreditsPage';
import FlagsPage        from './pages/ManagerPages/FlagsPage';
import TeamPage         from './pages/ManagerPages/TeamPage';
import NewIntakePage    from './pages/EmployeePages/NewIntakePage';

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

            {/* all staff: employee + manager + internal_admin */}
            <Route path="intakes/new" element={<NewIntakePage />} />
            <Route element={<RoleRoute roles={['employee', 'manager', 'internal_admin']} />}>
              <Route path="intakes"   element={<IntakesPage />} />
              <Route path="batches"   element={<BatchesPage />} />
              <Route path="shipments" element={<ShipmentsPage />} />
            </Route>

            {/* manager + internal_admin */}
            <Route element={<RoleRoute roles={['manager', 'internal_admin']} />}>
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="products"  element={<ProductsPage />} />
              <Route path="credits"   element={<CreditsPage />} />
              <Route path="flags"     element={<FlagsPage />} />
              <Route path="team"      element={<TeamPage />} />
            </Route>

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
