import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Home, PlusCircle, Package, Layers, Truck, Flag } from 'lucide-react';

const EMPLOYEE_NAV = [
  { path: '/intakes',     icon: Package,    label: 'קליטות' },
  { path: '/dashboard',   icon: Home,       label: 'בית',         end: true },
  { path: '/intakes/new', icon: PlusCircle, label: 'קליטה חדשה' },
];

const MANAGER_NAV = [
  { path: '/dashboard',   icon: Home,    label: 'בית',      end: true },
  { path: '/intakes',     icon: Package, label: 'קליטות' },
  { path: '/batches',     icon: Layers,  label: 'אצוות' },
  { path: '/shipments',   icon: Truck,   label: 'משלוחים' },
  { path: '/flags',       icon: Flag,    label: 'דגלים',    isBadge: true },
];

const BottomNav = ({ role }) => {
  const { summary: flagsSummary } = useSelector((s) => s.flags);
  const openFlags = flagsSummary?.open ?? 0;
  const items = role === 'manager' ? MANAGER_NAV : EMPLOYEE_NAV;

  return (
    <nav className="bottom-nav">
      {items.map(({ path, icon: Icon, label, end, isBadge }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
        >
          <div className="bottom-nav__icon-wrap">
            <Icon size={22} />
            {isBadge && openFlags > 0 && (
              <span className="bottom-nav__badge">{openFlags > 9 ? '9+' : openFlags}</span>
            )}
          </div>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
