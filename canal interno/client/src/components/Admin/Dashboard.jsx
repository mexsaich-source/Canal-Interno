import React, { useState } from 'react';
import api from '../../api';
import './Dashboard.css';

const categories = ['Inicio', 'HH', 'Service Room', 'Promociones', 'Clientes'];

const Dashboard = ({ onLogout }) => {
    const [uploading, setUploading] = useState(null);
    const [message, setMessage] = useState(null);

    const handleFileChange = async (category, e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('video', file);
        formData.append('category', category);

        setUploading(category);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            await api.uploadVideo(formData, token);
            setMessage({ type: 'success', text: `Video for ${category} updated!` });
        } catch (error) {
            setMessage({ type: 'error', text: `Failed to upload: ${error.response?.data?.error || error.message}` });
        } finally {
            setUploading(null);
            // clear input
            e.target.value = null;
        }
    };

    const handleDelete = async (category) => {
        if (!window.confirm(`Are you sure you want to delete the video for ${category}?`)) return;

        try {
            const token = localStorage.getItem('token');
            await api.deleteVideo(category, token);
            setMessage({ type: 'success', text: `Video for ${category} deleted` });
        } catch (error) {
            setMessage({ type: 'error', text: `Failed to delete: ${error.response?.data?.error || error.message}` });
        }
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header glass">
                <h1>Panel de Administración</h1>
                <button onClick={onLogout} className="logout-btn">Cerrar Sesión</button>
            </header>

            <div className="dashboard-content">
                {message && (
                    <div className={`message-alert ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="grid-layout">
                    {categories.map(cat => (
                        <div key={cat} className="card glass">
                            <h3>{cat}</h3>
                            <div className="card-actions">
                                <label className="upload-btn">
                                    {uploading === cat ? 'Subiendo...' : 'Subir Nuevo Video'}
                                    <input
                                        type="file"
                                        accept="video/mp4,video/webm"
                                        hidden
                                        onChange={(e) => handleFileChange(cat, e)}
                                        disabled={uploading === cat}
                                    />
                                </label>
                                <button
                                    className="delete-btn"
                                    onClick={() => handleDelete(cat)}
                                >
                                    Eliminar Video
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
