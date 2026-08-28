import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Timer from '../components/Timer';

const LANG_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
];

const LANG_MONACO = { python: 'python', c: 'c', cpp: 'cpp', java: 'java' };

const BOILERPLATE = {
  python: '# Write your solution here\n\n',
  c: '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n',
};

export default function Round2() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [activeQId, setActiveQId] = useState(null);
  
  const [codes, setCodes] = useState({});
  const [langs, setLangs] = useState({});
  const [roundInfo, setRoundInfo] = useState(null);
  
  const [output, setOutput] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [submissions, setSubmissions] = useState({}); // { qId: [sub1, sub2] }
  const [showFinish, setShowFinish] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRoundData = useCallback(async () => {
    try {
      const info = await api.startRound(2);
      setRoundInfo(info);
      const qs = await api.getQuestions(2);
      setQuestions(qs);
      if (qs.length > 0 && !activeQId) setActiveQId(qs[0].id);

      const initialCodes = {};
      const initialLangs = {};
      qs.forEach(q => {
        initialCodes[q.id] = BOILERPLATE.python;
        initialLangs[q.id] = 'python';
      });
      // Don't overwrite codes if they exist in state
      setCodes(prev => ({ ...initialCodes, ...prev }));
      setLangs(prev => ({ ...initialLangs, ...prev }));

      const subs = {};
      await Promise.all(qs.map(async (q) => {
         try {
            const qSubs = await api.getSubmissions(2, q.id);
            subs[q.id] = qSubs;
         } catch(e) {}
      }));
      setSubmissions(subs);

    } catch (err) {
      if (err.message?.includes('completed') || err.message?.includes('expired')) {
        await refreshProfile();
        navigate('/round/2/result');
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate, refreshProfile, activeQId]);

  useEffect(() => {
    fetchRoundData();
  }, [fetchRoundData]);

  // WebSocket for dynamic config updates
  useEffect(() => {
    const ws = new WebSocket(api.getWsUrl('/leaderboard'));
    
    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'config_update') {
          // If Round 2 duration changed, re-fetch round info to update timer
          if (message.data?.key === 'round2_duration') {
            const info = await api.startRound(2).catch(() => null);
            if (info) setRoundInfo(info);
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping');
    }, 30000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  const currentQ = useMemo(() => questions.find(q => q.id === activeQId), [questions, activeQId]);

  const handleCodeChange = (value) => {
    if (!currentQ) return;
    setCodes(prev => ({ ...prev, [currentQ.id]: value || '' }));
  };

  const handleLangChange = (e) => {
    if (!currentQ) return;
    const lang = e.target.value;
    setLangs(prev => ({ ...prev, [currentQ.id]: lang }));
    
    const currentCode = codes[currentQ.id] || '';
    const isBoilerplate = Object.values(BOILERPLATE).some(b => currentCode.trim() === b.trim() || currentCode.trim() === '');
    if (isBoilerplate) {
      setCodes(prev => ({ ...prev, [currentQ.id]: BOILERPLATE[lang] || '' }));
    }
  };

  const handleRun = async () => {
    if (!currentQ) return;
    setRunning(true);
    setOutput('Running...\n');
    try {
      const result = await api.runCode(2, {
        source_code: codes[currentQ.id],
        language: langs[currentQ.id],
        stdin: customInput || currentQ.sample_input || '',
      });
      let out = '';
      if (result.error) out += `Error: ${result.error}\n`;
      if (result.stderr) out += `${result.stderr}\n`;
      if (result.stdout) out += result.stdout;
      if (result.timed_out) out += '\n⏱ Time Limit Exceeded';
      setOutput(out || '(No output)');
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentQ) return;
    setSubmitting(true);
    try {
      const result = await api.submitCode(2, currentQ.id, {
        source_code: codes[currentQ.id],
        language: langs[currentQ.id],
      });
      setSubmissions(prev => {
        const old = prev[currentQ.id] || [];
        return { ...prev, [currentQ.id]: [result, ...old] };
      });
      setOutput(`Status: ${result.status}\nTest Cases: ${result.test_cases_passed}/${result.test_cases_total}\nScore: ${result.score}/${currentQ.points}`);
      await refreshProfile(); // Refresh backend score state
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    try {
      await api.finishRound(2);
      await refreshProfile();
      navigate('/result');
    } catch (err) {
      setError(err.message);
    }
  };

  const onTimerExpire = useCallback(async () => {
    await refreshProfile();
    navigate('/result');
  }, [navigate, refreshProfile]);

  const qStatus = (qId) => {
    const subs = submissions[qId] || [];
    if (subs.some(s => s.status === 'ACCEPTED')) return 'solved';
    if (subs.length > 0) return 'wrong';
    return 'untouched';
  };

  if (loading) return <div className="loading-page"><div className="spinner" /><p className="text-muted">Loading Round 2...</p></div>;
  if (error && !questions.length) return <div className="page-container"><div className="glass-card"><p className="text-red">{error}</p></div></div>;

  const solvedCount = Object.values(submissions).filter(subs => subs.some(s => s.status === 'ACCEPTED')).length;
  const progressPercent = (solvedCount / 10) * 100;

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(10, 14, 26, 0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>💻 Round 2 — Coding</h3>
        </div>
        
        <div style={{ flex: 1, margin: '0 2rem', maxWidth: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
            <span>{solvedCount} / 10 Solved</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progressPercent}%`, background: 'var(--green)', transition: 'width 0.3s' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {roundInfo && <Timer endsAt={roundInfo.ends_at} serverTime={roundInfo.server_time} onExpire={onTimerExpire} />}
          <button className="btn btn-danger btn-sm" onClick={() => setShowFinish(true)}>
            Finish Round 2
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Sidebar - Question Grid */}
        <div style={{ width: '300px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(10, 14, 26, 0.5)' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Problems (10)</h4>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {questions.map((q) => {
                const status = qStatus(q.id);
                let bg = 'rgba(255,255,255,0.05)';
                let border = '1px solid var(--border-color)';
                let color = 'var(--text-primary)';
                
                if (status === 'solved') {
                  bg = 'rgba(16, 185, 129, 0.2)';
                  border = '1px solid var(--green)';
                  color = 'var(--green)';
                } else if (status === 'wrong') {
                  bg = 'rgba(234, 179, 8, 0.2)'; // Yellowish for attempted
                  border = '1px solid var(--yellow)';
                  color = 'var(--yellow)';
                }

                if (activeQId === q.id) {
                  border = '1px solid var(--cyan)';
                  bg = status === 'untouched' ? 'rgba(6, 182, 212, 0.2)' : bg;
                }

                return (
                  <button 
                    key={q.id} 
                    onClick={() => { setActiveQId(q.id); setOutput(''); }}
                    style={{
                      aspectRatio: '2/1',
                      borderRadius: 'var(--radius-sm)',
                      background: bg,
                      border: border,
                      color: color,
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      padding: '0.5rem',
                      textAlign: 'center'
                    }}
                  >
                    <span>P{q.order_index + 1}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 'normal', opacity: 0.8, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{q.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main Editor + Problem Area */}
        {currentQ ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              
              {/* Problem Statement (Left) */}
              <div className="problem-panel glass-card-static" style={{ flex: '0 0 35%', overflowY: 'auto', padding: '1.5rem', borderRight: '1px solid var(--border-color)', borderBottom: 'none' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--cyan)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginRight: '0.5rem', textTransform: 'uppercase' }}>Problem:</span> 
                  {currentQ.order_index + 1}. {currentQ.title}
                </h3>
                <span className="badge badge-available" style={{ marginBottom: '1rem', display: 'inline-flex' }}>{currentQ.points} pts</span>

                <div style={{ fontSize: '0.9375rem', lineHeight: '1.7', marginBottom: '1rem' }}>
                  {currentQ.description}
                </div>

                {currentQ.input_description && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', color: 'var(--yellow)', marginBottom: '0.375rem' }}>Input</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{currentQ.input_description}</p>
                  </div>
                )}

                {currentQ.output_description && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', color: 'var(--yellow)', marginBottom: '0.375rem' }}>Output</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{currentQ.output_description}</p>
                  </div>
                )}

                {currentQ.constraints && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', color: 'var(--purple)', marginBottom: '0.375rem' }}>Constraints</h4>
                    <pre style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>{currentQ.constraints}</pre>
                  </div>
                )}

                {(currentQ.sample_input || currentQ.sample_output) && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', color: 'var(--magenta)', marginBottom: '0.375rem' }}>Sample</h4>
                    <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                      {currentQ.sample_input && <div><span className="text-muted">Input:</span><pre style={{ margin: '0.25rem 0 0.5rem' }}>{currentQ.sample_input}</pre></div>}
                      {currentQ.sample_output && <div><span className="text-muted">Output:</span><pre style={{ margin: '0.25rem 0' }}>{currentQ.sample_output}</pre></div>}
                    </div>
                  </div>
                )}

                {submissions[currentQ.id] && submissions[currentQ.id].length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Submissions</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {submissions[currentQ.id].slice(0, 3).map((sub, i) => (
                        <div key={sub.id} style={{
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          background: sub.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          border: `1px solid ${sub.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          fontSize: '0.8125rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>{sub.status === 'ACCEPTED' ? '✅ Accepted' : `❌ ${sub.status}`}</strong>
                            <span>{sub.score}/{currentQ.points} pts</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Tests Passed: {sub.test_cases_passed} / {sub.test_cases_total}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Code Editor Area (Right) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="editor-toolbar" style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                  <select className="input-field" style={{ width: 'auto', padding: '0.375rem 2rem 0.375rem 0.75rem', fontSize: '0.8125rem' }} value={langs[currentQ.id] || 'python'} onChange={handleLangChange}>
                    {LANG_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleRun} disabled={running}>
                      {running ? '⏳ Running...' : '▶ Run Code'}
                    </button>
                    <button className="btn btn-success btn-sm" onClick={handleSubmit} disabled={submitting}>
                      {submitting ? '⏳ Submitting...' : '📤 Submit Solution'}
                    </button>
                  </div>
                </div>

                <div className="editor-wrapper" style={{ flex: 1 }}>
                  <Editor
                    height="100%"
                    language={LANG_MONACO[langs[currentQ.id]] || 'python'}
                    value={codes[currentQ.id] || ''}
                    onChange={handleCodeChange}
                    theme="vs-dark"
                    options={{
                      contextmenu: false,
                      quickSuggestions: false,
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 4,
                    }}
                  />
                </div>

                {/* Output Console */}
                <div style={{ height: '30%', borderTop: '1px solid var(--border-color)', background: '#1e1e1e', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Output / Run Console</span>
                    <input 
                      type="text" 
                      placeholder="Custom stdin..."
                      className="input-field" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', width: '200px' }}
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{output || 'Click "Run Code" to execute with sample/custom input, or "Submit Solution" to run against hidden test cases.'}</pre>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a problem from the sidebar
          </div>
        )}

      </div>

      {/* Finish Confirmation Modal */}
      {showFinish && (
        <div className="modal-overlay" onClick={() => setShowFinish(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-yellow">⚠️ Finish Round 2?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Are you sure you want to finish Round 2? You cannot return after submission.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowFinish(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleFinish}>Yes, Finish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
