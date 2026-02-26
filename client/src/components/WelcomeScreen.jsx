import React, { useEffect } from 'react';
import './WelcomeScreen.css';

const WelcomeScreen = ({ onFinish, persistent = false }) => {
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
    </div>
  );
};

export default WelcomeScreen;