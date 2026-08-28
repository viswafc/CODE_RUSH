import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function AntiCheatProvider({ children }) {
  const { student, updateStudent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showDisqualified, setShowDisqualified] = useState(false);
  
  // Track visibility state and debounce
  const isAway = useRef(false);
  const lastReturn = useRef(0);

  const handleTabSwitchResponse = (res) => {
    if (res.data) {
      updateStudent(res.data);
      if (res.data.disqualified) {
        setShowDisqualified(true);
        setTimeout(() => {
          setShowDisqualified(false);
          navigate('/disqualified');
        }, 3000);
      } else {
        setWarningCount(res.data.tab_switches);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
      }
    }
  };

  useEffect(() => {
    // Only apply if user is logged in and not on admin pages
    if (!student || location.pathname.startsWith('/admin')) {
      return;
    }

    // 1. Copy/Paste Blocking
    const preventAction = (e, message) => {
      e.preventDefault();
      alert(message);
    };

    const handleCopy = (e) => preventAction(e, "✂️ Copying is disabled during the competition.");
    const handlePaste = (e) => preventAction(e, "📋 Pasting is disabled during the competition.");
    const handleCut = (e) => preventAction(e, "✂️ Cutting is disabled during the competition.");
    const handleContextMenu = (e) => preventAction(e, "🖱️ Context menu is disabled.");
    const handleDragStart = (e) => preventAction(e, "🖱️ Dragging is disabled.");
    const handleKeyDown = (e) => {
      // Prevent Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A (and Cmd variants)
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
        preventAction(e, "⌨️ Clipboard shortcuts are disabled.");
      }
    };

    window.addEventListener('copy', handleCopy);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('cut', handleCut);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('keydown', handleKeyDown);

    // 2. Tab Switch Detection
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        isAway.current = true;
      } else {
        if (isAway.current) {
          isAway.current = false;
          
          // Debounce check (2 seconds) to prevent accidental alt-tab flash counting
          const now = Date.now();
          if (now - lastReturn.current < 2000) {
             lastReturn.current = now;
             return;
          }
          lastReturn.current = now;

          // Only penalize if currently in an active round
          if (student.state === 'ROUND_1_IN_PROGRESS' || student.state === 'ROUND_2_IN_PROGRESS') {
            try {
              // Call API to log switch and apply penalty
              const res = await api.registerTabSwitch();
              handleTabSwitchResponse({ data: res }); // Wrap in data to match the expected format above
            } catch (err) {
              console.error("Failed to register tab switch:", err);
            }
          }
        }
      }
    };

    const handleBlur = () => { isAway.current = true; };
    const handleFocus = () => handleVisibilityChange();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [student, location.pathname, updateStudent, navigate]);

  return (
    <>
      {children}
      {showWarning && !showDisqualified && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--red)',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '4rem', marginBottom: '1rem', textShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }}>⚠️ WARNING</h1>
          <h2 style={{ color: 'white', marginBottom: '2rem' }}>Tab switching is strictly prohibited!</h2>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
            This incident has been recorded.
            <br />
            Total warnings: <strong style={{ color: 'var(--red)' }}>{warningCount}</strong>
            <br /><br />
            {warningCount >= 5 ? "You have been DISQUALIFIED." : "Your final score multiplier has been reduced."}
          </p>
        </div>
      )}

      {showDisqualified && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(239,68,68,0.95)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '5rem', marginBottom: '1rem', textShadow: '0 0 30px rgba(0, 0, 0, 0.5)' }}>🚫</h1>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 'bold' }}>DISQUALIFIED</h1>
          <p style={{ fontSize: '1.5rem' }}>You have exceeded the maximum allowed tab switches (5).</p>
          <p style={{ fontSize: '1.2rem', marginTop: '1rem', opacity: 0.8 }}>Redirecting...</p>
        </div>
      )}
    </>
  );
}
