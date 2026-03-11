import React, { useState, useEffect } from 'react';
import './WelcomeScreen.css';

const WelcomeScreen = ({ onFinish, persistent = false, showClock = false }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (!showClock) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [showClock]);

  useEffect(() => {
    if (persistent) return; // No auto-cerrar si es placeholder

    const timer = setTimeout(() => {
      onFinish && onFinish();
    }, 5000); // 5 segundos de Hilton
    return () => clearTimeout(timer);
  }, [onFinish, persistent]);

  return (
    <div className={`welcome-overlay ${persistent ? 'placeholder' : ''}`}>
      <h1 className="welcome-title">HILTON</h1>
      <p className="welcome-subtitle">México City Santa Fe</p>
      <div className="welcome-line"></div>

      {showClock && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '30px',
          color: 'white',
          fontSize: '2rem',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          fontFamily: 'monospace',
          zIndex: 100
        }}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          <div style={{ fontSize: '1.2rem', textAlign: 'right', marginTop: '-5px' }}>
            {time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;