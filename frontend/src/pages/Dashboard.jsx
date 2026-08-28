import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Dashboard() {
  const { student, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [leaderboardRank, setLeaderboardRank] = useState(null);
  const [round1Duration, setRound1Duration] = useState(15);
  const [round2Duration, setRound2Duration] = useState(30);

  useEffect(() => {
    refreshProfile();
    // Try to get rank
    api.getLeaderboard().then(entries => {
      const myEntry = entries.find(e => e.name === student?.name);
      if (myEntry) setLeaderboardRank(myEntry.rank);
    }).catch(() => {});

    // Fetch initial config
    api.getCompetitionConfig().then(config => {
      setRound1Duration(config.round1_duration);
      setRound2Duration(config.round2_duration);
    }).catch(() => {});

    // Listen for config updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host === 'localhost:5173' ? 'localhost:8000' : window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/api/ws/leaderboard`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'config_update') {
          api.getCompetitionConfig().then(config => {
            setRound1Duration(config.round1_duration);
            setRound2Duration(config.round2_duration);
          });
        }
      } catch (e) {}
    };

    return () => ws.close();
  }, []);

  if (!student) return null;

  const state = student.state;

  const getRoundStatus = (round) => {
    if (round === 1) {
      if (['ROUND_1_COMPLETED', 'ROUND_2_AVAILABLE', 'ROUND_2_IN_PROGRESS', 'ROUND_2_COMPLETED', 'COMPETITION_COMPLETED'].includes(state)) return 'completed';
      if (state === 'ROUND_1_IN_PROGRESS') return 'in-progress';
      if (state === 'ROUND_1_AVAILABLE' || state === 'REGISTERED') return 'available';
      return 'locked';
    } else {
      if (['ROUND_2_COMPLETED', 'COMPETITION_COMPLETED'].includes(state)) return 'completed';
      if (state === 'ROUND_2_IN_PROGRESS') return 'in-progress';
      if (state === 'ROUND_2_AVAILABLE') return 'available';
      return 'locked';
    }
  };

  const r1Status = getRoundStatus(1);
  const r2Status = getRoundStatus(2);

  const statusIcon = (s) => {
    if (s === 'completed') return '✅';
    if (s === 'in-progress') return '🔄';
    if (s === 'available') return '🟢';
    return '🔒';
  };

  const statusLabel = (s) => {
    if (s === 'completed') return 'Completed';
    if (s === 'in-progress') return 'In Progress';
    if (s === 'available') return 'Available';
    return 'Locked';
  };

  const badgeClass = (s) => {
    if (s === 'completed') return 'badge badge-completed';
    if (s === 'in-progress') return 'badge badge-in-progress';
    if (s === 'available') return 'badge badge-available';
    return 'badge badge-locked';
  };

  const handleRoundClick = (round) => {
    const status = round === 1 ? r1Status : r2Status;
    if (status === 'available' || status === 'in-progress') {
      navigate(`/round/${round}`);
    } else if (status === 'completed' && round === 1) {
      navigate(`/round/1/result`);
    } else if (status === 'completed' && round === 2) {
      navigate('/result');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Welcome Header */}
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Welcome, {student.name}</h2>
        <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
          {student.department} · {student.year} · {student.register_number}
        </p>
      </div>

      {/* Competition Progress */}
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        Competition Progress
      </h3>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* Round 1 Card */}
        <div
          className={`neon-card ${r1Status === 'available' || r1Status === 'in-progress' ? '' : ''}`}
          style={{ cursor: r1Status !== 'locked' ? 'pointer' : 'default' }}
          onClick={() => handleRoundClick(1)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>Round 1</h3>
              <p className="text-muted" style={{ fontSize: '0.8125rem' }}>Debugging Challenge</p>
            </div>
            <span className={badgeClass(r1Status)}>
              {statusIcon(r1Status)} {statusLabel(r1Status)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span>⏱ {round1Duration} Minutes</span>
            <span>🐛 40 MCQs</span>
            {r1Status === 'completed' && <span className="text-cyan">Score: {student.round1_score}</span>}
          </div>
          {(r1Status === 'available' || r1Status === 'in-progress') && (
            <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
              {r1Status === 'in-progress' ? 'Continue Round 1' : 'Start Round 1'} →
            </button>
          )}
        </div>

        {/* Round 2 Card */}
        <div
          className={`neon-card ${r2Status === 'locked' ? 'neon-card-purple' : ''}`}
          style={{ cursor: r2Status !== 'locked' ? 'pointer' : 'default', opacity: r2Status === 'locked' ? 0.6 : 1 }}
          onClick={() => handleRoundClick(2)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>Round 2</h3>
              <p className="text-muted" style={{ fontSize: '0.8125rem' }}>Coding Challenge</p>
            </div>
            <span className={badgeClass(r2Status)}>
              {statusIcon(r2Status)} {statusLabel(r2Status)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span>⏱ {round2Duration} Minutes</span>
            <span>💻 10 Problems</span>
            {r2Status === 'completed' && <span className="text-cyan">Score: {student.round2_score}</span>}
          </div>
          {r2Status === 'locked' && (
            <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              🔒 Complete Round 1 to unlock
            </p>
          )}
          {(r2Status === 'available' || r2Status === 'in-progress') && (
            <button className="btn btn-purple" style={{ marginTop: '1rem', width: '100%' }}>
              {r2Status === 'in-progress' ? 'Continue Round 2' : 'Start Round 2'} →
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-3">
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Current Score
          </p>
          <p className="font-heading text-cyan" style={{ fontSize: '2rem' }}>{student.final_score}</p>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Current Rank
          </p>
          <p className="font-heading text-purple" style={{ fontSize: '2rem' }}>
            {leaderboardRank ? `#${leaderboardRank}` : '—'}
          </p>
        </div>
        <div className="glass-card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/leaderboard')}>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Leaderboard
          </p>
          <p className="text-cyan" style={{ fontSize: '1rem' }}>🏆 View Rankings →</p>
        </div>
      </div>

      {/* Competition Rules */}
      <h3 style={{ margin: '3rem 0 1.5rem 0', color: 'var(--text-secondary)' }}>
        Competition Rules & Guidelines
      </h3>
      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.5rem' }}>🔓</span>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Round 2 Unlock Requirement</h4>
            <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
              You must correctly solve a <strong>minimum of 15 questions</strong> in Round 1 to unlock access to Round 2. If you finish Round 1 with fewer than 15 correct answers, your competition ends.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.5rem' }}>🚫</span>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--red)' }}>Anti-Cheat: Tab Switching Penalty</h4>
            <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
              Switching tabs, minimizing the browser, or losing window focus is strictly monitored.
              Each switch applies a cumulative score penalty (e.g. 5%, 15%, 30%).
              <strong style={{ color: 'var(--red)' }}> If you switch tabs 5 times, you will be immediately terminated and disqualified.</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.5rem' }}>📋</span>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Copy/Paste Disabled</h4>
            <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
              Copying text from the platform or pasting code from outside sources into the editor is fully disabled to ensure original work.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.5rem' }}>🎯</span>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>One-Time Selection (Round 1)</h4>
            <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
              For the Round 1 Debugging Challenge, <strong>options can only be selected and submitted once per question</strong>. Choose your answer carefully before submitting, as you will not be able to change it!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
