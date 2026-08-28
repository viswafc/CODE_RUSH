import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function DisqualifiedPage() {
  return (
    <>
      <Navbar />
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
        <div className="glass-card animate-slide-up" style={{ textAlign: 'center', padding: '3rem', maxWidth: '500px', width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <h1 style={{ color: 'var(--red)', fontSize: '3rem', marginBottom: '1rem', textShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }}>
            🚫
          </h1>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
            You Have Been Disqualified
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Your session has been terminated due to excessive tab switching or suspicious activity during the competition.
          </p>
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '2rem' }}>
            <span style={{ color: 'var(--red)', fontWeight: 'bold' }}>Reason:</span> Exceeded maximum allowed tab switches (5)
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
            You can still view the leaderboard to track the final standings.
          </p>
          <Link to="/leaderboard" className="btn btn-primary" style={{ width: '100%' }}>
            View Leaderboard →
          </Link>
        </div>
      </div>
    </>
  );
}
