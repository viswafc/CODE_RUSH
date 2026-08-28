import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import CompetitionControl from './CompetitionControl';
import StudentManager from './StudentManager';
import QuestionManager from './QuestionManager';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await api.getCompetitionStatus();
      setStatus(data);
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!status) return null;

  const isActive = (path) => location.pathname === `/admin${path}` ? 'active' : '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Admin Navbar */}
      <nav className="navbar" style={{ background: 'rgba(139, 92, 246, 0.1)', borderBottomColor: 'rgba(139, 92, 246, 0.3)' }}>
        <div className="navbar-brand">
          <span style={{ fontSize: '1.25rem' }}>🛡️</span>
          <h1 style={{ background: 'linear-gradient(135deg, var(--purple), var(--magenta))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Admin Portal
          </h1>
        </div>
        <div className="navbar-links">
          <Link to="/admin/dashboard" className={isActive('/dashboard')}>Control Panel</Link>
          <Link to="/admin/students" className={isActive('/students')}>Students</Link>
          <Link to="/admin/questions" className={isActive('/questions')}>Questions</Link>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ borderColor: 'var(--purple)', color: 'var(--purple)' }}>
            Logout
          </button>
        </div>
      </nav>

      <div className="page-container" style={{ flex: 1, padding: '2rem' }}>
        <Routes>
          <Route path="/dashboard" element={<CompetitionControl status={status} onRefresh={fetchStatus} />} />
          <Route path="/students" element={<StudentManager />} />
          <Route path="/questions" element={<QuestionManager />} />
          <Route path="/" element={<CompetitionControl status={status} onRefresh={fetchStatus} />} />
        </Routes>
      </div>
    </div>
  );
}
