import React, { useRef, useEffect, useState } from 'react';
import { FaExpand, FaRedo } from 'react-icons/fa';
import './VideoPlayer.css';
import WelcomeScreen from './WelcomeScreen'; // Importamos la pantalla de Hilton

const API_URL = import.meta.env.VITE_API_URL;

const VideoPlayer = ({ category }) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    
    // Estados
    const [videoSrc, setVideoSrc] = useState(null);
    const [rotation, setRotation] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Estado NUEVO: Controla la pantalla de bienvenida
    const [showWelcome, setShowWelcome] = useState(true); 

    // Función para buscar video en el servidor
    const checkStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/api/screen/${category}`);
            if (res.ok) {
                const data = await res.json();
                
                // Actualizamos rotación si cambió
                if (data.rotation !== rotation) {
                    setRotation(data.rotation);
                }
                
                // Actualizamos video si es diferente al actual
                if (data.video_url && data.video_url !== videoSrc) {
                    setVideoSrc(data.video_url);
                }
            } else {
                // Si el servidor dice que no hay video, no borramos el actual de inmediato
                // para evitar pantallazo negro, a menos que sea explícito.
                console.log("No hay video asignado o error en servidor");
            }
        } catch (err) {
            console.error("Error conectando al servidor:", err);
        }
    };

    // Efecto de carga inicial y polling (revisión cada 5 seg)
    useEffect(() => {
        checkStatus(); // Primera revisión inmediata
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [category]);

    // Detector de pantalla completa
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Función para rotar video manualmente y guardar en BD
    const handleRotate = async () => {
        const newRot = (rotation + 90) % 360;
        setRotation(newRot);
        try {
            await fetch(`${API_URL}/api/rotation/${category}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rotation: newRot })
            });
        } catch (error) {
            console.error("Error guardando rotación:", error);
        }
    };

    // Función pantalla completa
    const toggleFull = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.log("Error al entrar en pantalla completa:", err);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const isVertical = rotation === 90 || rotation === 270;

    return (
        <div 
            ref={containerRef}
            className={`video-container ${isFullscreen ? 'fullscreen-mode' : ''}`}
        >
            {/* 1. PANTALLA DE BIENVENIDA (HILTON) */}
            {/* Se muestra al inicio (showWelcome=true). Al terminar su timer, llama a setShowWelcome(false) */}
            {showWelcome && (
                <WelcomeScreen onFinish={() => setShowWelcome(false)} />
            )}

            {/* 2. EL REPRODUCTOR DE VIDEO */}
            {videoSrc ? (
                <div className="video-wrapper">
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="main-video"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            // Ajuste dinámico para videos verticales
                            width: isVertical ? '100vh' : '100%',
                            height: isVertical ? '100vw' : '100%',
                            // Ajuste de posición para que al rotar no se descuadre
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            translate: '-50% -50%',
                            objectFit: 'cover'
                        }}
                    />
                </div>
            ) : (
                // 3. PANTALLA DE ESPERA (Si ya pasó el welcome pero no hay video)
                !showWelcome && (
                    <div className="video-placeholder">
                        <h2>Esperando señal...</h2>
                        <div className="spinner"></div> {/* Puedes agregar un spinner CSS aquí */}
                    </div>
                )
            )}

            {/* 4. CONTROLES (Visibles solo si mueves el mouse o tocas, según tu CSS) */}
            <div className="controls-overlay" style={{ zIndex: 1000 }}>
                <button className="control-btn" onClick={handleRotate} title="Rotar">
                    <FaRedo />
                </button>
                <button className="control-btn" onClick={toggleFull} title="Pantalla Completa">
                    <FaExpand />
                </button>
            </div>
        </div>
    );
};

export default VideoPlayer;