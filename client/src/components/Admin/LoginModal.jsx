import React, { useState } from 'react';
import './LoginModal.css';
import api from '../../api';

const LoginModal = ({ onClose, onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            console.log("Intentando login en:", api.API_URL); // Log para depurar en TV
            const data = await api.login(username, password);

            console.log("✅ Login exitoso para:", data.username);
            onLogin(data.token);

        } catch (err) {
            console.error("❌ Error de login:", err);
            let mensaje = 'Error de conexión con el servidor';

            if (err.response) {
                // El servidor respondió con un error (400, 401, etc)
                mensaje = err.response.data && err.response.data.error ? err.response.data.error : mensaje;
            } else if (err.request) {
                // La petición se hizo pero no hubo respuesta (CORS o Servidor apagado)
                mensaje = 'El servidor no responde. Verifica que la API esté encendida y acepte conexiones externas.';
            }

            setError(mensaje);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass">
                <button className="close-btn" onClick={onClose}>&times;</button>
                <h2>Acceso Administrativo</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Usuario"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="contraseña"
                            required
                        />
                    </div>
                    {error && <p className="error-msg">⚠️ {error}</p>}
                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? 'Verificando...' : 'Desbloquear'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;