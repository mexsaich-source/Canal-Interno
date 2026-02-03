import React, { useRef, useEffect, useState } from 'react';
import { FaExpand, FaRedo } from 'react-icons/fa';
import './VideoPlayer.css';
import WelcomeScreen from './WelcomeScreen';
import api from '../api';

const VideoPlayer = ({ category }) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    // Helper para optimizar URLs de Cloudinary
    const optimizeUrl = (url) => {
        if (!url || !url.includes('cloudinary.com')) return url;
        if (url.includes('/upload/')) {
            return url.replace('/upload/', '/upload/q_auto,f_auto/');
        }
        return url;
    };

    // --- LEER CACHÉ INICIAL (DATOS DEL API) ---
    const getInitialCache = () => {
        const cached = localStorage.getItem(`cache_${category}`);
        if (cached) {
            try { return JSON.parse(cached); } catch (e) { return null; }
        }
        return null;
    };

    const initialData = getInitialCache();

    // Estados
    const [videoSrc, setVideoSrc] = useState(initialData ? optimizeUrl(initialData.video_url) : null);
    const [mediaType, setMediaType] = useState(initialData ? initialData.media_type : 'video');
    const [rotation, setRotation] = useState(initialData ? initialData.rotation : 0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // --- NUEVO: LÓGICA DE PERSISTENCIA DE TIEMPO ---
    
    // 1. Al cargar los datos del video (Metadata), recuperamos el tiempo
    const handleVideoLoad = () => {
        const savedTime = localStorage.getItem(`time_${category}`);
        if (savedTime && videoRef.current) {
            const time = parseFloat(savedTime);
            // Solo aplicamos si el tiempo guardado es menor a la duración total (para evitar errores)
            if (time < videoRef.current.duration) {
                videoRef.current.currentTime = time;
            }
        }
    };

    // 2. Mientras el video corre, guardamos el tiempo actual
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            localStorage.setItem(`time_${category}`, videoRef.current.currentTime);
        }
    };

    // ------------------------------------------------

    // Función para buscar video en el servidor
    const checkStatus = async () => {
        try {
            const data = await api.getScreen(category);
            if (data) {
                // Actualizar caché de datos
                localStorage.setItem(`cache_${category}`, JSON.stringify(data));

                if (data.rotation !== rotation) setRotation(data.rotation);
                if (data.media_type && data.media_type !== mediaType) setMediaType(data.media_type);

                const newOptimizedUrl = optimizeUrl(data.video_url || '');
                
                // Si la URL cambia (video nuevo), reseteamos el tiempo guardado para que empiece de 0
                if (newOptimizedUrl !== videoSrc) {
                    setVideoSrc(newOptimizedUrl);
                    if(newOptimizedUrl) {
                        // Borramos el tiempo guardado porque es un video nuevo
                        localStorage.removeItem(`time_${category}`);
                    }
                }
            }
        } catch (err) {
            console.error("Error conectando al servidor:", err);
        }
    };

    // Efecto de carga inicial y polling
    useEffect(() => {
        checkStatus();
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

    // Rotar video
    const handleRotate = async () => {
        const newRot = (rotation + 90) % 360;
        setRotation(newRot);
        try {
            // Nota: Asumiendo que usas tu API URL global o importada
            // Ajusta la URL según tu configuración real
            // await api.updateRotation(category, newRot); <--- Idealmente usa tu instancia 'api'
        } catch (error) {
            console.error("Error guardando rotación:", error);
        }
    };

    const toggleFull = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => console.log(err));
        } else {
            document.exitFullscreen();
        }
    };

    const isVertical = rotation === 90 || rotation === 270;

    const commonStyle = {
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        width: isVertical ? '100vh' : '100%',
        height: isVertical ? '100vw' : '100%',
        position: 'absolute',
        top: '50%',
        left: '50%',
        objectFit: 'contain'
    };

    return (
        <div
            ref={containerRef}
            className={`video-container ${isFullscreen ? 'fullscreen-mode' : ''}`}
            style={{ backgroundColor: '#000', width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}
        >
            {videoSrc ? (
                <div className="video-wrapper">
                    {mediaType === 'image' ? (
                        <img
                            key={videoSrc}
                            src={videoSrc}
                            alt="Pantalla"
                            className="main-video"
                            style={commonStyle}
                        />
                    ) : (
                        <video
                            key={videoSrc}
                            ref={videoRef}
                            src={videoSrc}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="main-video"
                            style={commonStyle}
                            // --- AGREGAMOS LOS EVENTOS AQUÍ ---
                            onLoadedMetadata={handleVideoLoad} // Recupera el tiempo al cargar
                            onTimeUpdate={handleTimeUpdate}    // Guarda el tiempo al reproducir
                            // ----------------------------------
                        />
                    )}
                </div>
            ) : (
                <WelcomeScreen persistent={true} />
            )}

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