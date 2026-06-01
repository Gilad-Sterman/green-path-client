import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Plus, Package, Layers, Truck, ChevronLeft, Settings } from 'lucide-react';

const EmployeeDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const firstName = user?.full_name?.split(' ')[0] || '';

  return (
    <div className="employee-dashboard">

      <p className="mgr-section-title" style={{ marginTop: 0 }}>פעולות ייצור</p>
      <div className="production-actions">
        <Link to="/intakes/new" className="prod-action">
          <div className="prod-action__icon"><Plus size={22} /></div>
          <div>
            <p className="prod-action__title">קליטת חומר למחסן</p>
          </div>
        </Link>
        <Link to="/batches?new=1" className="prod-action">
          <div className="prod-action__icon"><Plus size={22} /></div>
          <div>
            <p className="prod-action__title">יצירת אצוות מוצר</p>
          </div>
        </Link>
        <Link to="/shipments?new=1" className="prod-action">
          <div className="prod-action__icon"><Plus size={22} /></div>
          <div>
            <p className="prod-action__title">יצירת משלוח ללקוח</p>
          </div>
        </Link>
      </div>

      <div className="mgmt-grid">
        <Link to="/settings" className="mgmt-tile">
          <span className="mgmt-tile__label">הגדרות</span>
        </Link>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
