import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PlusCircle, Package, Clock } from 'lucide-react';

const EmployeeDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="employee-dashboard">
      <div className="employee-dashboard__greeting">
        <h1>Hi, {firstName} 👋</h1>
        <p>{user?.factory_name || 'Your factory'}</p>
      </div>

      <Link to="/intakes/new" className="cta-btn">
        <PlusCircle size={24} />
        <span>New Intake</span>
      </Link>

      <div className="employee-dashboard__tiles">
        <Link to="/intakes" className="tile">
          <Package size={26} />
          <span>My Intakes</span>
        </Link>
        <div className="tile tile--disabled">
          <Clock size={26} />
          <span>Recent Activity</span>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
