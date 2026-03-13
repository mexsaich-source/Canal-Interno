import React, { useState, useEffect } from 'react';
import { FaTrashAlt, FaTimes, FaUserPlus, FaLock, FaCheckSquare, FaSquare } from 'react-icons/fa';
import api from '../../api';
import './UserManagementModal.css';

const UserManagementModal = ({ onClose }) => {
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);

    // Form states
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState(''); // Opcional en edición
    const [role, setRole] = useState('editor');
    const [allowedScreens, setAllowedScreens] = useState([]);
    const [maxScreens, setMaxScreens] = useState(5);

    const [editMode, setEditMode] = useState(null); // ID del usuario en edición o null
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const token = localStorage.getItem('token');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersData, catsData] = await Promise.all([
                api.getUsers(token),
                api.getCategories(token)
            ]);
            setUsers(usersData);
            setCategories(catsData);
        } catch (error) {
            console.error("Error cargando datos:", error);
        }
    };

    const handleEditClick = (u) => {
        setEditMode(u.id);
        setUsername(u.username);
        setPassword(''); // Dejar vacío para no cambiar si no se desea
        setRole(u.role);
        setAllowedScreens(u.allowed_screens || []);
        setMaxScreens('');
        setMessage(null);
    };

    const resetForm = () => {
        setEditMode(null);
        setUsername('');
        setPassword('');
        setRole('editor');
        setAllowedScreens([]);
        setMaxScreens(5);
        setMessage(null);
    };

    const handleToggleScreen = (cat) => {
        if (allowedScreens.includes(cat)) {
            setAllowedScreens(allowedScreens.filter(s => s !== cat));
        } else {
            setAllowedScreens([...allowedScreens, cat]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const userData = {
            username,
            role,
            allowed_screens: allowedScreens,
            max_screens: parseInt(maxScreens)
        };
        if (password) userData.password = password;

        try {
            if (editMode) {
                await api.updateUser(editMode, userData, token);
                setMessage({ type: 'success', text: `✅ Usuario "${username}" actualizado!` });
            } else {
                if (!password) {
                    setMessage({ type: 'error', text: 'La contraseña es obligatoria para nuevos usuarios' });
                    setIsLoading(false);
                    return;
                }
                await api.createUser(userData, token);
                setMessage({ type: 'success', text: `✅ Usuario "${username}" creado!` });
            }

            resetForm();
            loadData();
        } catch (error) {
            setMessage({ type: 'error', text: `❌ Error: ${error.response?.data?.error || error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (id, name) => {
        if (window.confirm(`¿Seguro que quieres eliminar al usuario "${name}"?`)) {
            try {
                await api.deleteUser(id, token);
                loadData();
            } catch (error) {
                alert("Error eliminando usuario");
            }
        }
    };

    return (
        <div className="user-modal-overlay">
            <div className="user-modal-content glass">
                <button className="close-btn" onClick={onClose}><FaTimes /></button>
                <h2><FaLock /> Gestión de Usuarios</h2>

                <div className="user-modal-grid">
                    {/* LISTA DE USUARIOS */}
                    <div className="users-section">
                        <h3>Usuarios Existentes</h3>
                        <div className="users-list">
                            {users.map(u => (
                                <div key={u.id} className={`user-item ${editMode === u.id ? 'editing' : ''}`}>
                                    <div className="user-info">
                                        <strong>{u.username}</strong>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <span className={`role-badge ${u.role}`}>{u.role}</span>
                                            <span className="limit-badge">L: {u.max_screens}</span>
                                        </div>
                                    </div>
                                    <div className="user-item-actions">
                                        <button onClick={() => handleEditClick(u)} className="edit-user-btn" title="Editar">
                                            ✏️
                                        </button>
                                        <button onClick={() => handleDeleteUser(u.id, u.username)} className="delete-user-btn" title="Eliminar">
                                            <FaTrashAlt />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FORMULARIO */}
                    <div className="create-section">
                        <h3>{editMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Usuario</label>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Contraseña {editMode && '(dejar en blanco para no cambiar)'}</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required={!editMode} />
                            </div>
                            <div className="form-group">
                                <label>Rol</label>
                                <select value={role} onChange={e => setRole(e.target.value)}>
                                    <option value="editor">Editor (Limitado)</option>
                                    <option value="admin">Administrador (Total)</option>
                                </select>
                            </div>

                            {role === 'editor' && (
                                <>
                                    <div className="form-group">
                                        <label>Límite de Pantallas que puede CREAR</label>
                                        <input type="number" value={maxScreens} onChange={e => setMaxScreens(e.target.value)} min="1" />
                                    </div>
                                    <div className="form-group">
                                        <label>Permitir gestionar estas pantallas:</label>
                                        <div className="screens-selector">
                                            {categories.map(item => {
                                                const catName = typeof item === 'string' ? item : item.category;
                                                return (
                                                    <div key={catName} className="screen-opt" onClick={() => handleToggleScreen(catName)}>
                                                        {allowedScreens.includes(catName) ? <FaCheckSquare className="checked" /> : <FaSquare />}
                                                        <span>{catName}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}

                            {message && <div className={`message-alert ${message.type}`}>{message.text}</div>}

                            <div className="form-buttons">
                                <button type="submit" className="create-btn" disabled={isLoading}>
                                    {isLoading ? '...' : (editMode ? 'Actualizar Usuario' : <><FaUserPlus /> Crear Usuario</>)}
                                </button>
                                {editMode && (
                                    <button type="button" onClick={resetForm} className="cancel-btn">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagementModal;
