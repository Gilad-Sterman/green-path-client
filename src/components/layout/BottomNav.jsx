import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, Package } from 'lucide-react';

const EMPLOYEE_NAV = [
  { path: '/dashboard', icon: Home,        label: 'Home',       end: true },
  { path: '/intakes',   icon: Package,     label: 'My Intakes' },
  { path: '/intakes/new', icon: PlusCircle, label: 'New Intake' },
];

const BottomNav = () => (
  <nav className="bottom-nav">
    {EMPLOYEE_NAV.map(({ path, icon: Icon, label, end }) => (
      <NavLink
        key={path}
        to={path}
        end={end}
        className={({ isActive }) =>
          `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
        }
      >
        <Icon size={22} />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>
);

export default BottomNav;
