import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSE (CS)', 'BME'];

export default function Login() {
  const navigate = useNavigate();
  const { login, register: registerStudent } = useAuth();
  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [form, setForm] = useState({
    register_number: '',
    name: '',
    department: 'CSE',
    year: 'II Year',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!form.register_number || !form.name) {
          setError('All fields are required');
          setLoading(false);
          return;
        }
        await registerStudent(form);
      } else {
        if (!form.register_number) {
          setError('Register number is required');
          setLoading(false);
          return;
        }
        await login(form.register_number);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '460px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚡</div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>CODE RUSH 2K26</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Coding Club – Cyber Creepers
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Department of CSE · V.S.B. Engineering College, Karur
          </p>
        </div>

        {/* Card */}
        <div className="glass-card-static" style={{ padding: '2rem' }}>
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: '1.5rem' }}>
            <button
              className={`tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
            >
              Register
            </button>
            <button
              className={`tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              Login
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label htmlFor="register_number">Register Number</label>
                <input
                  id="register_number"
                  name="register_number"
                  className="input-field"
                  type="text"
                  placeholder="e.g., 22CSE001"
                  value={form.register_number}
                  onChange={handleChange}
                  autoFocus
                />
              </div>

              {mode === 'register' && (
                <>
                  <div className="input-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                      id="name"
                      name="name"
                      className="input-field"
                      type="text"
                      placeholder="Enter your full name"
                      value={form.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="department">Department</label>
                    <select
                      id="department"
                      name="department"
                      className="input-field"
                      value={form.department}
                      onChange={handleChange}
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="year">Year</label>
                    <select
                      id="year"
                      name="year"
                      className="input-field"
                      value={form.year}
                      onChange={handleChange}
                    >
                      <option value="II Year">II Year</option>
                      <option value="III Year">III Year</option>
                    </select>
                  </div>
                </>
              )}

              {error && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--red)',
                  fontSize: '0.875rem',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Please wait...</> : (
                  mode === 'register' ? '🚀 Register & Enter' : '🔓 Login'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Saturday, 22 August 2026 · CSE Lab
        </p>
      </div>
    </div>
  );
}
