import axios from 'axios';

// Prioridad: 1. Variable de entorno, 2. URL de Vercel (si se detecta), 3. IP local de respaldo
const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    // Si estamos en Vercel pero falta la variable, intentamos deducirla o avisar
    if (window.location.hostname.includes('vercel.app')) {
        console.warn('VITE_API_URL no configurada en Vercel. Peticiones fallarán si el backend no es el mismo host.');
    }

    return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

const api = {
    API_URL, // Exponer para depuración
    // 1. OBTENER PANTALLA (Corregido de /videos a /screen)
    getScreen: async (category) => {
        try {
            const response = await axios.get(`${API_URL}/screen/${category}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching screen:', error);
            return null;
        }
    },

    // 2. LOGIN (Este ya funcionaba, lo dejamos igual)
    login: async (username, password) => {
        const response = await axios.post(`${API_URL}/auth/login`, { username, password });
        return response.data;
    },

    // 3. SUBIR VIDEO (Modificado para soportar append)
    uploadVideo: async (category, formData, token, append = false) => {
        const query = append ? '?append=true' : '';
        const response = await axios.post(`${API_URL}/upload/${category}${query}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                // Enviamos el token para futura seguridad (opcional por ahora)
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    },

    // 3.5 ELIMINAR ITEM DE LA PLAYLIST
    deletePlaylistItem: async (category, publicId, token) => {
        const response = await axios.delete(`${API_URL}/playlist/${category}/${publicId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    },

    // 4. CAMBIAR ROTACIÓN
    updateRotation: async (category, rotation) => {
        const response = await axios.post(`${API_URL}/rotation/${category}`, { rotation });
        return response.data;
    },

    // 5. OBTENER CATEGORÍAS
    getCategories: async (token) => {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await axios.get(`${API_URL}/categories`, { headers });
        return response.data;
    },

    // 6. CREAR CATEGORÍA
    createCategory: async (category, token) => {
        const response = await axios.post(`${API_URL}/category`, { category }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    },

    // 7. ELIMINAR CATEGORÍA
    deleteCategory: async (category, token) => {
        const response = await axios.delete(`${API_URL}/category/${category}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    },

    resetScreenContent: async (category, token) => {
        const response = await axios.post(`${API_URL}/screen/reset/${category}`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    },

    // 9. GESTIÓN DE USUARIOS
    getUsers: async (token) => {
        const response = await axios.get(`${API_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    },

    createUser: async (userData, token) => {
        const response = await axios.post(`${API_URL}/users`, userData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    },

    deleteUser: async (id, token) => {
        const response = await axios.delete(`${API_URL}/users/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    },

    updateUser: async (id, userData, token) => {
        const response = await axios.put(`${API_URL}/users/${id}`, userData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    },

    // 10. CONFIGURACIÓN GLOBAL
    getWelcomeSettings: async () => {
        try {
            const response = await axios.get(`${API_URL}/settings/welcome`);
            return response.data;
        } catch (error) {
            console.error('Error fetching settings:', error);
            return { title: 'HILTON', subtitle: 'México City Santa Fe' };
        }
    },
    
    updateWelcomeSettings: async (settingsData, token) => {
        const response = await axios.post(`${API_URL}/settings/welcome`, settingsData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    }
};

export default api;