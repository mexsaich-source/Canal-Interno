import axios from 'axios';

// Usamos variable de entorno o fallback a localhost
const API_URL = (import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : 'http://localhost:5000/api';

const api = {
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