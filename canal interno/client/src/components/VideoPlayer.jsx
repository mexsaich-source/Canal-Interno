import React, { useRef, useEffect, useState } from 'react';
import api from '../api';
import { FaCompress, FaExpand } from 'react-icons/fa';
import './VideoPlayer.css';

const VideoPlayer = ({ category }) => {
    const videoRef = useRef(null);
    const [videoSrc, setVideoSrc] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVideo = async () => {
            setError(null);
            // Map route paths to DB categories if necessary, or ensure they match
            // Category passed here should match DB enum
            const data = await api.getVideo(category);
            if (data && data.filename) {
                // Determine current timestamp to force refresh
                const timestamp = new Date().getTime();
                setVideoSrc(`http://localhost:5000/uploads/${data.filename}?t=${timestamp}`);
            } else {
                setVideoSrc(null); // Or default video
                setError("No hay video para esta sección");
            }
        };

        fetchVideo();
    }, [category]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            videoRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [])

    return (
        <div className="video-container">
            {videoSrc ? (
                <video
                    ref={videoRef}
                    className="main-video"
                    src={videoSrc}
                    autoPlay
                    loop
                    muted // browser policy often requires muted for autoplay, but user might want audio. We'll start muted or let user unmute.
                    controls={false} // Custom controls if needed, or hide them for TV feel
                />
            ) : (
                <div className="video-placeholder">
                    <h2>{error ? error : "Loading..."}</h2>
                </div>
            )}

            {videoSrc && (
                <button className="fullscreen-toggle" onClick={toggleFullscreen}>
                    {isFullscreen ? <FaCompress /> : <FaExpand />}
                </button>
            )}
        </div>
    );
};

export default VideoPlayer;
