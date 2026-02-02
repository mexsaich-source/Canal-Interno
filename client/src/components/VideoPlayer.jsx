import React, { useRef, useEffect, useState } from 'react';
import { FaExpand, FaRedo } from 'react-icons/fa';
import './VideoPlayer.css';
import WelcomeScreen from './WelcomeScreen'; // Importamos la pantalla de Hilton

const API_URL = (import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : 'http://localhost:5000';

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

    // Función interna para leer caché sincrónicamente
    const getInitialCache = () => {
        const cached = localStorage.getItem(`cache_${category}`);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                return null;
            }
        }
        return null;
    };

    const initialData = getInitialCache();

    // Estados inicializados con caché si existe
    const [videoSrc, setVideoSrc] = useState(initialData ? optimizeUrl(initialData.video_url) : null);
    const [mediaType, setMediaType] = useState(initialData ? initialData.media_type : 'video');
    const [rotation, setRotation] = useState(initialData ? initialData.rotation : 0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Estado NUEVO: Controla la pantalla de bienvenida
    const [showWelcome, setShowWelcome] = useState(true);

    // Función para buscar video en el servidor
    const checkStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/api/screen/${category}`);
            if (res.ok) {
                const data = await res.json();

                // Actualizar caché
                localStorage.setItem(`cache_${category}`, JSON.stringify(data));

                // Actualizamos rotación si cambió
                if (data.rotation !== rotation) {
                    setRotation(data.rotation);
                }

                // Actualizamos tipo de medio
                if (data.media_type && data.media_type !== mediaType) {
                    setMediaType(data.media_type);
                }

                // Actualizamos URL si es diferente (aplicando optimización)
                const newOptimizedUrl = optimizeUrl(data.video_url);
                if (data.video_url && newOptimizedUrl !== videoSrc) {
                    console.log(`[VideoPlayer] Nuevo contenido para ${category}:`, newOptimizedUrl);
                    setVideoSrc(newOptimizedUrl);
                }
            } else {
                console.log("No hay contenido asignado o error en servidor");
            }
        } catch (err) {
            console.error("Error conectando al servidor:", err);
            // No hacemos nada, mantenemos el caché o lo que ya estaba
        }
    };

    // Efecto de carga inicial y polling (revisión cada 5 seg)
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

    const commonStyle = {
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        width: isVertical ? '100vh' : '100%',
        height: isVertical ? '100vw' : '100%',
        position: 'absolute',
        top: '50%',
        left: '50%',
        objectFit: 'contain' // Mantener proporción sin cortes
    };

    return (
        <div
            ref={containerRef}
            className={`video-container ${isFullscreen ? 'fullscreen-mode' : ''}`}
            style={{ backgroundColor: '#000', width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}
        >
            {/* 1. PANTALLA DE BIENVENIDA (HILTON) */}
            {showWelcome && (
                <WelcomeScreen onFinish={() => setShowWelcome(false)} />
            )}

            {/* 2. REPRODUCTOR (VIDEO O IMAGEN) */}
            {videoSrc ? (
                <div className="video-wrapper">
                    {mediaType === 'image' ? (
                        <img
                            src={videoSrc}
                            alt="Pantalla"
                            className="main-video" // Reusamos clase para CSS base
                            style={commonStyle}
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="main-video"
                            style={commonStyle}
                        />
                    )}
                </div>
            ) : (
                // 3. PANTALLA DE ESPERA (Placeholder Animado Hilton)
                !showWelcome && (
                    <WelcomeScreen persistent={true} />
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