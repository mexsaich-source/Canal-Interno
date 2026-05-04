import React, { useState, useEffect } from 'react';
import { FaTrashAlt, FaTimes, FaPlus, FaCloudUploadAlt, FaSignOutAlt, FaTv, FaLock, FaFont } from 'react-icons/fa';
import api from '../../api';
import UploadModal from './UploadModal';
import UserManagementModal from './UserManagementModal';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
    const [categories, setCategories] = useState([]);
    const [uploading, setUploading] = useState(null);
    const [message, setMessage] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);

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
            const token = localStorage.getItem('token');
            const data = await api.getCategories(token);
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

    const handleUploadSubmit = async (category, formData, append) => {
        setUploading(category);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            await api.uploadVideo(category, formData, token, append);
            setMessage({ type: 'success', text: `✅ Contenido de ${category} actualizado!` });
            loadCategories(); // Recargar categorías para ver el nuevo contenido
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: `❌ Error al subir: ${error.response?.data?.error || error.message}` });
        } finally {
            setUploading(null);
            setUploadModalCategory(null);
        }
    };

    const handleResetContent = async (category) => {
        if (window.confirm(`¿Quitar TODO el contenido actual de "${category}"? La pantalla quedará vacía.`)) {
            try {
                const token = localStorage.getItem('token');
                await api.resetScreenContent(category, token);
                setMessage({ type: 'success', text: `✨ Contenido quitado de "${category}".` });
                loadCategories();
            } catch (error) {
                setMessage({ type: 'error', text: `❌ Error al quitar contenido: ${error.message}` });
            }
        }
    };

    const handleDeletePlaylistItem = async (category, publicId) => {
        if (window.confirm('¿Eliminar este elemento específico de la programación?')) {
            try {
                const token = localStorage.getItem('token');
                await api.deletePlaylistItem(category, publicId, token);
                setMessage({ type: 'success', text: `🗑️ Elemento eliminado de la programación de ${category}.` });
                loadCategories();
            } catch (error) {
                setMessage({ type: 'error', text: `❌ Error al eliminar elemento: ${error.response?.data?.error || error.message}` });
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

    const handleEditTexts = async () => {
        try {
            const current = await api.getWelcomeSettings();
            const newTitle = window.prompt("Título de Bienvenida (Ej. HILTON):", current.title);
            if (newTitle === null) return;
            const newSubtitle = window.prompt("Subtítulo (Ej. México City Santa Fe):", current.subtitle);
            if (newSubtitle === null) return;

            const token = localStorage.getItem('token');
            await api.updateWelcomeSettings({ title: newTitle, subtitle: newSubtitle }, token);
            setMessage({ type: 'success', text: '✅ Textos de bienvenida actualizados correctamente.' });
        } catch (error) {
            setMessage({ type: 'error', text: `❌ Error actualizando textos: ${error.message}` });
        }
    };

    const isProtected = (cat) => {
        return ['Inicio', 'HH', 'Room Service', 'Promociones', 'Clientes', '__DEFAULT_IMAGE__', '__GLOBAL_SETTINGS__'].includes(cat);
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header glass">
                <div className="header-info">
                    <h1><FaTv style={{ marginRight: '10px', color: 'var(--accent-color)' }} /> Panel de Gestión</h1>
                    <p>Bienvenido, <strong>{user?.username}</strong> ({user?.role})</p>
                </div>
                <div className="header-buttons">
                    {user?.role === 'admin' && (
                        <>
                            <button onClick={handleEditTexts} className="user-mgmt-btn" style={{ background: '#6c5ce7' }} title="Editar textos por defecto">
                                <FaFont style={{ marginRight: '8px' }} /> Textos
                            </button>
                            <button onClick={() => setShowUserModal(true)} className="user-mgmt-btn">
                                <FaLock style={{ marginRight: '8px' }} /> Usuarios
                            </button>
                        </>
                    )}
                    <button onClick={onLogout} className="logout-btn">
                        <FaSignOutAlt style={{ marginRight: '8px' }} /> Salir
                    </button>
                </div>
            </header>

            <div className="dashboard-content">
                {message && (
                    <div className={`message-alert ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="grid-layout">
                    {categories.map(screen => {
                        const cat = screen.category;
                        if (cat === '__GLOBAL_SETTINGS__') return null; // Ocultamos la categoría técnica de la cuadrícula
                        
                        // Obtener miniatura: primero de la playlist, o video_url principal
                        let previewUrl = screen.video_url;
                        if (screen.playlist && screen.playlist.length > 0) {
                            previewUrl = screen.playlist[0].url;
                        }
                        const isImage = (screen.playlist?.[0]?.type === 'image') || (screen.media_type === 'image');

                        return (
                            <div key={cat} className="card premium-card">
                                {/* Botón X para borrar CATEGORIA (SÓLO ADMIN y NO PROTEGIDA) */}
                                {user?.role === 'admin' && !isProtected(cat) && (
                                    <button
                                        className="screen-delete-btn"
                                        onClick={() => handleDeleteCategory(cat)}
                                        title="Eliminar Pantalla del Canal"
                                    >
                                        <FaTimes />
                                    </button>
                                )}

                                <div className="card-media-preview">
                                    {previewUrl ? (
                                        isImage ? (
                                            <img src={previewUrl.replace('/upload/', '/upload/w_300,c_scale/')} alt={cat} />
                                        ) : (
                                            <video src={previewUrl} muted />
                                        )
                                    ) : (
                                        <div className="card-icon"><FaTv /></div>
                                    )}
                                </div>

                                {screen.playlist && screen.playlist.length > 0 && (
                                    <div className="playlist-items">
                                        {screen.playlist.map((item, idx) => (
                                            <div key={item.public_id || idx} className="playlist-item" title={item.type}>
                                                {item.type === 'image' ? (
                                                    <img src={item.url.replace('/upload/', '/upload/w_100,c_scale/')} alt="thumb" />
                                                ) : (
                                                    <video src={item.url} muted />
                                                )}
                                                {user?.role === 'admin' || canManageCategory(user, cat) ? (
                                                    <button className="playlist-item-delete" onClick={() => handleDeletePlaylistItem(cat, item.public_id)}><FaTimes/></button>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <h3>{cat === '__DEFAULT_IMAGE__' ? 'Imagen por Defecto Global' : cat}</h3>

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
                        );
                    })}

                    {/* TARJETA PARA AGREGAR NUEVA - Solo si es admin o no ha llegado a su límite personal */}
                    {(user?.role === 'admin' || categories.filter(s => s.created_by === user?.id).length < user?.max_screens) && (
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
                    )}
                </div>
            </div>

            {/* MODAL DE GESTIÓN DE USUARIOS */}
            {showUserModal && (
                <UserManagementModal onClose={() => setShowUserModal(false)} />
            )}

            {/* MODAL DE SUBIDA AVANZADA */}
            {uploadModalCategory && (
                <UploadModal
                    category={uploadModalCategory}
                    existingPlaylist={categories.find(c => c.category === uploadModalCategory)?.playlist || []}
                    onClose={() => setUploadModalCategory(null)}
                    onUpload={handleUploadSubmit}
                />
            )}
        </div>
    );
};

export default Dashboard;