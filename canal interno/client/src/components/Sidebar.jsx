import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaCocktail, FaConciergeBell, FaTags, FaUsers, FaQrcode, FaLock } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ onAdminClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    const menuItems = [
        { name: 'Inicio', path: '/inicio', icon: <FaHome /> },
        { name: 'HH', path: '/hh', icon: <FaCocktail /> },
        { name: 'Service Room', path: '/service-room', icon: <FaConciergeBell /> },
        { name: 'Promociones', path: '/promociones', icon: <FaTags /> },
        { name: 'Clientes', path: '/clientes', icon: <FaUsers /> },
    ];

    return (
        <div
            className={`sidebar glass ${isHovered ? 'expanded' : 'collapsed'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="logo-area">
                {/* Placeholder for Hotel Logo */}
                <div className="logo-icon"></div>
                <span className="logo-text">Canal Interno</span>
            </div>

            <nav className="nav-menu">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="icon">{item.icon}</span>
                        <span className="label">{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="footer-area">
                <div className="qr-container">
                    <FaQrcode className="qr-placeholder" />
                    <span className="qr-text">Scan for Menu</span>
                </div>

                {/* Hidden Admin Button */}
                <button className="admin-lock" onClick={onAdminClick}>
                    <FaLock />
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
