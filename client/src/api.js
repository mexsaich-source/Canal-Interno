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

    // 3. SUBIR VIDEO (Corregido para incluir la categoría y la ruta correcta)
    uploadVideo: async (category, formData, token) => {
        const response = await axios.post(`${API_URL}/upload/${category}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                // Enviamos el token para futura seguridad (opcional por ahora)
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    },

    // 4. CAMBIAR ROTACIÓN
    updateRotation: async (category, rotation) => {
        const response = await axios.post(`${API_URL}/rotation/${category}`, { rotation });
        return response.data;
    },

    // 5. OBTENER CATEGORÍAS
    getCategories: async () => {
        const response = await axios.get(`${API_URL}/categories`);
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

    // 8. QUITAR CONTENIDO (RESET)
    resetScreenContent: async (category, token) => {
        const response = await axios.post(`${API_URL}/screen/reset/${category}`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    }
};

export default api;