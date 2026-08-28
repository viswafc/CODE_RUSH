import { useState } from 'react';
import { api } from '../../services/api';

export default function CompetitionControl({ status, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Restart modal state
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restartPassword, setRestartPassword] = useState('');
  const [restartLoading, setRestartLoading] = useState(false);
  const [restartError, setRestartError] = useState('');

  const updateConfig = async (key, value) => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.updateConfig({ key, value: String(value) });
      await onRefresh();
    } catch (err) {
      let errorMsg = err.message || 'Update failed';
      if (typeof errorMsg === 'object') {
        errorMsg = Array.isArray(errorMsg) ? errorMsg.map(e => e.msg || JSON.stringify(e)).join(', ') : JSON.stringify(errorMsg);
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = (newState) => {
    if (confirm(`Are you sure you want to change competition state to ${newState}?`)) {
      updateConfig('competition_status', newState);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportResults();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coderush_results_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export results');
    }
  };

  const handleRestartEvent = async () => {
    if (!restartPassword) {
      setRestartError('Please enter the admin password');
      return;
    }
    setRestartLoading(true);
    setRestartError('');
    try {
      const result = await api.restartEvent(restartPassword);
      setShowRestartModal(false);
      setRestartPassword('');
      setSuccessMsg(result.message || 'Event restarted successfully!');
      await onRefresh();
    } catch (err) {
      setRestartError(err.message || 'Failed to restart event');
    } finally {
      setRestartLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Control Panel</h2>
        <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
          🔄 Refresh Status
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--green)', borderRadius: 'var(--radius-sm)', color: 'var(--green)', marginBottom: '1.5rem' }}>
          ✅ {successMsg}
        </div>
      )}

      <div className="grid-2">
        {/* Global State Control */}
        <div className="neon-card-purple">
          <h3 style={{ marginBottom: '1.5rem' }}>Competition State</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
              <span>Current Phase</span>
              <span className="badge badge-in-progress" style={{ fontSize: '0.875rem' }}>{status.status}</span>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleStateChange('REGISTRATION_OPEN')}
                disabled={status.status === 'REGISTRATION_OPEN' || loading}
              >
                Open Registration
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleStateChange('ROUND_1_AVAILABLE')}
                disabled={status.status === 'ROUND_1_AVAILABLE' || loading}
              >
                Open Round 1
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleStateChange('ROUND_2_AVAILABLE')}
                disabled={status.status === 'ROUND_2_AVAILABLE' || loading}
              >
                Open Round 2
              </button>
              
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '1rem 0' }} />

              <button 
                className="btn btn-danger" 
                onClick={() => handleStateChange('COMPETITION_COMPLETED')}
                disabled={status.status === 'COMPETITION_COMPLETED' || loading}
              >
                End Competition
              </button>
            </div>
          </div>
        </div>

        {/* Round Info (read-only) */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem' }}>Round Configuration</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🐛</span>
                <div>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Round 1 — Debugging</p>
                  <p className="text-muted" style={{ fontSize: '0.8125rem' }}>40 MCQ Questions</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="text-cyan font-heading" style={{ fontSize: '1.5rem' }}>15</p>
                <p className="text-muted" style={{ fontSize: '0.75rem' }}>Minutes</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>💻</span>
                <div>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Round 2 — Coding</p>
                  <p className="text-muted" style={{ fontSize: '0.8125rem' }}>10 Coding Problems</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="text-purple font-heading" style={{ fontSize: '1.5rem' }}>30</p>
                <p className="text-muted" style={{ fontSize: '0.75rem' }}>Minutes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics & Export */}
        <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Statistics & Export</h3>
            <button className="btn btn-success" onClick={handleExport}>
              📥 Export Full Results (CSV)
            </button>
          </div>
          
          <div className="grid-3" style={{ gap: '1rem' }}>
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Registered</p>
              <p className="font-heading" style={{ fontSize: '2rem', color: 'var(--cyan)' }}>{status.total_students}</p>
            </div>
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>In Round 1</p>
              <p className="font-heading" style={{ fontSize: '2rem', color: 'var(--purple)' }}>{status.students_in_round1}</p>
            </div>
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Competition Completed</p>
              <p className="font-heading" style={{ fontSize: '2rem', color: 'var(--magenta)' }}>{status.students_completed}</p>
            </div>
          </div>
        </div>

        {/* Restart Event - Danger Zone */}
        <div style={{ gridColumn: '1 / -1', border: '2px solid var(--red)', borderRadius: 'var(--radius-md)', padding: '2rem', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: 'var(--red)', marginBottom: '0.5rem' }}>⚠️ Danger Zone — Restart Event</h3>
              <p className="text-muted" style={{ fontSize: '0.875rem', maxWidth: '600px' }}>
                This will <strong style={{ color: 'var(--red)' }}>permanently delete ALL student data</strong> — registrations, submissions, 
                scores, round attempts, and leaderboard entries. Questions will be preserved. 
                The competition will be reset to a fresh state with registration open.
              </p>
            </div>
            <button 
              className="btn btn-danger" 
              onClick={() => { setShowRestartModal(true); setRestartError(''); setRestartPassword(''); }}
              style={{ whiteSpace: 'nowrap', minWidth: '180px' }}
            >
              🔄 Restart Entire Event
            </button>
          </div>
        </div>
      </div>

      {/* Restart Confirmation Modal */}
      {showRestartModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem',
        }}>
          <div className="glass-card" style={{ 
            maxWidth: '480px', width: '100%', padding: '2.5rem',
            border: '1px solid var(--red)',
          }}>
            <h2 style={{ color: 'var(--red)', marginBottom: '0.5rem', textAlign: 'center' }}>⚠️ Confirm Restart</h2>
            <p className="text-secondary" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.875rem' }}>
              This action is <strong style={{ color: 'var(--red)' }}>irreversible</strong>. All student data will be permanently deleted.
              Enter your admin password to confirm.
            </p>

            {restartError && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
                {restartError}
              </div>
            )}

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label>Admin Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter admin password..."
                value={restartPassword}
                onChange={e => setRestartPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRestartEvent(); }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowRestartModal(false)} 
                style={{ flex: 1 }}
                disabled={restartLoading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleRestartEvent} 
                style={{ flex: 1 }}
                disabled={restartLoading || !restartPassword}
              >
                {restartLoading ? '⏳ Restarting...' : '🔄 Restart Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
