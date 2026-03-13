import React, { useState, useEffect } from 'react';
import { FaTrashAlt, FaTimes, FaUserPlus, FaUserShield, FaCheckSquare, FaSquare } from 'react-icons/fa';
import api from '../../api';
import './UserManagementModal.css';

const UserManagementModal = ({ onClose }) => {
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('editor');
    const [allowedScreens, setAllowedScreens] = useState([]);
    const [maxScreens, setMaxScreens] = useState(5);
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

    const handleToggleScreen = (cat) => {
        if (allowedScreens.includes(cat)) {
            setAllowedScreens(allowedScreens.filter(s => s !== cat));
        } else {
            setAllowedScreens([...allowedScreens, cat]);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            await api.createUser({
                username,
                password,
                role,
                allowed_screens: allowedScreens,
                max_screens: parseInt(maxScreens)
            }, token);

            setMessage({ type: 'success', text: `✅ Usuario "${username}" creado!` });
            setUsername('');
            setPassword('');
            setAllowedScreens([]);
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
                <h2><FaUserShield /> Gestión de Usuarios</h2>

                <div className="user-modal-grid">
                    {/* LISTA DE USUARIOS */}
                    <div className="users-section">
                        <h3>Usuarios Existentes</h3>
                        <div className="users-list">
                            {users.map(u => (
                                <div key={u.id} className="user-item">
                                    <div className="user-info">
                                        <strong>{u.username}</strong>
                                        <span className={`role-badge ${u.role}`}>{u.role}</span>
                                        <small>{u.allowed_screens?.length || 0} pantallas</small>
                                    </div>
                                    <button onClick={() => handleDeleteUser(u.id, u.username)} className="delete-user-btn">
                                        <FaTrashAlt />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FORMULARIO CREAR */}
                    <div className="create-section">
                        <h3>Crear Nuevo Usuario</h3>
                        <form onSubmit={handleCreateUser}>
                            <div className="form-group">
                                <label>Usuario</label>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Contraseña</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
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
                                            {categories.map(cat => (
                                                <div key={cat} className="screen-opt" onClick={() => handleToggleScreen(cat)}>
                                                    {allowedScreens.includes(cat) ? <FaCheckSquare className="checked" /> : <FaSquare />}
                                                    <span>{cat}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {message && <div className={`message-alert ${message.type}`}>{message.text}</div>}

                            <button type="submit" className="create-btn" disabled={isLoading}>
                                {isLoading ? '...' : <><FaUserPlus /> Crear Usuario</>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagementModal;
