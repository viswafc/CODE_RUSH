import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Timer from '../components/Timer';

const LANG_MAP = { python: 'python', c: 'c', cpp: 'cpp', java: 'java' };

export default function Round1() {
  const navigate = useNavigate();
  const { student, refreshProfile } = useAuth();
  
  const [questions, setQuestions] = useState([]);
  const [languageFilter, setLanguageFilter] = useState('All'); // All, python, java, c
  const [activeQId, setActiveQId] = useState(null);
  const [roundInfo, setRoundInfo] = useState(null);
  
  const [selectedOptions, setSelectedOptions] = useState({});
  const [submissions, setSubmissions] = useState({}); // { qId: [sub1, sub2] }
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFinish, setShowFinish] = useState(false);

  // Load round data
  const fetchRoundData = useCallback(async () => {
    try {
      const info = await api.startRound(1);
      setRoundInfo(info);
      const qs = await api.getQuestions(1);
      setQuestions(qs);
      if (qs.length > 0 && !activeQId) setActiveQId(qs[0].id);

      const subs = {};
      await Promise.all(qs.map(async (q) => {
         try {
            const qSubs = await api.getSubmissions(1, q.id);
            subs[q.id] = qSubs;
         } catch(e) {}
      }));
      setSubmissions(subs);
      
    } catch (err) {
      if (err.message?.includes('completed') || err.message?.includes('expired')) {
        await refreshProfile();
        navigate('/round/1/result');
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
    const ws = new WebSocket(`ws://${window.location.host}/ws/leaderboard`);
    
    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'config_update') {
          // If Round 1 duration changed, re-fetch round info to update timer
          if (message.data?.key === 'round1_duration') {
            const info = await api.startRound(1).catch(() => null);
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
  
  const filteredQuestions = useMemo(() => {
    if (languageFilter === 'All') return questions;
    return questions.filter(q => q.language === languageFilter);
  }, [questions, languageFilter]);

  const handleOptionSelect = (opt) => {
    if (!currentQ) return;
    setSelectedOptions(prev => ({ ...prev, [currentQ.id]: opt }));
  };

  const handleSubmit = async () => {
    if (!currentQ) return;
    const selected = selectedOptions[currentQ.id];
    if (!selected) return;

    setSubmitting(true);
    try {
      const result = await api.submitMCQ(currentQ.id, { selected_option: selected });
      setSubmissions(prev => {
        const old = prev[currentQ.id] || [];
        return { ...prev, [currentQ.id]: [result, ...old] };
      });
      await refreshProfile(); // Refresh to update round1_questions_solved and round2_unlocked
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    try {
      await api.finishRound(1);
      await refreshProfile();
      navigate('/round/1/result');
    } catch (err) {
      setError(err.message);
    }
  };

  const onTimerExpire = useCallback(async () => {
    await refreshProfile();
    navigate('/round/1/result');
  }, [navigate, refreshProfile]);

  // Derived state for UI
  const qStatus = (qId) => {
    const subs = submissions[qId] || [];
    if (subs.some(s => s.status === 'ACCEPTED')) return 'solved';
    if (subs.length > 0) return 'wrong';
    return 'untouched';
  };

  const getQuestionOptions = (q) => {
    if (!q || !q.options) return {};
    try {
      return JSON.parse(q.options);
    } catch {
      return {};
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /><p className="text-muted">Loading Round 1...</p></div>;
  if (error && !questions.length) return <div className="page-container"><div className="glass-card"><p className="text-red">{error}</p></div></div>;

  const currentOptions = getQuestionOptions(currentQ);
  const currentSubs = submissions[activeQId] || [];
  const hasAttempted = currentSubs.length > 0;
  
  const solvedCount = student?.round1_questions_solved || 0;
  const unlocked = student?.round2_unlocked || solvedCount >= 15;
  const progressPercent = Math.min(100, (solvedCount / 40) * 100);

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(10, 14, 26, 0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>🐛 Round 1</h3>
          <div className="tabs">
            {['All', 'python', 'java', 'c'].map(lang => (
              <button key={lang} className={`tab ${languageFilter === lang ? 'active' : ''}`} onClick={() => setLanguageFilter(lang)} style={{textTransform: 'capitalize'}}>
                {lang}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ flex: 1, margin: '0 2rem', maxWidth: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
            <span>{solvedCount} / 40 Solved {unlocked && <span className="text-cyan">(Round 2 Unlocked)</span>}</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progressPercent}%`, background: 'var(--cyan)', transition: 'width 0.3s' }} />
            {!unlocked && (
              <div style={{ position: 'absolute', top: 0, left: '37.5%', width: '2px', height: '100%', background: 'var(--red)', zIndex: 1 }} />
            )}
          </div>
          {!unlocked && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
              Target: 15 to unlock
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {roundInfo && <Timer endsAt={roundInfo.ends_at} serverTime={roundInfo.server_time} onExpire={onTimerExpire} />}
          <button className="btn btn-danger btn-sm" onClick={() => setShowFinish(true)}>
            Finish Round 1
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Sidebar - Question Grid */}
        <div style={{ width: '300px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(10, 14, 26, 0.5)' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Questions ({filteredQuestions.length})</h4>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {filteredQuestions.map((q, idx) => {
                const status = qStatus(q.id);
                let bg = 'rgba(255,255,255,0.05)';
                let border = '1px solid var(--border-color)';
                let color = 'var(--text-primary)';
                
                if (status === 'solved') {
                  bg = 'rgba(16, 185, 129, 0.2)';
                  border = '1px solid var(--green)';
                  color = 'var(--green)';
                } else if (status === 'wrong') {
                  bg = 'rgba(239, 68, 68, 0.2)';
                  border = '1px solid var(--red)';
                  color = 'var(--red)';
                }

                if (activeQId === q.id) {
                  border = '1px solid var(--cyan)';
                  bg = status === 'untouched' ? 'rgba(6, 182, 212, 0.2)' : bg;
                }

                return (
                  <button 
                    key={q.id} 
                    onClick={() => setActiveQId(q.id)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 'var(--radius-sm)',
                      background: bg,
                      border: border,
                      color: color,
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    {idx + 1}
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
              <div className="problem-panel glass-card-static" style={{ flex: '0 0 50%', overflowY: 'auto', padding: '1.5rem', borderRight: '1px solid var(--border-color)', borderBottom: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0, color: 'var(--cyan)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '1rem', marginRight: '0.5rem' }}>PROBLEM:</span>
                    {currentQ.title}
                  </h2>
                  <div className="badge badge-available">4 pts</div>
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Description / Expected Behavior</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9375rem', margin: 0 }}>
                    {currentQ.description}
                  </p>
                </div>
                
                <div>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Buggy Code Snippet</h4>
                  <Editor
                    height="400px"
                    language={currentQ.language || 'python'}
                    theme="vs-dark"
                    value={currentQ.buggy_code}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </div>

              {/* MCQ Options (Right) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflowY: 'auto' }}>
                <div style={{ padding: '1.5rem', flex: 1 }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Select the correct fix:</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Object.entries(currentOptions).map(([key, text]) => {
                      const isSelected = selectedOptions[currentQ.id] === key;
                      return (
                        <div 
                          key={key}
                          onClick={() => !hasAttempted && handleOptionSelect(key)}
                          style={{
                            padding: '1rem',
                            border: `1px solid ${isSelected ? 'var(--cyan)' : 'var(--border-color)'}`,
                            background: isSelected ? 'rgba(6, 182, 212, 0.1)' : 'rgba(0,0,0,0.2)',
                            borderRadius: 'var(--radius-md)',
                            cursor: hasAttempted ? 'default' : 'pointer',
                            display: 'flex',
                            gap: '1rem',
                            alignItems: 'center',
                            opacity: hasAttempted && !isSelected ? 0.5 : 1,
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ 
                            width: '24px', height: '24px', borderRadius: '50%', 
                            border: `2px solid ${isSelected ? 'var(--cyan)' : 'var(--text-muted)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isSelected ? 'var(--cyan)' : 'transparent',
                            color: isSelected ? '#000' : 'transparent',
                            fontWeight: 'bold', fontSize: '0.75rem'
                          }}>
                            ✓
                          </div>
                          <div>
                            <span style={{ fontWeight: 'bold', marginRight: '0.5rem', color: 'var(--text-muted)' }}>{key}.</span>
                            <span style={{ fontSize: '0.9375rem' }}>{text}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ marginTop: '2rem' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                      onClick={handleSubmit}
                      disabled={!selectedOptions[currentQ.id] || hasAttempted || submitting}
                    >
                      {submitting ? 'Submitting...' : hasAttempted ? '🔒 Attempted' : 'Submit Answer'}
                    </button>
                  </div>

                  {/* Submission History */}
                  {currentSubs.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                      <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Result</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {currentSubs.map((sub, i) => (
                          <div key={sub.id} style={{
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: sub.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${sub.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            fontSize: '0.8125rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong>{sub.status === 'ACCEPTED' ? '✅ Correct' : '❌ Incorrect'}</strong>
                              <span style={{ color: sub.status === 'ACCEPTED' ? 'var(--green)' : 'var(--red)' }}>
                                {sub.status === 'ACCEPTED' ? '+4 pts' : '-1 pts'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a question from the sidebar
          </div>
        )}

      </div>

      {/* Finish Confirmation Modal */}
      {showFinish && (
        <div className="modal-overlay" onClick={() => setShowFinish(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-yellow">⚠️ Finish Round 1?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Are you sure you want to finish Round 1? You cannot return after submission.
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
