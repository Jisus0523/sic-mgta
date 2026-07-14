import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useValidacionForm } from '../hooks/useValidacionForm';
import { toast } from 'react-hot-toast';
import { translateError } from '../utils/errorTranslator';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import '../custom-datepicker.css';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('es', es);
import './Auth.css';
import logo from '../assets/logo.png';

// SVG Icons (Sin cambios)
const IconoUser = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="auth-svg-icono">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const IconoLock = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="auth-svg-icono">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const IconoEmail = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="auth-svg-icono">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

const IconoId = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="auth-svg-icono">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="7" y1="16" x2="13" y2="16" />
    </svg>
);

const IconoCalendar = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="auth-svg-icono">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const IconoTurtle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="auth-decoracion-tortuga">
        <path d="M12 2a3 3 0 0 1 3 3c0 .8-.3 1.5-.8 2h-4.4c-.5-.5-.8-1.2-.8-2a3 3 0 0 1 3-3z" />
        <path d="M12 7c-4.4 0-8 3.1-8 7 0 2 1 3.8 2.6 4.9L5 22h3l1.2-2.4c.8.3 1.7.4 2.8.4s2-.1 2.8-.4L16 22h3l-1.6-3.1c1.6-1.1 2.6-2.9 2.6-4.9 0-3.9-3.6-7-8-7z" />
        <path d="M12 7v12" />
        <path d="M7.5 10.5c1.3.8 2.9 1.5 4.5 1.5s3.2-.7 4.5-1.5" />
        <path d="M7.5 15.5c1.3.8 2.9 1.5 4.5 1.5s3.2-.7 4.5-1.5" />
    </svg>
);

const IconoEye = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="auth-svg-icono">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const IconoEyeOff = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="auth-svg-icono">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

export default function Auth() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // Si la URL incluye ?modo=registro, abre directamente el panel de registro
    const [esRegistro, setEsRegistro] = useState(searchParams.get('modo') === 'registro');
    const [cargando, setCargando] = useState(false);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false);
    const [registroExitoso, setRegistroExitoso] = useState(false);
    const [emailRegistrado, setEmailRegistrado] = useState('');

    const { formulario, setFormulario, manejarCambio, advertencias } = useValidacionForm({
        nombre: '',
        apellido: '',
        cedula: '',
        fechaNacimiento: '',
        email: '',
        password: '',
        confirmarPassword: '',
        terminosAceptados: false
    });

    const manejarEnvio = async (e) => {
        e.preventDefault();
        setCargando(true); // Iniciamos la carga

        if (esRegistro) {
            // VALIDACIONES DE REGISTRO
            if (formulario.password !== formulario.confirmarPassword) {
                toast.error("Las contraseñas no coinciden");
                setCargando(false);
                return;
            }
            if (formulario.password.length < 8) {
                toast.error("La contraseña debe tener al menos 8 caracteres.");
                setCargando(false);
                return;
            }

            if (formulario.cedula.length < 7) {
                toast.error("La cédula debe tener al menos 7 dígitos.");
                setCargando(false);
                return;
            }
            if (!formulario.terminosAceptados) {
                toast.error("Debe aceptar los Términos y Condiciones");
                setCargando(false);
                return;
            }

            // LLAMADA A SUPABASE PARA REGISTRO
            const { data, error } = await supabase.auth.signUp({
                email: formulario.email,
                password: formulario.password,
                options: {
                    data: {
                        nombre: formulario.nombre,
                        apellido: formulario.apellido,
                        cedula: formulario.cedula,
                        fecha_nacimiento: formulario.fechaNacimiento
                    }
                }
            });

            if (error) {
                toast.error(translateError(error.message));
            } else {
                setEmailRegistrado(formulario.email);
                setRegistroExitoso(true);
                toast.success("Registro casi completo. ¡Revisa tu correo!");
            }

        } else {
            // LLAMADA A SUPABASE PARA LOGIN
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formulario.email,
                password: formulario.password
            });

            if (error) {
                toast.error(translateError(error.message));
            } else {
                toast.success("¡Inicio de sesión exitoso!");
                navigate('/'); // Redirige al inicio (dashboard)
            }
        }

        setCargando(false); // Finalizamos la carga
    };

    const alternarModo = () => {
        setEsRegistro(!esRegistro);
        // Limpiamos formulario para una transición agradable
        setFormulario({ nombre: '', apellido: '', cedula: '', fechaNacimiento: '', email: '', password: '', confirmarPassword: '', terminosAceptados: false });
    };

    // ── Panel de confirmación de email ──────────────────────────────────────
    if (registroExitoso) {
        // Intenta detectar el dominio para abrir el webmail correspondiente
        const dominio = emailRegistrado.split('@')[1] || '';
        const webmailUrls = {
            'gmail.com': 'https://mail.google.com',
            'googlemail.com': 'https://mail.google.com',
            'outlook.com': 'https://outlook.live.com',
            'hotmail.com': 'https://outlook.live.com',
            'live.com': 'https://outlook.live.com',
            'yahoo.com': 'https://mail.yahoo.com',
            'yahoo.es': 'https://mail.yahoo.com',
            'icloud.com': 'https://www.icloud.com/mail',
        };
        const webmailUrl = webmailUrls[dominio] || `mailto:${emailRegistrado}`;

        return (
            <main className="auth-contenedor-principal">
                <div className="auth-floating-turtles-wrapper">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className={`auth-floating-turtle auth-floating-turtle-${i + 1}`}>
                            <IconoTurtle />
                        </div>
                    ))}
                </div>

                <div className="auth-confirmacion-panel">
                    <div className="auth-confirmacion-icono-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="auth-confirmacion-icono">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <div className="auth-confirmacion-check">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="auth-confirmacion-titulo">¡Revisa tu correo!</h2>
                    <p className="auth-confirmacion-desc">
                        Te enviamos un enlace de confirmación a:
                    </p>
                    <p className="auth-confirmacion-email">{emailRegistrado}</p>
                    <p className="auth-confirmacion-instruccion">
                        Debes confirmar tu correo antes de poder iniciar sesión. Si no lo ves, revisa tu carpeta de <strong>spam o correo no deseado</strong>.
                    </p>

                    <a
                        href={webmailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="auth-btn-abrir-correo"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.1rem', height: '1.1rem' }}>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Abrir mi correo
                    </a>

                    <button
                        className="auth-btn-ir-login"
                        onClick={() => {
                            setRegistroExitoso(false);
                            setEmailRegistrado('');
                            setEsRegistro(false);
                        }}
                    >
                        Ir a Iniciar Sesión
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="auth-contenedor-principal">

            {/* Animación de tortugas flotantes por toda la pantalla */}
            <div className="auth-floating-turtles-wrapper">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className={`auth-floating-turtle auth-floating-turtle-${i + 1}`}>
                        <IconoTurtle />
                    </div>
                ))}
            </div>

            <div className={`auth-tarjeta-doble ${esRegistro ? 'auth-mostrar-registro' : 'auth-mostrar-login'}`}>

                {/* 1. SECCIÓN DE FORMULARIOS */}
                <div className="auth-seccion-formularios">

                    {/* FORMULARIO DE LOGIN */}
                    <div className="auth-bloque-formulario auth-login-bloque">
                        <Link to="/" className="auth-volver">← Inicio</Link>

                        <header className="auth-cabecera">
                            <img src={logo} alt="S.I.C Mgta Logo" className="auth-logo-header" />
                            <h2 className="auth-titulo-form">EcoTech</h2>
                            <p className="auth-subtitulo">Ingresa para gestionar tus reportes</p>
                        </header>

                        <form onSubmit={manejarEnvio} className="auth-formulario">
                            <div className="auth-grupo-input">
                                <span className="auth-input-icono"><IconoEmail /></span>
                                <input type="email" name="email" value={formulario.email} onChange={manejarCambio} placeholder="Correo Electrónico" className="auth-input" required disabled={cargando} />
                                {advertencias.email && <span className="auth-advertencia">{advertencias.email}</span>}
                            </div>
                            <div className="auth-grupo-input">
                                <span className="auth-input-icono"><IconoLock /></span>
                                <input type={mostrarPassword ? "text" : "password"} name="password" value={formulario.password} onChange={manejarCambio} placeholder="Contraseña" className="auth-input auth-input-password" required disabled={cargando} />
                                <button type="button" className="auth-btn-eye" onClick={() => setMostrarPassword(!mostrarPassword)} disabled={cargando}>
                                    {mostrarPassword ? <IconoEyeOff /> : <IconoEye />}
                                </button>
                                {advertencias.password && <span className="auth-advertencia">{advertencias.password}</span>}
                            </div>

                            <div className="auth-olvido-contenedor">
                                <Link to="/recuperar-password" className="auth-link-olvido">¿Olvidaste tu contraseña?</Link>
                            </div>

                            <button type="submit" className="auth-btn-primario" disabled={cargando}>
                                {cargando ? 'INGRESANDO...' : 'INGRESAR'}
                            </button>
                        </form>

                        <div className="auth-toggle-contenedor-movil">
                            <button type="button" onClick={alternarModo} className="auth-toggle-btn" disabled={cargando}>
                                ¿No tienes cuenta? Regístrate aquí
                            </button>
                        </div>
                    </div>

                    {/* FORMULARIO DE REGISTRO */}
                    <div className="auth-bloque-formulario auth-registro-bloque">
                        <Link to="/" className="auth-volver">← Inicio</Link>

                        <header className="auth-cabecera">
                            <img src={logo} alt="S.I.C Mgta Logo" className="auth-logo-header" />
                            <h2 className="auth-titulo-form">Crear Cuenta</h2>
                            <p className="auth-subtitulo">Únete al monitoreo ecológico</p>
                        </header>

                        <form onSubmit={manejarEnvio} className="auth-formulario">
                            <div className="auth-grid-campos">
                                <div className="auth-grupo-input">
                                    <span className="auth-input-icono"><IconoUser /></span>
                                    <input type="text" name="nombre" value={formulario.nombre} onChange={manejarCambio} placeholder="Nombre" className="auth-input" required disabled={cargando} />
                                    {advertencias.nombre && <span className="auth-advertencia">{advertencias.nombre}</span>}
                                </div>
                                <div className="auth-grupo-input">
                                    <span className="auth-input-icono"><IconoUser /></span>
                                    <input type="text" name="apellido" value={formulario.apellido} onChange={manejarCambio} placeholder="Apellido" className="auth-input" required disabled={cargando} />
                                    {advertencias.apellido && <span className="auth-advertencia">{advertencias.apellido}</span>}
                                </div>
                                <div className="auth-grupo-input">
                                    <span className="auth-input-icono"><IconoId /></span>
                                    <input type="text" name="cedula" value={formulario.cedula} onChange={manejarCambio} placeholder="Cédula" className="auth-input" required disabled={cargando} />
                                    {advertencias.cedula && <span className="auth-advertencia">{advertencias.cedula}</span>}
                                </div>
                                <div className="auth-grupo-input">
                                    <span className="auth-input-icono"><IconoCalendar /></span>
                                    <DatePicker
                                        selected={formulario.fechaNacimiento ? new Date(formulario.fechaNacimiento + 'T12:00:00Z') : null}
                                        onChange={(date) => {
                                            if (date) {
                                                const yyyy = date.getFullYear();
                                                const mm = String(date.getMonth() + 1).padStart(2, '0');
                                                const dd = String(date.getDate()).padStart(2, '0');
                                                setFormulario(prev => ({ ...prev, fechaNacimiento: `${yyyy}-${mm}-${dd}` }));
                                            } else {
                                                setFormulario(prev => ({ ...prev, fechaNacimiento: '' }));
                                            }
                                        }}
                                        onKeyDown={(e) => e.preventDefault()}
                                        dateFormat="dd/MM/yyyy"
                                        className="auth-input custom-datepicker-input"
                                        placeholderText="Fecha de Nacimiento"
                                        required
                                        disabled={cargando}
                                        showMonthDropdown
                                        showYearDropdown
                                        dropdownMode="select"
                                        portalId="root-portal"
                                        maxDate={new Date()}
                                        locale="es"
                                    />
                                </div>
                                <div className="auth-grupo-input auth-campo-full">
                                    <span className="auth-input-icono"><IconoEmail /></span>
                                    <input type="email" name="email" value={formulario.email} onChange={manejarCambio} placeholder="Correo Electrónico" className="auth-input" required disabled={cargando} />
                                    {advertencias.email && <span className="auth-advertencia">{advertencias.email}</span>}
                                </div>
                                <div className="auth-grupo-input">
                                    <span className="auth-input-icono"><IconoLock /></span>
                                    <input type={mostrarPassword ? "text" : "password"} name="password" value={formulario.password} onChange={manejarCambio} placeholder="Contraseña" className={`auth-input auth-input-password ${formulario.password && formulario.confirmarPassword && formulario.password !== formulario.confirmarPassword ? 'auth-input-error' : ''}`} required disabled={cargando} />
                                    <button type="button" className="auth-btn-eye" onClick={() => setMostrarPassword(!mostrarPassword)} disabled={cargando}>
                                        {mostrarPassword ? <IconoEyeOff /> : <IconoEye />}
                                    </button>
                                    {advertencias.password && <span className="auth-advertencia">{advertencias.password}</span>}
                                    {esRegistro && (
                                        <span className={`auth-password-hint ${formulario.password.length === 0 ? '' :
                                                formulario.password.length >= 8 && formulario.password.length <= 16 ? 'auth-password-hint--ok' :
                                                    'auth-password-hint--error'
                                            }`}>
                                            {formulario.password.length === 0
                                                ? 'Mín 8 caracteres · Máx 16'
                                                : formulario.password.length < 8
                                                    ? `Faltan ${8 - formulario.password.length} caracteres más (mín. 8)`
                                                    : formulario.password.length > 16
                                                        ? `Excede el límite por ${formulario.password.length - 16} (máx. 16)`
                                                        : `✓ Longitud válida (${formulario.password.length}/16)`
                                            }
                                        </span>
                                    )}
                                </div>
                                <div className="auth-grupo-input">
                                    <span className="auth-input-icono"><IconoLock /></span>
                                    <input type={mostrarConfirmarPassword ? "text" : "password"} name="confirmarPassword" value={formulario.confirmarPassword} onChange={manejarCambio} placeholder="Confirmar" className={`auth-input auth-input-password ${formulario.password && formulario.confirmarPassword && formulario.password !== formulario.confirmarPassword ? 'auth-input-error' : ''}`} required disabled={cargando} />
                                    <button type="button" className="auth-btn-eye" onClick={() => setMostrarConfirmarPassword(!mostrarConfirmarPassword)} disabled={cargando}>
                                        {mostrarConfirmarPassword ? <IconoEyeOff /> : <IconoEye />}
                                    </button>
                                    {advertencias.confirmarPassword && <span className="auth-advertencia">{advertencias.confirmarPassword}</span>}
                                </div>

                                <div className="auth-grupo-checkbox auth-campo-full">
                                    <label className="auth-label-checkbox">
                                        <input
                                            type="checkbox"
                                            name="terminosAceptados"
                                            checked={formulario.terminosAceptados}
                                            onChange={manejarCambio}
                                            required
                                            className="auth-checkbox"
                                            disabled={cargando}
                                        />
                                        <span>Acepto los <a href="#terminos" className="auth-link" onClick={(e) => e.preventDefault()}>Términos y Condiciones</a></span>
                                    </label>
                                </div>
                            </div>

                            <button type="submit" className="auth-btn-primario" disabled={cargando}>
                                {cargando ? 'REGISTRANDO...' : 'REGISTRARSE'}
                            </button>
                        </form>

                        <div className="auth-toggle-contenedor-movil">
                            <button type="button" onClick={alternarModo} className="auth-toggle-btn" disabled={cargando}>
                                ¿Ya tienes una cuenta? Inicia sesión aquí
                            </button>
                        </div>
                    </div>

                </div>

                {/* 2. PANEL DE DECORACIÓN E INTERCAMBIO (DESKTOP SLIDER) */}
                <div className="auth-panel-decoracion">
                    <div className="auth-decoracion-fondo">
                        <div className="auth-blob auth-blob-1"></div>
                        <div className="auth-blob auth-blob-2"></div>
                        <div className="auth-blob auth-blob-3"></div>
                        <div className="auth-blob auth-blob-4"></div>

                        <div className="auth-decoracion-tortuga-contenedor">
                            <IconoTurtle />
                        </div>
                    </div>

                    <div className="auth-decoracion-textos-slider">
                        <div className="auth-decoracion-bloque-texto auth-decoracion-texto-login">
                            <h2>¿Nuevo en EcoTech?</h2>
                            <p>Únete a nuestra plataforma y contribuye con el monitoreo y conservación de la fauna marina de nuestras costas.</p>
                            <button onClick={alternarModo} className="auth-btn-toggle-decoracion" disabled={cargando}>
                                CREAR CUENTA
                            </button>
                        </div>
                        <div className="auth-decoracion-bloque-texto auth-decoracion-texto-registro">
                            <h2>¿Ya eres miembro?</h2>
                            <p>Inicia sesión para continuar gestionando tus reportes e incidencias ecológicas.</p>
                            <button onClick={alternarModo} className="auth-btn-toggle-decoracion" disabled={cargando}>
                                INICIAR SESIÓN
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}