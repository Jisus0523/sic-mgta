// Archivo: frontend/src/components/Footer.jsx

import React from 'react';
import './Footer.css';

export default function Footer() {
  const anioActual = new Date().getFullYear();

  return (
    <footer className="footer-contenedor">
      <p>
        &copy; {anioActual} S.I.C Mgta. Desarrollado por Jesús Rafael Velásquez Martínez.
      </p>
    </footer>
  );
}
