import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function QuestionManager() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRound, setFilterRound] = useState('');
  
  // Minimal view, editing features would require complex forms. 
  // We'll just display them for now based on the prompt scope.

  useEffect(() => {
    fetchQuestions();
  }, [filterRound]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminQuestions(filterRound || null);
      setQuestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Questions</h2>
          <p className="text-secondary">View question bank</p>
        </div>
        <select className="input-field" style={{ width: 'auto' }} value={filterRound} onChange={e => setFilterRound(e.target.value)}>
          <option value="">All Rounds</option>
          <option value="1">Round 1</option>
          <option value="2">Round 2</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : (
        <div className="grid-2">
          {questions.map(q => (
            <div key={q.id} className="glass-card-static" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ color: 'var(--cyan)' }}>{q.title}</h3>
                <span className={`badge ${q.round_number === 1 ? 'badge-in-progress' : 'badge-purple'}`} style={{ backgroundColor: q.round_number === 2 ? 'rgba(139, 92, 246, 0.15)' : undefined, borderColor: q.round_number === 2 ? 'rgba(139, 92, 246, 0.3)' : undefined, color: q.round_number === 2 ? 'var(--purple)' : undefined }}>
                  Round {q.round_number}
                </span>
              </div>
              
              <p className="text-secondary" style={{ fontSize: '0.875rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {q.description}
              </p>
              
              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span className="text-muted">Points: <span className="text-primary">{q.points}</span></span>
                <span className="text-muted">Test Cases: <span className="text-primary">{q.test_cases?.length || 0}</span></span>
              </div>
            </div>
          ))}
          {questions.length === 0 && (
            <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
              <p className="text-muted">No questions found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
