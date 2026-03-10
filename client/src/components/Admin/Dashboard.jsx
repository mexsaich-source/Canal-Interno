import React, { useState, useEffect } from 'react';
import { FaTrashAlt, FaTimes, FaPlus, FaCloudUploadAlt, FaSignOutAlt, FaTv } from 'react-icons/fa';
import api from '../../api';
import UploadModal from './UploadModal';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
    const [categories, setCategories] = useState([]);
    const [uploading, setUploading] = useState(null);
    const [message, setMessage] = useState(null);

    // Estado para nueva categoría
    const [newCategory, setNewCategory] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    
    // Estado para el modal de subida
    const [uploadModalCategory, setUploadModalCategory] = useState(null);

    // Cargar categorías al inicio
    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await api.getCategories();
            setCategories(data);
        } catch (error) {
            console.error("Error cargando categorías:", error);
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;

        setIsCreating(true);
        try {
            const token = localStorage.getItem('token');
            await api.createCategory(newCategory, token);
            setMessage({ type: 'success', text: `✅ Pantalla "${newCategory}" creada!` });
            setNewCategory('');
            loadCategories(); // Recargar lista
        } catch (error) {
            setMessage({ type: 'error', text: `❌ Error creando: ${error.response?.data?.error || error.message}` });
        } finally {
            setIsCreating(false);
        }
    };

    const handleUploadSubmit = async (category, formData) => {
        setUploading(category);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            await api.uploadVideo(category, formData, token);
            setMessage({ type: 'success', text: `✅ Contenido de ${category} actualizado!` });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: `❌ Error al subir: ${error.response?.data?.error || error.message}` });
        } finally {
            setUploading(null);
            setUploadModalCategory(null);
        }
    };

    const handleResetContent = async (category) => {
        if (window.confirm(`¿Quitar el video/imagen actual de "${category}"? La pantalla quedará vacía.`)) {
            try {
                const token = localStorage.getItem('token');
                await api.resetScreenContent(category, token);
                setMessage({ type: 'success', text: `✨ Contenido quitado de "${category}".` });
            } catch (error) {
                setMessage({ type: 'error', text: `❌ Error al quitar contenido: ${error.message}` });
            }
        }
    };

    const handleDeleteCategory = async (category) => {
        const defaultCategories = ['Inicio', 'HH', 'Room Service', 'Promociones', 'Clientes'];
        if (defaultCategories.includes(category)) {
            alert("No se pueden eliminar las pantallas básicas del sistema.");
            return;
        }

        if (window.confirm(`⚠️ ¿ELIMINAR COMPLETAMENTE la pantalla "${category}"? Se borrará del menú y de la base de datos.`)) {
            try {
                const token = localStorage.getItem('token');
                await api.deleteCategory(category, token);
                setMessage({ type: 'success', text: `🗑️ Pantalla "${category}" eliminada.` });
                loadCategories();
            } catch (error) {
                setMessage({ type: 'error', text: `❌ Error al eliminar: ${error.response?.data?.error || error.message}` });
            }
        }
    };

    const isProtected = (cat) => {
        return ['Inicio', 'HH', 'Room Service', 'Promociones', 'Clientes'].includes(cat);
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header glass">
                <div className="header-info">
                    <h1><FaTv style={{ marginRight: '10px', color: 'var(--accent-color)' }} /> Panel de Gestión</h1>
                    <p>Administra el contenido de cada pantalla</p>
                </div>
                <button onClick={onLogout} className="logout-btn">
                    <FaSignOutAlt style={{ marginRight: '8px' }} /> Salir
                </button>
            </header>

            <div className="dashboard-content">
                {message && (
                    <div className={`message-alert ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="grid-layout">
                    {categories.map(cat => (
                        <div key={cat} className="card premium-card">
                            {/* Botón X para borrar CATEGORIA (SÓLO SI NO ES PROTEGIDA) */}
                            {!isProtected(cat) && (
                                <button
                                    className="screen-delete-btn"
                                    onClick={() => handleDeleteCategory(cat)}
                                    title="Eliminar Pantalla del Canal"
                                >
                                    <FaTimes />
                                </button>
                            )}

                            <div className="card-icon"><FaTv /></div>
                            <h3>{cat}</h3>

                            <div className="card-actions">
                                <button
                                    className="action-btn upload-action"
                                    onClick={() => setUploadModalCategory(cat)}
                                    disabled={uploading === cat}
                                >
                                    {uploading === cat ? <>⏳...</> : <><FaCloudUploadAlt /> Subir</>}
                                </button>

                                <button
                                    className="action-btn reset-action"
                                    onClick={() => handleResetContent(cat)}
                                    title="Quitar video/imagen actual"
                                >
                                    <FaTrashAlt /> Quitar
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* TARJETA PARA AGREGAR NUEVA */}
                    <div className="card add-card">
                        <div className="card-icon"><FaPlus /></div>
                        <h3>Nueva Pantalla</h3>
                        <form onSubmit={handleCreateCategory} className="add-screen-form">
                            <input
                                type="text"
                                placeholder="..."
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                            />
                            <button type="submit" disabled={isCreating || !newCategory}>
                                {isCreating ? '...' : <FaPlus />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* MODAL DE SUBIDA AVANZADA */}
            {uploadModalCategory && (
                <UploadModal
                    category={uploadModalCategory}
                    onClose={() => setUploadModalCategory(null)}
                    onUpload={handleUploadSubmit}
                />
            )}
        </div>
    );
};

export default Dashboard;