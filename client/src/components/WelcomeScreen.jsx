import React from 'react';

const WelcomeScreen = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999, 
      color: 'white'
    }}>
      <h1 style={{ 
        fontSize: '5rem', 
        fontFamily: 'serif', 
        letterSpacing: '8px',
        marginBottom: '20px',
        textTransform: 'uppercase'
      }}>
        HILTON
      </h1>
      
      <p style={{ letterSpacing: '3px', fontSize: '1.2rem', color: '#888' }}>
        México City Santa fe
      </p>

      <div style={{ 
        marginTop: '40px', 
        width: '100px', 
        height: '2px', 
        background: 'linear-gradient(90deg, transparent, #fff, transparent)' 
      }}></div>
    </div>
  );
};

export default WelcomeScreen;