// Archivo: frontend/src/components/AdminFAB.jsx

import React, { useState } from 'react';
import './AdminFAB.css';

export default function AdminFAB({ setModulo }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const manejarAccion = (moduloId) => {
    setModulo(moduloId);
    setIsOpen(false);
  };

  const acciones = [
    { id: 'mapa', icon: '📍', label: 'Mapa' },
    { id: 'reportes', icon: '📋', label: 'Reportes' },
    { id: 'usuarios', icon: '👥', label: 'Usuarios' },
    { id: 'estadisticas', icon: '📈', label: 'Gráficas' },
    { id: 'especies', icon: '🐢', label: 'Especies' },
    { id: 'noticias', icon: '📰', label: 'Noticias' }
  ];

  return (
    <div className="admin-fab-contenedor">

      {/* Overlay para cerrar el menú tocando fuera */}
      {isOpen && <div className="admin-fab-overlay" onClick={toggleMenu}></div>}

      <div className={`admin-fab-menu ${isOpen ? 'admin-fab-abierto' : ''}`}>
        {acciones.map((accion, index) => (
          <button
            key={accion.id}
            className="admin-fab-item"
            style={{ '--retraso': `${index * 0.05}s` }}
            onClick={() => manejarAccion(accion.id)}
            aria-label={accion.label}
          >
            <span className="admin-fab-item-icon">{accion.icon}</span>
            <span className="admin-fab-item-label">{accion.label}</span>
          </button>
        ))}
      </div>

      <button
        className={`admin-fab-principal ${isOpen ? 'admin-fab-abierto' : ''}`}
        onClick={toggleMenu}
        aria-label="Abrir menú de administración"
      >
        +
      </button>

    </div>
  );
}