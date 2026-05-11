import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const RoleRoute = ({ roles }) => {
  const { user } = useSelector((state) => state.auth);
  return roles.includes(user?.role) ? <Outlet /> : <Navigate to="/" replace />;
};

export default RoleRoute;
