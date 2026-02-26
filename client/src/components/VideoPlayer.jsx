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

    // --- PERSISTENCIA DE TIEMPO (VIDEO) ---
    const handleVideoLoad = () => {
        const savedTime = localStorage.getItem(`time_${category}`);
        if (savedTime && videoRef.current) {
            const time = parseFloat(savedTime);
            if (time < videoRef.current.duration) {
                videoRef.current.currentTime = time;
            }
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            localStorage.setItem(`time_${category}`, videoRef.current.currentTime);
        }
    };
    // --------------------------------------

    // Función para buscar datos en el servidor
    const checkStatus = async () => {
        try {
            const data = await api.getScreen(category);
            if (data) {
                // Actualizar caché COMPLETA
                localStorage.setItem(`cache_${category}`, JSON.stringify(data));

                // Solo actualizamos rotación si viene diferente del servidor
                // (Esto es seguridad, pero nuestra función manual handleRotate ya lo habrá hecho)
                if (data.rotation !== rotation) setRotation(data.rotation);

                if (data.media_type && data.media_type !== mediaType) setMediaType(data.media_type);

                const newOptimizedUrl = optimizeUrl(data.video_url || '');
                if (newOptimizedUrl !== videoSrc) {
                    setVideoSrc(newOptimizedUrl);
                    if (newOptimizedUrl) {
                        localStorage.removeItem(`time_${category}`);
                    }
                }
            }
        } catch (err) {
            console.error("Error conectando al servidor:", err);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [category]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // --- CAMBIO CLAVE AQUÍ ---
    const handleRotate = async () => {
        const newRot = (rotation + 90) % 360;

        // 1. Actualizar estado visual inmediatamente
        setRotation(newRot);

        // 2. ACTUALIZAR LOCALSTORAGE MANUALMENTE (Para persistencia al refrescar)
        // Obtenemos lo que ya hay en caché, le cambiamos la rotación y lo guardamos de nuevo.
        const currentCache = localStorage.getItem(`cache_${category}`);
        if (currentCache) {
            try {
                const parsedCache = JSON.parse(currentCache);
                parsedCache.rotation = newRot; // Sobreescribimos la rotación
                localStorage.setItem(`cache_${category}`, JSON.stringify(parsedCache));
            } catch (e) {
                console.error("Error actualizando cache local de rotación", e);
            }
        }

        // 3. Enviar al servidor (en segundo plano)
        try {
            // Asegúrate de que esta URL sea la correcta para tu backend
            // Si usas la instancia 'api', sería algo como: await api.updateRotation(category, newRot);
            // Aquí dejo un fetch genérico basado en tu código anterior:
            /* await fetch(`${process.env.REACT_APP_API_URL}/api/rotation/${category}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rotation: newRot })
            });
            */
            // O si tienes el método en api.js:
            if (api.updateRotation) {
                await api.updateRotation(category, newRot);
            }
        } catch (error) {
            console.error("Error guardando rotación en servidor:", error);
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
                            onLoadedMetadata={handleVideoLoad}
                            onTimeUpdate={handleTimeUpdate}
                            onError={(e) => console.error("Error cargando video:", e)}
                            preload="auto"
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