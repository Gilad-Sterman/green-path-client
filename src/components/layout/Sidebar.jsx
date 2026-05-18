import { NavLink } from 'react-router-dom';
import {
  Leaf, LayoutDashboard, Package, Layers, Truck,
  Award, Building2, Users, Box, Flag, BarChart3, HeadphonesIcon,
} from 'lucide-react';

const MANAGER_NAV = [
  { path: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/intakes',    icon: Package,         label: 'Intakes' },
  { path: '/batches',    icon: Layers,          label: 'Batches' },
  { path: '/shipments',  icon: Truck,           label: 'Shipments' },
  { path: '/credits',    icon: Award,           label: 'Credits' },
  { path: '/suppliers',  icon: Building2,       label: 'Suppliers' },
  { path: '/customers',  icon: Users,           label: 'Customers' },
  { path: '/products',   icon: Box,             label: 'Products' },
  { path: '/flags',      icon: Flag,            label: 'Flags' },
  { path: '/team',       icon: Users,           label: 'Team' },
  { path: '/reports',    icon: BarChart3,       label: 'Reports' },
];

const ADMIN_NAV = [
  { path: '/admin',            icon: LayoutDashboard,  label: 'Overview',   end: true },
  { path: '/admin/factories',  icon: Building2,        label: 'Factories' },
  { path: '/admin/users',      icon: Users,            label: 'All Users' },
  { path: '/admin/reports',    icon: BarChart3,        label: 'Reports' },
  { path: '/admin/support',    icon: HeadphonesIcon,   label: 'Support' },
];

const Sidebar = ({ role }) => {
  const navItems = role === 'internal_admin' ? ADMIN_NAV : MANAGER_NAV;

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Leaf size={22} strokeWidth={2.5} />
        <span>GreenPath</span>
      </div>

      <nav className="sidebar__nav">
        {navItems.map(({ path, icon: Icon, label, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `sidebar__item${isActive ? ' sidebar__item--active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {role === 'internal_admin' && (
        <div className="sidebar__badge-wrap">
          <span className="badge badge--admin">Internal Admin</span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
