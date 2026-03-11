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

    // Parse Initial Playlist
    let initialPlaylist = [];
    if (initialData?.playlist && initialData.playlist.length > 0) {
        initialPlaylist = initialData.playlist;
    } else if (initialData?.video_url) {
        initialPlaylist = [{ url: initialData.video_url, type: initialData.media_type, hasAudio: false }];
    }

    // Estados
    const [playlist, setPlaylist] = useState(initialPlaylist);
    const [activePlaylist, setActivePlaylist] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [rotation, setRotation] = useState(initialData?.rotation || 0);
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

                // Asegurar rotación
                if (data.rotation !== rotation) setRotation(data.rotation);

                let newPlaylist = [];
                if (data.playlist && data.playlist.length > 0) {
                    newPlaylist = data.playlist;
                } else if (data.video_url) {
                    newPlaylist = [{ url: data.video_url, type: data.media_type, hasAudio: false }];
                }
                
                // Si la playlist cambió, la actualizamos y reiniciamos
                if (JSON.stringify(newPlaylist) !== JSON.stringify(playlist)) {
                    setPlaylist(newPlaylist);
                    setCurrentIndex(0);
                    localStorage.removeItem(`time_${category}`);
                }
            }
        } catch (err) {
            console.error("Error conectando al servidor:", err);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 5000); // 5s poll para ver cambios inmediatos
        return () => clearInterval(interval);
    }, [category]);

    // LÓGICA DE HORARIOS / SCHEDULING
    useEffect(() => {
        const updateActive = () => {
            const now = new Date();
            const filtered = playlist.filter(item => {
                if (item.scheduleStart && new Date(item.scheduleStart) > now) return false;
                if (item.scheduleEnd && new Date(item.scheduleEnd) < now) return false;
                return true;
            });
            
            setActivePlaylist(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(filtered)) {
                    setCurrentIndex(0); // Reiniciar al inicio cuando cambia la cartelera activa
                    return filtered;
                }
                return prev;
            });
        };
        updateActive();
        const interval = setInterval(updateActive, 10000); // Chequear cada 10s si un evento empezó o terminó
        return () => clearInterval(interval);
    }, [playlist]);

    const currentMedia = activePlaylist.length > 0 ? activePlaylist[currentIndex % activePlaylist.length] : null;
    const isImage = currentMedia?.type === 'image';
    const isSingleVideo = !isImage && activePlaylist.length === 1;

    // LÓGICA DE PRESENTACIÓN / SLIDESHOW PARA IMÁGENES
    useEffect(() => {
        if (!currentMedia || !isImage || activePlaylist.length <= 1) return;

        const timer = setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % activePlaylist.length);
        }, 8000); // 8 segundos por imagen
        
        return () => clearTimeout(timer);
    }, [currentIndex, currentMedia, isImage, activePlaylist.length]);

    // Calcular si se debe mostrar el reloj (basado en el primer elemento de la playlist original cuando todo expira)
    const shouldShowClock = playlist.length > 0 && playlist[0].showClock === true;

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
            {currentMedia ? (
                <div className="video-wrapper">
                    {isImage ? (
                        <img
                            key={currentMedia.public_id || optimizeUrl(currentMedia.url)}
                            src={optimizeUrl(currentMedia.url)}
                            alt="Pantalla"
                            className="main-video fade-in-slide"
                            style={commonStyle}
                        />
                    ) : (
                        <video
                            key={currentMedia.public_id || optimizeUrl(currentMedia.url)}
                            ref={videoRef}
                            src={optimizeUrl(currentMedia.url)}
                            autoPlay
                            loop={isSingleVideo}
                            muted={!currentMedia.hasAudio}
                            playsInline
                            className="main-video fade-in-slide"
                            style={commonStyle}
                            onLoadedMetadata={handleVideoLoad}
                            onTimeUpdate={handleTimeUpdate}
                            onEnded={!isSingleVideo ? () => setCurrentIndex(prev => (prev + 1) % activePlaylist.length) : undefined}
                            onError={(e) => console.error("Error cargando video:", e)}
                            preload="auto"
                        />
                    )}
                </div>
            ) : (
                <WelcomeScreen persistent={true} showClock={shouldShowClock} />
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