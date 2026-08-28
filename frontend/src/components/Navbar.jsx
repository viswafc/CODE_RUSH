import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { student, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">
        <span style={{ fontSize: '1.5rem' }}>⚡</span>
        <h1>CODE RUSH 2K26</h1>
      </Link>
      <div className="navbar-links">
        <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
        <Link to="/leaderboard" className={isActive('/leaderboard')}>Leaderboard</Link>
        {student && student.penalty_multiplier < 1.0 && (
          <span style={{ color: 'var(--red)', fontSize: '0.8125rem', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.2)', padding: '4px 8px', borderRadius: '4px' }}>
            ⚠️ Penalty: {Math.round((1 - student.penalty_multiplier) * 100)}%
          </span>
        )}
        {student && (
          <span style={{ color: student.tab_switches > 0 ? 'var(--yellow)' : 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 'bold', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: '4px' }}>
            🔄 Tabs: {student.tab_switches} / 5
          </span>
        )}
        {student && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            {student.name}
          </span>
        )}
        <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
      </div>
    </nav>
  );
}
