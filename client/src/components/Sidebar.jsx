import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaCocktail, FaConciergeBell, FaTags, FaUsers, FaLock, FaTv } from 'react-icons/fa';
import api from '../api';
import './Sidebar.css';

const Sidebar = ({ onAdminClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [categories, setCategories] = useState([]);

    const load = async () => {
        try {
            const data = await api.getCategories();
            setCategories(data);
        } catch (err) {
            console.error("Error sidebar cats:", err);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // Mapa de iconos y rutas para categorías conocidas
    const getMenuInfo = (name) => {
        switch (name) {
            case 'Inicio': return { path: '/inicio', icon: <FaHome /> };
            case 'HH': return { path: '/hh', icon: <FaCocktail /> };
            case 'Room Service': return { path: '/service-room', icon: <FaConciergeBell /> };
            case 'Promociones': return { path: '/promociones', icon: <FaTags /> };
            case 'Clientes': return { path: '/clientes', icon: <FaUsers /> };
            default: return { path: `/screen/${encodeURIComponent(name)}`, icon: <FaTv /> };
        }
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        load(); // Refrescar categorías al abrir el menú
    };

    return (
        <div
            className={`sidebar glass ${isHovered ? 'expanded' : 'collapsed'}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="logo-area">
                <img src="/Logo_H.png" alt="Logo" className="logo-icon-img" />
                <span className="logo-text">Canal Interno</span>
            </div>

            <nav className="nav-menu">
                {categories.map((cat) => {
                    const { path, icon } = getMenuInfo(cat);
                    return (
                        <NavLink
                            key={cat}
                            to={path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="icon">{icon}</span>
                            <span className="label">{cat}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="footer-area">
                <div className="qr-container">
                    <img src="/QR.png" alt="QR Menu" className="qr-image" />
                    <span className="qr-text">Scan for Menu</span>
                </div>

                <button className="admin-lock" onClick={onAdminClick}>
                    <FaLock />
                </button>
            </div>
        </div>
    );
};

export default Sidebar;