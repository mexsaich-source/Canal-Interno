import React, { useState } from 'react';
import { FaTimes, FaCloudUploadAlt } from 'react-icons/fa';
import './UploadModal.css';

const UploadModal = ({ category, existingPlaylist = [], onClose, onUpload }) => {
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]); // [url, url...]
    const [hasAudio, setHasAudio] = useState(false);
    const [scheduleStart, setScheduleStart] = useState('');
    const [scheduleEnd, setScheduleEnd] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [append, setAppend] = useState(false); // NUEVO: Estado para decidir si reemplazar o agregar

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(selectedFiles);

        // Generar URLs de previsualización locales
        const previewUrls = selectedFiles.map(file => URL.createObjectURL(file));
        setPreviews(previewUrls);
    };

    const hasVideo = files.some(file => file.type.startsWith('video/'));

    const handleQueueAfterLast = () => {
        if (existingPlaylist && existingPlaylist.length > 0) {
            const ends = existingPlaylist.map(p => p.scheduleEnd).filter(Boolean).map(d => new Date(d).getTime());
            if (ends.length > 0) {
                const maxEnd = new Date(Math.max(...ends));
                const tzoffset = maxEnd.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(maxEnd - tzoffset)).toISOString().slice(0, 16);
                setScheduleStart(localISOTime);
                setAppend(true);
            } else {
                alert("La programación actual no tiene fechas de fin establecidas (se reproducen infinitamente).");
            }
        } else {
            alert("No hay elementos programados previamente en esta pantalla.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0) return;

        setIsUploading(true);
        const formData = new FormData();
        files.forEach(file => {
            formData.append('media', file);
        });
        
        formData.append('hasAudio', hasAudio);
        if (scheduleStart) formData.append('scheduleStart', new Date(scheduleStart).toISOString());
        if (scheduleEnd) formData.append('scheduleEnd', new Date(scheduleEnd).toISOString());

        try {
            await onUpload(category, formData, append); // NUEVO: Pasamos el flag append
        } finally {
            setIsUploading(false);
            onClose();
        }
    };

    return (
        <div className="upload-modal-overlay">
            <div className="upload-modal-content glass">
                <button className="close-btn" onClick={onClose}><FaTimes /></button>
                <h2>Subir a <span style={{ color: "var(--accent-color)" }}>{category}</span></h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Seleccionar Archivos</label>
                        <input 
                            type="file" 
                            accept="video/mp4,video/webm,image/png,image/jpeg,image/jpg" 
                            multiple 
                            onChange={handleFileChange} 
                            required 
                        />
                        <small style={{display: 'block', marginTop: '5px', color: '#ccc'}}>Puedes subir múltiples fotos (presentación) o 1 video.</small>
                        
                        {previews.length > 0 && (
                            <div className="upload-previews-container">
                                {previews.map((url, index) => (
                                    <div key={index} className="preview-thumbnail">
                                        {files[index].type.startsWith('video/') ? (
                                            <video src={url} muted />
                                        ) : (
                                            <img src={url} alt="preview" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {hasVideo && (
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input 
                                    style={{ width: 'auto', marginRight: '10px' }}
                                    type="checkbox" 
                                    checked={hasAudio} 
                                    onChange={(e) => setHasAudio(e.target.checked)} 
                                />
                                Reproducir video CON sonido
                            </label>
                        </div>
                    )}

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input 
                                style={{ width: 'auto', marginRight: '10px' }}
                                type="checkbox" 
                                checked={append} 
                                onChange={(e) => setAppend(e.target.checked)} 
                            />
                            Añadir a la programación actual (no borrar lo anterior)
                        </label>
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                        <label>🕒 Programar Inicio (Opcional)</label>
                        <button type="button" onClick={handleQueueAfterLast} style={{
                            position: 'absolute', top: 0, right: 0, padding: '2px 8px', fontSize: '0.8rem', background: '#0984e3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                        }}>
                            Poner después del último evento
                        </button>
                        <input 
                            type="datetime-local" 
                            value={scheduleStart} 
                            onChange={(e) => setScheduleStart(e.target.value)} 
                        />
                    </div>

                    <div className="form-group">
                        <label>⏳ Programar Fin (Opcional)</label>
                        <input 
                            type="datetime-local" 
                            value={scheduleEnd} 
                            onChange={(e) => setScheduleEnd(e.target.value)} 
                        />
                        <small style={{display: 'block', marginTop: '5px', color: '#ccc'}}>El contenido desaparecerá al expirar la fecha y hora.</small>
                    </div>

                    <button type="submit" className="upload-submit-btn" disabled={isUploading || files.length === 0}>
                        {isUploading ? 'Subiendo...' : <><FaCloudUploadAlt /> Comenzar Subida</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UploadModal;
