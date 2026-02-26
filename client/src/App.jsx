import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';

// --- IMPORTS DE TUS COMPONENTES ---
import Sidebar from './components/Sidebar';
import VideoPlayer from './components/VideoPlayer';
import LoginModal from './components/Admin/LoginModal';
import Dashboard from './components/Admin/Dashboard';

// Wrapper para leer parámetros de URL
const ScreenWrapper = () => {
  const { category } = useParams();
  const decodedCategory = decodeURIComponent(category);
  return <VideoPlayer key={decodedCategory} category={decodedCategory} />;
};

const InnerApp = () => {
  // --- ESTADOS ---
  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem('token'));
  const [showSidebar, setShowSidebar] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // --- LÓGICA GESTOS MÓVIL (ZONA INVISIBLE) ---
  const lastTapRef = useRef(0);
  const tapCountRef = useRef(0);

  const handleSecretCornerTap = () => {
    const now = Date.now();
    // Si pasan más de 400ms entre toques, reiniciamos el contador
    if (now - lastTapRef.current > 400) {
      tapCountRef.current = 0;
    }

    lastTapRef.current = now;
    tapCountRef.current += 1;

    // AL 3er TOQUE: Alternar Sidebar
    if (tapCountRef.current >= 3) {
      setShowSidebar(prev => !prev);
      tapCountRef.current = 0; // Resetear
    }
  };
  // ---------------------------------------------

  // --- 1. COMANDO TECLADO (Ctrl + b) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
        setShowSidebar(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- 2. VERIFICAR SESIÓN ---
  // El auto-logout al navegar fuera de /admin causaba problemas con la redirección.
  // Ahora manejamos el acceso solo mediante la protección de rutas en el render.

  // --- HANDLERS ---
  const handleLoginSuccess = (token) => {
    localStorage.setItem('token', token);
    setIsAdmin(true);
    setShowLogin(false);
    setShowSidebar(true);
    navigate('/admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAdmin(false);
    navigate('/inicio');
  }

  const handleAdminClick = () => {
    if (isAdmin) {
      navigate('/admin');
    } else {
      setShowLogin(true);
    }
  };

  return (
    <div className="app-container" style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#000'
    }}>

      {/* --- A. ZONA DE ACTIVACIÓN TÁCTIL (INVISIBLE) --- */}
      {/* Esto permite abrir el menú en móvil tocando 3 veces la esquina superior izq */}
      <div
        onClick={handleSecretCornerTap}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100px',  // Zona de 100x100 pixeles
          height: '100px',
          zIndex: 19000,   // Debajo del Sidebar (20000) pero encima del video
          cursor: 'default', // Para no mostrar manita en PC
          background: 'transparent'
        }}
      />

      {/* --- B. SIDEBAR FLOTANTE --- */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: showSidebar ? 0 : '-300px',
        height: '100%',
        zIndex: 20000, // Cubre la zona táctil cuando está abierto
        transition: 'left 0.3s ease',
        display: 'block' // Siempre en DOM para la animación
      }}>
        <Sidebar onAdminClick={handleAdminClick} />
      </div>

      {/* --- C. ÁREA DE CONTENIDO (VIDEOS) --- */}
      <div className="content-area" style={{ width: '100%', height: '100%' }}>
        <Routes>
          {/* CORREGIDO: Redirigir la raíz ("/") a "/inicio" y quitar WelcomeScreen */}
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="/inicio" element={<VideoPlayer key="Inicio" category="Inicio" />} />
          <Route path="/hh" element={<VideoPlayer key="HH" category="HH" />} />
          <Route path="/service-room" element={<VideoPlayer key="Room Service" category="Room Service" />} />
          <Route path="/promociones" element={<VideoPlayer key="Promociones" category="Promociones" />} />
          <Route path="/clientes" element={<VideoPlayer key="Clientes" category="Clientes" />} />
          <Route path="/screen/:category" element={<ScreenWrapper />} />

          <Route
            path="/admin"
            element={isAdmin ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/inicio" />}
          />
        </Routes>
      </div>

      {/* --- D. MODAL DE LOGIN --- */}
      {showLogin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 30000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.6)'
        }}>
          <LoginModal
            onClose={() => setShowLogin(false)}
            onLogin={handleLoginSuccess}
          />
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <InnerApp />
    </Router>
  );
}

export default App;