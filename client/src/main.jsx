import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import VConsole from 'vconsole';

// Inicializar vConsole solo en producción (Vercel) o cuando se necesite depurar en TV
if (window.location.hostname.includes('vercel.app') || window.location.port === '5173') {
  new VConsole();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
