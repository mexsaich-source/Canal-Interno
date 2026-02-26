import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';

// --- IMPORTS DE TUS COMPONENTES ---
import Sidebar from './components/Sidebar';
import VideoPlayer from './components/VideoPlayer';
import LoginModal from './components/Admin/LoginModal';
import Dashboard from './components/Admin/Dashboard';
import WelcomeScreen from './components/WelcomeScreen';

// Wrapper para leer parámetros de URL (ej: /screen/Restaurante)
const ScreenWrapper = () => {
  const { category } = useParams();
  return <VideoPlayer category={decodeURIComponent(category)} />;
};

const InnerApp = () => {
  // --- ESTADOS ---
  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem('token'));
  const [showSidebar, setShowSidebar] = useState(false); // Controla si se ve el menú lateral

  const navigate = useNavigate();
  const location = useLocation();

  // --- 1. COMANDO SECRETO (Ctrl + b) PARA MOSTRAR BARRA ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
        setShowSidebar(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- 2. VERIFICAR SESIÓN ADMIN ---
  // --- 2. VERIFICAR SESIÓN ---
  // Eliminamos el efecto que cerraba sesión al navegar fuera de /admin, ya que
  // rompía la redirección post-login.

  // --- HANDLERS (Funciones) ---

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
    navigate('/inicio'); // Te saca al inicio
  }

  // Esta es la función que activa el candado
  const handleAdminClick = () => {
    if (isAdmin) {
      navigate('/admin'); // Si ya eres admin, entra directo
    } else {
      setShowLogin(true); // Si no, muestra el modal
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

      {/* --- A. SIDEBAR FLOTANTE --- */}
      {/* Solo se renderiza si showSidebar es true (Ctrl + b) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: showSidebar ? 0 : '-300px', // Animación simple o ocultamiento
        height: '100%',
        zIndex: 20000, // ¡MUY IMPORTANTE! Encima de todo
        transition: 'left 0.3s ease',
        display: showSidebar ? 'block' : 'none' // Ocultar del DOM si no se usa
      }}>
        {/* Aquí pasamos la función al componente hijo */}
        <Sidebar onAdminClick={handleAdminClick} />
      </div>

      {/* --- B. ÁREA DE CONTENIDO (VIDEOS / WELCOME) --- */}
      <div className="content-area" style={{ width: '100%', height: '100%' }}>
        <Routes>
          {/* 1. Ruta Raíz: Pantalla Hilton Infinita */}
          <Route path="/" element={<WelcomeScreen />} />

          {/* 2. Rutas de Canales Específicos */}
          <Route path="/inicio" element={<VideoPlayer category="Inicio" />} />
          <Route path="/hh" element={<VideoPlayer category="HH" />} />
          <Route path="/service-room" element={<VideoPlayer category="Room Service" />} />
          <Route path="/promociones" element={<VideoPlayer category="Promociones" />} />
          <Route path="/clientes" element={<VideoPlayer category="Clientes" />} />

          {/* 3. Ruta Dinámica (por si usas QR o enlaces externos) */}
          <Route path="/screen/:category" element={<ScreenWrapper />} />

          {/* 4. Ruta Protegida de Admin */}
          <Route
            path="/admin"
            element={isAdmin ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/" />}
          />
        </Routes>
      </div>

      {/* --- C. MODAL DE LOGIN (FLOTANTE) --- */}
      {showLogin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 30000, // EL MÁS ALTO DE TODOS
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.6)' // Fondo oscuro semitransparente
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