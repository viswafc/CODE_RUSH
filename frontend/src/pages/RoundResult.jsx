import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoundResult() {
  const { roundNumber } = useParams();
  const { student } = useAuth();
  const navigate = useNavigate();

  if (!student) return null;

  const round = parseInt(roundNumber);
  const score = round === 1 ? student.round1_score : student.round2_score;
  const totalPossible = round === 1 ? 400 : 100;
  const timeSeconds = round === 1 ? student.round1_time_seconds : student.round2_time_seconds;
  const minutes = timeSeconds ? Math.floor(timeSeconds / 60) : 0;
  const seconds = timeSeconds ? timeSeconds % 60 : 0;

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '600px', textAlign: 'center', paddingTop: '4rem' }}>
      <div className="neon-card" style={{ padding: '3rem 2rem' }}>
        <h2 className="text-gradient" style={{ marginBottom: '0.5rem' }}>
          {round === 1 ? '🐛' : '💻'} Round {round} Complete!
        </h2>
        <p className="text-secondary" style={{ marginBottom: '2rem' }}>
          {round === 1 ? 'Debugging Challenge' : 'Coding Challenge'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginBottom: '2rem' }}>
          <div>
            <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Score</p>
            <p className="font-heading text-cyan" style={{ fontSize: '2.5rem' }}>{score}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{totalPossible}</span></p>
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Time</p>
            <p className="font-heading text-purple" style={{ fontSize: '2.5rem' }}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {round === 1 && student.round2_unlocked && (
            <button className="btn btn-purple btn-lg" style={{ width: '100%' }} onClick={() => navigate('/round/2')}>
              🚀 Start Round 2 →
            </button>
          )}
          {round === 1 && !student.round2_unlocked && (
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: '0.875rem' }}>
              ⚠️ You did not solve the minimum required 15 questions to unlock Round 2.
            </div>
          )}
          {round === 2 && (
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => navigate('/result')}>
              🎉 View Final Result →
            </button>
          )}
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
