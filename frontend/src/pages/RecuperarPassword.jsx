import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useValidacionForm } from '../hooks/useValidacionForm';
import './RecuperarPassword.css';
import logo from '../assets/logo.png';

const IconoEmail = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="recuperar-svg-icono">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

const IconoLock = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="recuperar-svg-icono">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const IconoKey = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="recuperar-svg-icono">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
    </svg>
);

const IconoEye = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="recuperar-svg-icono">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const IconoEyeOff = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="recuperar-svg-icono">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

const IconoTurtle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 1 3 3c0 .8-.3 1.5-.8 2h-4.4c-.5-.5-.8-1.2-.8-2a3 3 0 0 1 3-3z" />
        <path d="M12 7c-4.4 0-8 3.1-8 7 0 2 1 3.8 2.6 4.9L5 22h3l1.2-2.4c.8.3 1.7.4 2.8.4s2-.1 2.8-.4L16 22h3l-1.6-3.1c1.6-1.1 2.6-2.9 2.6-4.9 0-3.9-3.6-7-8-7z" />
        <path d="M12 7v12" />
        <path d="M7.5 10.5c1.3.8 2.9 1.5 4.5 1.5s3.2-.7 4.5-1.5" />
        <path d="M7.5 15.5c1.3.8 2.9 1.5 4.5 1.5s3.2-.7 4.5-1.5" />
    </svg>
);

export default function RecuperarPassword() {
    const navigate = useNavigate();
    const [paso, setPaso] = useState(1);
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false);

    const { formulario, setFormulario, manejarCambio, advertencias } = useValidacionForm({
        email: '',
        codigo: '',
        password: '',
        confirmarPassword: ''
    });

    const solicitarCodigo = async (e) => {
        e.preventDefault();
        setCargando(true);
        setMensaje({ tipo: '', texto: '' });

        const { error } = await supabase.auth.resetPasswordForEmail(formulario.email);

        if (error) {
            setMensaje({ tipo: 'error', texto: "Error: " + error.message });
        } else {
            setMensaje({ tipo: 'exito', texto: "Código de verificación enviado a tu correo. Revisa también la carpeta de spam." });
            setPaso(2);
        }
        setCargando(false);
    };

    const verificarYActualizar = async (e) => {
        e.preventDefault();
        if (formulario.password !== formulario.confirmarPassword) {
            setMensaje({ tipo: 'error', texto: "Las contraseñas no coinciden." });
            return;
        }
        if (formulario.password.length < 8) {
            setMensaje({ tipo: 'error', texto: "La contraseña debe tener al menos 8 caracteres." });
            return;
        }

        setCargando(true);
        setMensaje({ tipo: '', texto: '' });

        // 1. Verificar el código OTP
        const { error: otpError } = await supabase.auth.verifyOtp({
            email: formulario.email,
            token: formulario.codigo,
            type: 'recovery'
        });

        if (otpError) {
            setMensaje({ tipo: 'error', texto: "Código inválido o expirado." });
            setCargando(false);
            return;
        }

        // 2. Si el código es correcto, el usuario está autenticado, procedemos a actualizar la contraseña
        const { error: updateError } = await supabase.auth.updateUser({
            password: formulario.password
        });

        if (updateError) {
            setMensaje({ tipo: 'error', texto: "Error al actualizar la contraseña: " + updateError.message });
        } else {
            alert("¡Tu contraseña ha sido actualizada con éxito!");
            navigate('/auth'); // Redirigir al login
        }
        
        setCargando(false);
    };

    return (
        <main className="recuperar-contenedor-principal">

            {/* Tortugas flotantes */}
            <div className="recuperar-floating-turtles-wrapper">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className={`recuperar-floating-turtle recuperar-floating-turtle-${i + 1}`}>
                        <IconoTurtle />
                    </div>
                ))}
            </div>

            <div className="recuperar-tarjeta">
                <Link to="/auth" className="recuperar-volver">← Volver</Link>

                <header className="recuperar-cabecera">
                    <img src={logo} alt="S.I.C Mgta Logo" className="recuperar-logo-header" />
                    <h2 className="recuperar-titulo">Recuperar Contraseña</h2>
                    <p className="recuperar-subtitulo">
                        {paso === 1 
                            ? "Ingresa tu correo para recibir un código de verificación." 
                            : "Ingresa el código que enviamos a tu correo y tu nueva contraseña."}
                    </p>
                </header>

                {mensaje.texto && (
                    <div className={mensaje.tipo === 'exito' ? 'recuperar-mensaje' : 'recuperar-mensaje-error'}>
                        {mensaje.texto}
                    </div>
                )}

                {paso === 1 ? (
                    <form onSubmit={solicitarCodigo} className="recuperar-formulario">
                        <div className="recuperar-grupo-input">
                            <span className="recuperar-input-icono"><IconoEmail /></span>
                            <input 
                                type="email" 
                                name="email" 
                                value={formulario.email} 
                                onChange={manejarCambio} 
                                placeholder="Correo Electrónico" 
                                className="recuperar-input" 
                                required 
                                disabled={cargando} 
                            />
                            {advertencias.email && <span className="auth-advertencia">{advertencias.email}</span>}
                        </div>
                        <button type="submit" className="recuperar-btn-primario" disabled={cargando}>
                            {cargando ? 'ENVIANDO...' : 'ENVIAR CÓDIGO'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={verificarYActualizar} className="recuperar-formulario">
                        <div className="recuperar-grupo-input">
                            <span className="recuperar-input-icono"><IconoKey /></span>
                            <input 
                                type="text" 
                                name="codigo" 
                                value={formulario.codigo} 
                                onChange={manejarCambio} 
                                placeholder="Código de Verificación (6 dígitos)" 
                                className="recuperar-input" 
                                required 
                                disabled={cargando} 
                            />
                        </div>
                        <div className="recuperar-grupo-input">
                            <span className="recuperar-input-icono"><IconoLock /></span>
                            <input 
                                type={mostrarPassword ? "text" : "password"} 
                                name="password" 
                                value={formulario.password} 
                                onChange={manejarCambio} 
                                placeholder="Nueva Contraseña" 
                                className={`recuperar-input auth-input-password ${formulario.password && formulario.confirmarPassword && formulario.password !== formulario.confirmarPassword ? 'auth-input-error' : ''}`} 
                                required 
                                disabled={cargando} 
                            />
                            <button type="button" className="auth-btn-eye" onClick={() => setMostrarPassword(!mostrarPassword)} disabled={cargando}>
                                {mostrarPassword ? <IconoEyeOff /> : <IconoEye />}
                            </button>
                            {advertencias.password && <span className="auth-advertencia">{advertencias.password}</span>}
                        </div>
                        <div className="recuperar-grupo-input">
                            <span className="recuperar-input-icono"><IconoLock /></span>
                            <input 
                                type={mostrarConfirmarPassword ? "text" : "password"} 
                                name="confirmarPassword" 
                                value={formulario.confirmarPassword} 
                                onChange={manejarCambio} 
                                placeholder="Confirmar Nueva Contraseña" 
                                className={`recuperar-input auth-input-password ${formulario.password && formulario.confirmarPassword && formulario.password !== formulario.confirmarPassword ? 'auth-input-error' : ''}`} 
                                required 
                                disabled={cargando} 
                            />
                            <button type="button" className="auth-btn-eye" onClick={() => setMostrarConfirmarPassword(!mostrarConfirmarPassword)} disabled={cargando}>
                                {mostrarConfirmarPassword ? <IconoEyeOff /> : <IconoEye />}
                            </button>
                            {advertencias.confirmarPassword && <span className="auth-advertencia">{advertencias.confirmarPassword}</span>}
                        </div>
                        <button type="submit" className="recuperar-btn-primario" disabled={cargando}>
                            {cargando ? 'ACTUALIZANDO...' : 'ACTUALIZAR CONTRASEÑA'}
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}
