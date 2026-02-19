CREATE DATABASE IF NOT EXISTS canal_interno;
USE canal_interno;

-- Users table for Admin
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category ENUM('HH', 'Inicio', 'Service Room', 'Promociones', 'Clientes') NOT NULL UNIQUE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin (password: admin123 - needs to be hashed in real app, but for initial setup we can't easily hash here without a script. 
-- For now, we will handle user creation via a seed script or just assume the auth route checks against a hardcoded hash if the DB is empty on first run, 
-- or better, provide a setup script.
-- Let's just create the structure first.
