import { useDispatch, useSelector } from 'react-redux';
import { Leaf, LogOut, Package, Truck, BarChart3, Users } from 'lucide-react';
import { logoutThunk } from '../../store/slices/authSlice';

const ROLE_LABELS = {
  employee:       'Employee',
  manager:        'Manager',
  internal_admin: 'Internal Admin',
};

const PLACEHOLDER_CARDS = [
  { icon: Package,   title: 'Raw Material Intakes', desc: 'Record and track incoming recycled materials.' },
  { icon: Package,   title: 'Batches',               desc: 'Group materials into production batches.' },
  { icon: Truck,     title: 'Shipments',             desc: 'Manage outbound shipments to customers.' },
  { icon: BarChart3, title: 'Credits',               desc: 'View generated recycling credits.' },
  { icon: Users,     title: 'Suppliers',             desc: 'Manage your supplier registry.' },
  { icon: BarChart3, title: 'Reports',               desc: 'Generate and export reports.' },
];

const HomePage = () => {
  const dispatch    = useDispatch();
  const { user }    = useSelector((state) => state.auth);

  const handleLogout = () => dispatch(logoutThunk());

  const displayName = user?.full_name || 'User';
  const role        = user?.role || 'employee';

  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="home-nav__brand">
          <Leaf size={22} strokeWidth={2.5} />
          <span>GreenPath</span>
        </div>

        <div className="home-nav__user">
          <span className="home-nav__name">{displayName}</span>
          <span className="badge badge--green">{ROLE_LABELS[role] || role}</span>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </nav>

      <main className="home-main">
        <div className="home-welcome">
          <h1>Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!</h1>
          <p>GreenPath — Plastic Recycling Credits Platform</p>
          <div className="home-meta">
            <span className="badge badge--green">{ROLE_LABELS[role] || role}</span>
            {user?.factory_name && (
              <span className="badge badge--neutral">{user.factory_name}</span>
            )}
          </div>
        </div>

        <div className="home-cards">
          {PLACEHOLDER_CARDS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="home-card">
              <div className="card-icon">
                <Icon size={20} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
