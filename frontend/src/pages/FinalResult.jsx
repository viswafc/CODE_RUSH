import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function FinalResult() {
  const { student } = useAuth();
  const navigate = useNavigate();
  const [leaderboardRank, setLeaderboardRank] = useState(null);

  useEffect(() => {
    if (student) {
      api.getLeaderboard().then(entries => {
        const myEntry = entries.find(e => e.name === student?.name);
        if (myEntry) setLeaderboardRank(myEntry.rank);
      }).catch(() => {});
    }
  }, [student]);

  if (!student) return null;

  return (
    <div className="page-container animate-slide-up" style={{ maxWidth: '800px', textAlign: 'center', paddingTop: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉 CODE RUSH COMPLETED!</h1>
        <p className="text-secondary" style={{ fontSize: '1.25rem' }}>{student.name}</p>
        <p className="text-muted" style={{ fontSize: '0.9375rem' }}>{student.department} · {student.year}</p>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem', textAlign: 'left' }}>
        {/* Round 1 Stats */}
        <div className="glass-card">
          <h3 style={{ color: 'var(--cyan)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Round 1 — Debugging</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Score</span>
              <span className="font-heading" style={{ fontSize: '1.125rem' }}>{student.round1_score}/2</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Time</span>
              <span className="font-mono">{Math.floor((student.round1_time_seconds || 0) / 60)}m {(student.round1_time_seconds || 0) % 60}s</span>
            </div>
          </div>
        </div>

        {/* Round 2 Stats */}
        <div className="glass-card">
          <h3 style={{ color: 'var(--purple)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Round 2 — Coding</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Score</span>
              <span className="font-heading" style={{ fontSize: '1.125rem' }}>{student.round2_score}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Time</span>
              <span className="font-mono">{Math.floor((student.round2_time_seconds || 0) / 60)}m {(student.round2_time_seconds || 0) % 60}s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="neon-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
          <div>
            <p className="text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>Final Score</p>
            <p className="font-heading text-cyan" style={{ fontSize: '3rem', textShadow: '0 0 20px var(--cyan-glow)' }}>
              {student.final_score}
            </p>
          </div>
          <div style={{ width: '1px', height: '60px', background: 'var(--border-color)' }}></div>
          <div>
            <p className="text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>Current Rank</p>
            <p className="font-heading text-purple" style={{ fontSize: '3rem', textShadow: '0 0 20px var(--purple-glow)' }}>
              {leaderboardRank ? `#${leaderboardRank}` : '—'}
            </p>
          </div>
        </div>
      </div>

      <button className="btn btn-primary btn-lg" onClick={() => navigate('/leaderboard')} style={{ minWidth: '250px' }}>
        🏆 View Live Leaderboard
      </button>
    </div>
  );
}
