import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Navbar.css';
import logo from '../assets/logo.png';

export default function Navbar({ isOnline, usuario, pendingSyncs = 0 }) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const menuRef = useRef(null);

    const isAdminRoute = location.pathname === '/admin';
    const moduloActual = searchParams.get('modulo') || 'mapa';
    const fechaActual = searchParams.get('fecha') || 'todos';

    const adminNavItems = [
        { id: 'mapa', icon: '📊', label: 'Mapa' },
        { id: 'reportes', icon: '📋', label: 'Reportes' },
        { id: 'usuarios', icon: '👥', label: 'Usuarios' },
        { id: 'estadisticas', icon: '📈', label: 'Estadísticas' },
        { id: 'especies', icon: '🐢', label: 'Especies' },
        { id: 'noticias', icon: '📰', label: 'Noticias' },
    ];

    const toggleMenu = () => setMenuAbierto(!menuAbierto);

    // Cerrar menú si se hace click afuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleCerrarSesion = async () => {
        await supabase.auth.signOut();
        setMenuAbierto(false);
        navigate('/');
    };

    return (
        <header className="navbar-contenedor">

            <div className="navbar-izquierda">
                <Link to="/" className="navbar-enlace-logo">
                    <img
                        src={logo}
                        alt="Logo S.I.C Mgta"
                        className="navbar-logo"
                    />
                    <h1 className="navbar-titulo">S.I.C Mgta</h1>
                </Link>
            </div>

            {isAdminRoute && (
                <div className="navbar-admin-container">
                    <div className="navbar-admin-links">
                        {adminNavItems.map((item) => (
                            <button
                                key={item.id}
                                className={`navbar-admin-btn ${moduloActual === item.id ? 'activo' : ''}`}
                                onClick={() => {
                                    const newParams = new URLSearchParams(searchParams);
                                    newParams.set('modulo', item.id);
                                    setSearchParams(newParams);
                                }}
                            >
                                <span>{item.icon}</span>
                                <span className="navbar-admin-label">{item.label}</span>
                            </button>
                        ))}
                    </div>

                </div>
            )}

            <div className="navbar-derecha">
                
                {pendingSyncs > 0 && (
                    <div className="navbar-pending-sync" title={`${pendingSyncs} reporte(s) guardado(s) localmente. Se enviarán al tener conexión.`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span className="navbar-pending-badge">{pendingSyncs}</span>
                    </div>
                )}

                <div className={`navbar-indicador-red ${isOnline ? 'navbar-online' : 'navbar-offline'}`} title={isOnline ? 'Conectado a Internet' : 'Sin conexión'}>
                    {isOnline ? (
                        <>
                            <svg className="navbar-icono-wifi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                                <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                                <line x1="12" y1="20" x2="12.01" y2="20"></line>
                            </svg>
                            <span className="navbar-indicador-punto"></span>
                        </>
                    ) : (
                        <>
                            <svg className="navbar-icono-wifi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                                <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                                <line x1="12" y1="20" x2="12.01" y2="20"></line>
                            </svg>
                            <svg className="navbar-icono-x" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </>
                    )}
                </div>
                
                <div className="navbar-usuario-contenedor" ref={menuRef}>
                    <button className="navbar-usuario-boton" onClick={toggleMenu}>
                        <svg className="navbar-icono-usuario" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        {usuario ? usuario.nombre : 'Anónimo'}
                        <svg className={`navbar-icono-flecha ${menuAbierto ? 'abierto' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    
                    {menuAbierto && (
                        <div className="navbar-dropdown">
                            {usuario ? (
                                <>
                                    <Link to="/noticias" className="navbar-dropdown-item" onClick={() => setMenuAbierto(false)}>Noticias</Link>
                                    <Link to="/mis-reportes" className="navbar-dropdown-item" onClick={() => setMenuAbierto(false)}>Ver mis reportes</Link>
                                    {usuario.rol === 'admin' && (
                                        <Link to="/admin" className="navbar-dropdown-item" onClick={() => setMenuAbierto(false)}>Panel de Control</Link>
                                    )}
                                    <Link to="/mi-perfil" className="navbar-dropdown-item" onClick={() => setMenuAbierto(false)}>Mi información</Link>
                                    <button className="navbar-dropdown-item navbar-dropdown-cerrar" onClick={handleCerrarSesion}>Cerrar sesión</button>
                                </>
                            ) : (
                                <>
                                    <Link to="/noticias" className="navbar-dropdown-item" onClick={() => setMenuAbierto(false)}>Noticias</Link>
                                    <Link to="/auth" className="navbar-dropdown-item" onClick={() => setMenuAbierto(false)}>Iniciar sesión</Link>
                                    <Link to="/auth?modo=registro" className="navbar-dropdown-item" onClick={() => setMenuAbierto(false)}>Registrarse</Link>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

        </header>
    );
}