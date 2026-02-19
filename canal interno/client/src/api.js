import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = {
    getVideo: async (category) => {
        try {
            const response = await axios.get(`${API_URL}/videos/${category}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching video:', error);
            return null;
        }
    },

    login: async (username, password) => {
        const response = await axios.post(`${API_URL}/auth/login`, { username, password });
        return response.data;
    },

    uploadVideo: async (formData, token) => {
        const response = await axios.post(`${API_URL}/videos`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    },

    deleteVideo: async (category, token) => {
        const response = await axios.delete(`${API_URL}/videos/${category}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    }
};

export default api;
