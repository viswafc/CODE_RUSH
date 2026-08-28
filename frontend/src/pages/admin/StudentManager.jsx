import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function StudentManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', department: '', year: '' });
  const [liveStatus, setLiveStatus] = useState({ online: 0, offline: 0, total: 0 });

  useEffect(() => {
    fetchStudents();
    fetchLiveStatus();
    
    // Connect to WebSocket for live updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL).host : window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws/admin/status`);
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'student_status_update') {
          // msg.data is the full list of students
          setStudents(prev => {
            // Only update the ones that match current filters to avoid wiping out the search
            // But for simplicity, let's just re-fetch or merge
            // Merging:
            const newMap = new Map(msg.data.map(s => [s.id, s]));
            return prev.map(s => newMap.has(s.id) ? newMap.get(s.id) : s);
          });
          
          const online = msg.data.filter(s => s.is_logged_in).length;
          setLiveStatus({
            online,
            offline: msg.data.length - online,
            total: msg.data.length
          });
        }
      } catch (err) {
        console.error("WS parse error", err);
      }
    };
    
    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  const fetchLiveStatus = async () => {
    try {
      const res = await api.fetchWithAuth('/admin/student-status');
      setLiveStatus({
        online: res.data.logged_in,
        offline: res.data.logged_out,
        total: res.data.total_students
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await api.getStudents(filters);
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Students</h2>
          <p className="text-secondary">View and manage registered students</p>
        </div>
        
        <div className="glass-card" style={{ padding: '0.5rem 1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{liveStatus.total}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Online <span style={{ color: 'var(--green)' }}>●</span></div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--green)' }}>{liveStatus.online}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Offline <span style={{ color: 'var(--text-muted)' }}>●</span></div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{liveStatus.offline}</div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: '1 1 200px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search by name or register number..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
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

      <div className="glass-card-static" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="leaderboard-table" style={{ borderSpacing: 0 }}>
            <thead>
              <tr>
                <th>Reg No.</th>
                <th>Name</th>
                <th>Status</th>
                <th>Dept & Year</th>
                <th>State</th>
                <th>R1 Score</th>
                <th>R2 Score</th>
                <th>Tab Switches</th>
                <th>Penalty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No students found.</td></tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono">{s.register_number}</td>
                    <td style={{ fontWeight: 500 }}>
                      {s.name}
                      {s.disqualified && <span className="badge badge-error" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>DISQUALIFIED</span>}
                    </td>
                    <td>
                      {s.is_logged_in ? (
                        <span style={{ color: 'var(--green)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ fontSize: '0.5rem' }}>🟢</span> Online</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ fontSize: '0.5rem' }}>⚪</span> Offline</span>
                      )}
                    </td>
                    <td className="text-secondary">{s.department} · {s.year}</td>
                    <td><span className="badge badge-in-progress" style={{ fontSize: '0.6875rem' }}>{s.state}</span></td>
                    <td className="font-mono">{s.round1_score}</td>
                    <td className="font-mono">{s.round2_score}</td>
                    <td className="font-mono" style={{ color: s.tab_switches > 0 ? 'var(--yellow)' : 'inherit' }}>{s.tab_switches}</td>
                    <td className="font-mono" style={{ color: s.penalty_multiplier < 1.0 ? 'var(--red)' : 'inherit' }}>
                      {s.penalty_multiplier < 1.0 ? `${Math.round((1 - s.penalty_multiplier) * 100)}%` : 'None'}
                    </td>
                    <td className="font-mono text-cyan">{s.final_score}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
