import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.adminLogin({ username: 'admin', password });
      localStorage.setItem('admin_token', data.access_token);
      navigate('/admin/dashboard');
    } catch (err) {
      let errorMsg = err.message || 'Login failed';
      if (typeof errorMsg === 'object') {
        errorMsg = Array.isArray(errorMsg) ? errorMsg.map(e => e.msg || JSON.stringify(e)).join(', ') : JSON.stringify(errorMsg);
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem' }}>Admin Portal</h1>
          <p className="text-secondary">CODE RUSH 2K26</p>
        </div>

        <div className="neon-card-purple">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group">
              <label htmlFor="password">Admin Password</label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoFocus
              />
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-purple" disabled={loading || !password}>
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
