import React, { useState } from 'react';
import api from '../../api';
import './Dashboard.css';

const categories = ['Inicio', 'HH', 'Room Service', 'Promociones', 'Clientes'];

const Dashboard = ({ onLogout }) => {
    const [uploading, setUploading] = useState(null);
    const [message, setMessage] = useState(null);

    const handleFileChange = async (category, e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('video', file);
        

        setUploading(category);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            
           
            await api.uploadVideo(category, formData, token);
            

            setMessage({ type: 'success', text: `✅ Video de ${category} actualizado con éxito!` });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: `❌ Error al subir: ${error.response?.data?.error || error.message}` });
        } finally {
            setUploading(null);
            e.target.value = null; 
        }
    };

    const handleDelete = async (category) => {
        alert("⚠️ Función no disponible aún: Para borrar un video, simplemente sube uno nuevo que lo reemplace.");
      
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
                                    {uploading === cat ? '⏳ Subiendo...' : '📤 Subir Video'}
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
                                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                >
                                    Eliminar
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