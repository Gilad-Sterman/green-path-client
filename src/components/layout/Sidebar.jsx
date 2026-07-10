import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Leaf, LayoutDashboard, Package, Layers, Truck,
  Award, Building2, Users, Box, Flag, BarChart3,
  HeadphonesIcon, ChevronDown, Plus,
} from 'lucide-react';

const MANAGER_SECTIONS = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { path: '/intakes', icon: Package, label: 'Intakes' },
      { path: '/batches', icon: Layers, label: 'Batches' },
      { path: '/shipments', icon: Truck, label: 'Shipments' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { path: '/credits', icon: Award, label: 'Credits' },
      { path: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    id: 'partners',
    label: 'Partners',
    items: [
      { path: '/suppliers', icon: Building2, label: 'Suppliers' },
      { path: '/customers', icon: Users, label: 'Customers' },
      { path: '/products', icon: Box, label: 'Products' },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      { path: '/flags', icon: Flag, label: 'Flags' },
      { path: '/team', icon: Users, label: 'Team' },
    ],
  },
];

const ADMIN_NAV = [
  { path: '/admin', icon: BarChart3, label: 'מטריקות', end: true },
  { path: '/admin/factories', icon: Building2, label: 'מפעלים' },
  { path: '/admin/users', icon: Users, label: 'משתמשים' },
  { path: '/admin/reports', icon: LayoutDashboard, label: 'דוחות' },
];

const STORAGE_KEY = 'gp_sidebar_open';
const DEFAULT_OPEN = { operations: true, finance: true, partners: false, management: true };

const Sidebar = ({ role }) => {
  const location = useLocation();

  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_OPEN, ...JSON.parse(saved) } : DEFAULT_OPEN;
    } catch { return DEFAULT_OPEN; }
  });

  useEffect(() => {
    MANAGER_SECTIONS.forEach(({ id, items }) => {
      const hasActive = items.some((item) => location.pathname.startsWith(item.path));
      if (hasActive) {
        setOpen((prev) => {
          if (prev[id]) return prev;
          const next = { ...prev, [id]: true };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      }
    });
  }, [location.pathname]);

  const toggle = (id) => {
    setOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  if (role === 'internal_admin') {
    return (
      <aside className="sidebar">
        <div className="sidebar__brand">
          <img src="https://dughmjbtfgwtrktzzqqg.supabase.co/storage/v1/object/sign/documents/ffbc0e4d-5080-44e4-8c1a-b6070f0ec641.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZjEzMTc4OC0xMjg2LTQ0N2QtOTU4MC00ZTgyOTFhZGI2ZjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkb2N1bWVudHMvZmZiYzBlNGQtNTA4MC00NGU0LThjMWEtYjYwNzBmMGVjNjQxLmpwZWciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzgzNjkyOTIyLCJleHAiOjE4MTUyMjg5MjJ9.9Qu_LT5W_SGWW0_1Lz9IqR8n0inFtp0t7i7XlvbvFxI" alt="logo" />
        </div>
        <div className="sidebar__add-factory">
          <NavLink to="/admin/factories?new=1" className="sidebar__add-btn">
            <Plus size={16} />
            <span>יצירת חשבון מפעל</span>
          </NavLink>
        </div>
        <nav className="sidebar__nav">
          {ADMIN_NAV.map(({ path, icon: Icon, label, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Leaf size={22} strokeWidth={2.5} />
        <span>ATERUM</span>
      </div>

      <nav className="sidebar__nav">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        {MANAGER_SECTIONS.map(({ id, label, items }) => {
          const isOpen = open[id];
          const hasActive = items.some((item) => location.pathname.startsWith(item.path));
          return (
            <div key={id} className={`sidebar__section${hasActive ? ' sidebar__section--active' : ''}`}>
              <button
                className={`sidebar__section-header${isOpen ? ' sidebar__section-header--open' : ''}`}
                onClick={() => toggle(id)}
              >
                <span className="sidebar__section-label">{label}</span>
                <ChevronDown size={13} className={`sidebar__chevron${isOpen ? ' sidebar__chevron--open' : ''}`} />
              </button>

              <div className={`sidebar__section-items${isOpen ? ' sidebar__section-items--open' : ''}`}>
                {items.map(({ path, icon: Icon, label: itemLabel }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) => `sidebar__item sidebar__item--nested${isActive ? ' sidebar__item--active' : ''}`}
                  >
                    <Icon size={16} />
                    <span>{itemLabel}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
