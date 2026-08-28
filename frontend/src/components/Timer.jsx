import { useState, useEffect, useRef } from 'react';

/**
 * Timer component synced to server end time.
 * @param {Object} props
 * @param {string} props.endsAt - ISO string of when the round ends
 * @param {string} props.serverTime - ISO string of the server time when endsAt was fetched
 * @param {function} props.onExpire - Callback when timer reaches zero
 */
export default function Timer({ endsAt, serverTime, onExpire }) {
  const [remaining, setRemaining] = useState(0);
  const expiredRef = useRef(false);
  const offsetRef = useRef(0);

  useEffect(() => {
    if (!endsAt) return;
    
    // SQLite/Pydantic often drops the 'Z' timezone indicator for naive datetimes.
    // If the string doesn't explicitly contain a timezone, force it to UTC.
    const forceUTC = (dateStr) => {
      if (!dateStr) return 0;
      return new Date(dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z').getTime();
    };

    // Calculate offset immediately when endsAt/serverTime is processed
    if (serverTime) {
      offsetRef.current = forceUTC(serverTime) - Date.now();
    }
    
    const endTime = forceUTC(endsAt);
    
    // If endsAt was extended, reset the expired ref
    if (endTime > Date.now() + offsetRef.current) {
      expiredRef.current = false;
    }

    const tick = () => {
      const now = Date.now() + offsetRef.current;
      const diff = Math.max(0, Math.floor((endTime - now) / 1000));
      setRemaining(diff);

      if (diff <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let timerClass = 'timer-container';
  if (remaining <= 60) timerClass += ' timer-danger';
  else if (remaining <= 300) timerClass += ' timer-warning';

  return (
    <div className={timerClass}>
      <span className="timer-label">Time Remaining</span>
      <span className="timer-value">{display}</span>
    </div>
  );
}
