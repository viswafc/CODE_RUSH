import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({ round: '', department: '', year: '', search: '' });
  const [loading, setLoading] = useState(true);

  // Fetch initial
  useEffect(() => {
    fetchLeaderboard();
  }, [filters]);

  // WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws/leaderboard`);
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'leaderboard_update') {
          // If we have local filters active, we should probably refetch to apply them server-side, 
          // or apply them client-side to the broadcasted data. For simplicity, we just refetch.
          fetchLeaderboard();
        }
      } catch (e) {}
    };

    // Ping interval to keep connection alive
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping');
    }, 30000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [filters]);

  const fetchLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard(filters);
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds == null) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆 LIVE LEADERBOARD</h2>
        <p className="text-secondary">Real-time competition rankings</p>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: '1 1 200px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search name..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div className="input-group" style={{ flex: '1 1 150px' }}>
            <select className="input-field" value={filters.round} onChange={e => setFilters(prev => ({ ...prev, round: e.target.value }))}>
              <option value="">All Rounds</option>
              <option value="round1">Round 1</option>
              <option value="round2">Round 2</option>
              <option value="final">Final Completed</option>
            </select>
          </div>
          <div className="input-group" style={{ flex: '1 1 150px' }}>
            <select className="input-field" value={filters.department} onChange={e => setFilters(prev => ({ ...prev, department: e.target.value }))}>
              <option value="">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
              <option value="IT">IT</option>
              <option value="AIDS">AIDS</option>
              <option value="AIML">AIML</option>
              <option value="CSE (CS)">CSE (CS)</option>
              <option value="BME">BME</option>
            </select>
          </div>
          <div className="input-group" style={{ flex: '1 1 150px' }}>
            <select className="input-field" value={filters.year} onChange={e => setFilters(prev => ({ ...prev, year: e.target.value }))}>
              <option value="">All Years</option>
              <option value="II Year">II Year</option>
              <option value="III Year">III Year</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Department</th>
                <th>Year</th>
                <th>Round</th>
                <th>Score</th>
                <th>Tabs</th>
                <th>Penalty</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No students found on the leaderboard.</td></tr>
              ) : (
                entries.map((entry) => (
                  <tr key={`${entry.rank}-${entry.name}`} className="animate-slide-up" style={{ animationDelay: `${Math.min(entry.rank * 0.05, 0.5)}s` }}>
                    <td className={`rank-cell rank-${entry.rank}`}>
                      {entry.rank === 1 ? '🥇 ' : entry.rank === 2 ? '🥈 ' : entry.rank === 3 ? '🥉 ' : `#${entry.rank}`}
                    </td>
                    <td style={{ fontWeight: 500 }}>{entry.name}</td>
                    <td className="text-secondary">{entry.department}</td>
                    <td className="text-secondary">{entry.year}</td>
                    <td>
                      <span className={`badge ${entry.current_round.includes('2') || entry.current_round === 'Completed' ? 'badge-completed' : 'badge-in-progress'}`}>
                        {entry.current_round}
                      </span>
                    </td>
                    <td className="font-heading text-cyan" style={{ fontSize: '1.125rem' }}>{entry.final_score}</td>
                    <td className="font-mono" style={{ color: entry.tab_switches > 0 ? 'var(--yellow)' : 'inherit' }}>{entry.tab_switches}</td>
                    <td className="font-mono" style={{ color: entry.penalty_multiplier < 1.0 ? 'var(--red)' : 'inherit' }}>
                      {entry.penalty_multiplier < 1.0 ? `${Math.round((1 - entry.penalty_multiplier) * 100)}%` : '—'}
                    </td>
                    <td className="font-mono text-muted">{formatTime(entry.total_time_seconds)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
