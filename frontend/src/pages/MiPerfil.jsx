import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useValidacionForm } from '../hooks/useValidacionForm';
import { toast } from 'react-hot-toast';
import { translateError } from '../utils/errorTranslator';
import './MiPerfil.css';

const IconoEye = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mi-perfil-svg-icono">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const IconoEyeOff = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mi-perfil-svg-icono">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

export default function MiPerfil() {
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoPass, setCargandoPass] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false);
  
  const { formulario: passwords, setFormulario: setPasswords, manejarCambio: manejarCambioPassword, advertencias } = useValidacionForm({
    password: '',
    confirmarPassword: ''
  });

  useEffect(() => {
    const fetchPerfil = async () => {
      setCargando(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (userId) {
        // Obtenemos los datos extendidos de la tabla public.usuarios
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error("Error al obtener el perfil:", error);
        } else {
          setPerfil(data);
        }
      }
      setCargando(false);
    };

    fetchPerfil();
  }, []);



  const enviarCambioPassword = async (e) => {
    e.preventDefault();

    if (passwords.password !== passwords.confirmarPassword) {
      toast.error("Las contraseñas no coinciden. Por favor, verifica.");
      return;
    }

    if (passwords.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setCargandoPass(true);

    const { error } = await supabase.auth.updateUser({
      password: passwords.password
    });

    if (error) {
      toast.error(translateError(error.message));
    } else {
      toast.success("¡Contraseña actualizada exitosamente!");
      setPasswords({ password: '', confirmarPassword: '' }); // Limpiamos el formulario
    }

    setCargandoPass(false);
  };

  if (cargando) {
    return <div className="mi-perfil-cargando">Cargando tu información...</div>;
  }

  if (!perfil) {
    return <div className="mi-perfil-error">No se pudo cargar la información del perfil.</div>;
  }

  return (
    <section className="mi-perfil-contenedor-principal">
      <header className="mi-perfil-cabecera">
        <h2 className="mi-perfil-titulo">Mi Información</h2>
        <p className="mi-perfil-subtitulo">Gestiona tus datos personales y credenciales de acceso.</p>
      </header>

      <div className="mi-perfil-grid">
        
        {/* Panel de Información Personal */}
        <div className="mi-perfil-tarjeta">
          <div className="mi-perfil-encabezado-tarjeta">
            <span className="mi-perfil-icono-tarjeta">👤</span>
            <h3>Datos Personales</h3>
          </div>
          
          <div className="mi-perfil-campos-grid">
            <div className="mi-perfil-campo">
              <label>Nombre</label>
              <div className="mi-perfil-valor">{perfil.nombre}</div>
            </div>
            <div className="mi-perfil-campo">
              <label>Apellido</label>
              <div className="mi-perfil-valor">{perfil.apellido}</div>
            </div>
            <div className="mi-perfil-campo">
              <label>Cédula de Identidad</label>
              <div className="mi-perfil-valor">{perfil.cedula}</div>
            </div>
            <div className="mi-perfil-campo">
              <label>Fecha de Nacimiento</label>
              <div className="mi-perfil-valor">
                {perfil.fecha_nacimiento ? new Date(perfil.fecha_nacimiento).toLocaleDateString('es-VE', {timeZone: 'UTC'}) : 'No registrada'}
              </div>
            </div>
            <div className="mi-perfil-campo mi-perfil-campo-completo">
              <label>Correo Electrónico</label>
              <div className="mi-perfil-valor">{perfil.email}</div>
            </div>
            <div className="mi-perfil-campo mi-perfil-campo-completo">
              <label>Rol en el Sistema</label>
              <div className="mi-perfil-valor">
                <span className={`mi-perfil-badge-rol ${perfil.rol === 'admin' ? 'admin' : 'ciudadano'}`}>
                  {perfil.rol.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <p className="mi-perfil-nota">
            * Para modificar tus datos personales, por favor contacta al administrador del sistema.
          </p>
        </div>

        {/* Panel de Cambio de Contraseña */}
        <div className="mi-perfil-tarjeta mi-perfil-tarjeta-seguridad">
          <div className="mi-perfil-encabezado-tarjeta">
            <span className="mi-perfil-icono-tarjeta">🔒</span>
            <h3>Seguridad y Credenciales</h3>
          </div>
          
          <form onSubmit={enviarCambioPassword} className="mi-perfil-formulario">
            <div className="mi-perfil-grupo-input" style={{ position: 'relative' }}>
              <label htmlFor="password">Nueva Contraseña</label>
              <input
                type={mostrarPassword ? "text" : "password"}
                id="password"
                name="password"
                value={passwords.password}
                onChange={manejarCambioPassword}
                placeholder="Ingresa tu nueva contraseña"
                required
                className={`mi-perfil-input ${passwords.password && passwords.confirmarPassword && passwords.password !== passwords.confirmarPassword ? 'auth-input-error' : ''}`}
                disabled={cargandoPass}
              />
              <button type="button" className="auth-btn-eye" style={{ top: '35px' }} onClick={() => setMostrarPassword(!mostrarPassword)} disabled={cargandoPass}>
                  {mostrarPassword ? <IconoEyeOff /> : <IconoEye />}
              </button>
              {advertencias.password && <span className="auth-advertencia" style={{ bottom: '-20px', left: '0' }}>{advertencias.password}</span>}
            </div>
            
            <div className="mi-perfil-grupo-input" style={{ position: 'relative' }}>
              <label htmlFor="confirmarPassword">Confirmar Contraseña</label>
              <input
                type={mostrarConfirmarPassword ? "text" : "password"}
                id="confirmarPassword"
                name="confirmarPassword"
                value={passwords.confirmarPassword}
                onChange={manejarCambioPassword}
                placeholder="Repite tu nueva contraseña"
                required
                className={`mi-perfil-input ${passwords.password && passwords.confirmarPassword && passwords.password !== passwords.confirmarPassword ? 'auth-input-error' : ''}`}
                disabled={cargandoPass}
              />
              <button type="button" className="auth-btn-eye" style={{ top: '35px' }} onClick={() => setMostrarConfirmarPassword(!mostrarConfirmarPassword)} disabled={cargandoPass}>
                  {mostrarConfirmarPassword ? <IconoEyeOff /> : <IconoEye />}
              </button>
              {advertencias.confirmarPassword && <span className="auth-advertencia" style={{ bottom: '-20px', left: '0' }}>{advertencias.confirmarPassword}</span>}
            </div>

            <button 
              type="submit" 
              className="mi-perfil-btn-guardar"
              disabled={cargandoPass || !passwords.password || !passwords.confirmarPassword}
            >
              {cargandoPass ? 'Actualizando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        </div>

      </div>
    </section>
  );
}
