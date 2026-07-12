// Archivo: frontend/src/pages/Reporte.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Conexión a Supabase
import { saveReportOffline } from '../utils/offlineSync';
import './Reporte.css';

export default function Reporte({ setVistaActual }) {
  const navigate = useNavigate();
  const [pasoActual, setPasoActual] = useState(1);
  const [cargando, setCargando] = useState(false); // Estado para bloquear el botón mientras envía
  
  const [advertencias, setAdvertencias] = useState({});
  const setAdvertenciaTemporal = (campo, mensaje) => {
    setAdvertencias(prev => ({ ...prev, [campo]: mensaje }));
    setTimeout(() => {
        setAdvertencias(prev => {
            const copia = { ...prev };
            delete copia[campo];
            return copia;
        });
    }, 3000);
  };

  const validarTexto = (campo, valor, maxLength, soloLetras = false, soloNumeros = false) => {
    let nuevoValor = valor;
    if (soloLetras) {
        nuevoValor = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        if (valor !== nuevoValor) setAdvertenciaTemporal(campo, 'Solo letras');
    }
    if (soloNumeros) {
        nuevoValor = valor.replace(/\D/g, '');
        if (valor !== nuevoValor) setAdvertenciaTemporal(campo, 'Solo números');
    }
    if (nuevoValor.length > maxLength) {
        nuevoValor = nuevoValor.substring(0, maxLength);
        setAdvertenciaTemporal(campo, `Máximo ${maxLength} caracteres`);
    }
    return nuevoValor;
  };

  // LÓGICA INTACTA: Estados del formulario (Añadidas latitud y longitud)
  const [formulario, setFormulario] = useState({
    categoria: '',
    coordenadas: '',
    latitud: null,
    longitud: null,
    descripcion: '',
    foto: null,
    nombreComun: '',
    nombreCientifico: '',
    condicion: '',
    tipoAlerta: '',
    tipoMaterial: '',
    volumenAproximado: '',
    esPeligroso: false,
    tipoActividad: '',
    maquinariaPresente: false
  });

  // LÓGICA INTACTA: Manejadores
  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const manejarCheckbox = (e) => {
    const { name, checked } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: checked }));
  };

  const manejarArchivo = (e) => {
    const archivo = e.target.files[0];
    setFormulario((prev) => ({ ...prev, foto: archivo }));
  };

  const capturarCoordenadas = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no es soportada por tu navegador.");
      return;
    }
    
    setCargando(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setFormulario((prev) => ({
          ...prev,
          coordenadas: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
          latitud: lat.toFixed(6),
          longitud: lng.toFixed(6)
        }));
        setCargando(false);
      },
      (error) => {
        console.error("Error al obtener ubicación: ", error);
        alert("No se pudo obtener la ubicación automáticamente.");
        setCargando(false);
      }
    );
  };

  const irSiguientePaso = () => setPasoActual((prev) => prev + 1);
  const irPasoAnterior = () => setPasoActual((prev) => prev - 1);

  // NUEVA LÓGICA: Envío real a Supabase (Soporta Anónimos) y Offline Sync
  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (pasoActual < 3) return;

    setCargando(true);

    try {
      // 1. Obtener el usuario actual
      const { data: userData } = await supabase.auth.getUser();
      const idUsuario = userData?.user?.id || null;

      // Evaluar estado de red
      if (!navigator.onLine) {
        await saveReportOffline(formulario, idUsuario);
        alert("No tienes conexión a internet. El reporte se guardó de forma local y se enviará en cuanto te conectes.");
        window.dispatchEvent(new Event('offline-report-saved'));
        
        if (setVistaActual) setVistaActual('inicio');
        else navigate('/');
        
        setCargando(false);
        return;
      }

      let fotoUrl = null;

      // 2. Subir la foto si existe
      if (formulario.foto) {
        const nombreArchivo = `${Date.now()}_${formulario.foto.name}`;
        const { error: uploadError } = await supabase.storage
          .from('evidencias')
          .upload(nombreArchivo, formulario.foto);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('evidencias')
          .getPublicUrl(nombreArchivo);

        fotoUrl = publicUrlData.publicUrl;
      }

      // 3. Insertar datos generales
      const { data: reporteGuardado, error: dbError } = await supabase.from('reportes').insert([
        {
          categoria: formulario.categoria,
          descripcion: formulario.descripcion,
          coordenadas: formulario.coordenadas,
          latitud: formulario.latitud,
          longitud: formulario.longitud,
          foto_url: fotoUrl,
          usuario_id: idUsuario
        }
      ]).select('id').single();

      if (dbError) throw dbError;

      // 4. Insertar en tablas hijas
      if (formulario.categoria === 'Fauna') {
        const { error: errorEspecie } = await supabase.from('reportes_especies').insert([{
          reporte_id: reporteGuardado.id,
          nombre_comun: formulario.nombreComun,
          nombre_cientifico: formulario.nombreCientifico,
          condicion: formulario.condicion,
          tipo_alerta: formulario.tipoAlerta
        }]);
        if (errorEspecie) throw errorEspecie;
      } else if (formulario.categoria === 'Desechos') {
        const { error: errorDesecho } = await supabase.from('reportes_desechos').insert([{
          reporte_id: reporteGuardado.id,
          tipo_material: formulario.tipoMaterial,
          volumen_aproximado: formulario.volumenAproximado,
          es_peligroso: formulario.esPeligroso
        }]);
        if (errorDesecho) throw errorDesecho;
      } else if (formulario.categoria === 'Actividad Antrópica') {
        const { error: errorActividad } = await supabase.from('reportes_actividades').insert([{
          reporte_id: reporteGuardado.id,
          tipo_actividad: formulario.tipoActividad,
          maquinaria_presente: formulario.maquinariaPresente
        }]);
        if (errorActividad) throw errorActividad;
      }

      alert("¡Reporte enviado exitosamente a la base de datos!");

      if (setVistaActual) setVistaActual('inicio');
      else navigate('/');

    } catch (error) {
      console.error("Error al enviar:", error);
      
      // Fallback si falla por timeout o error de red estando "online"
      if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Network') || error.message.includes('fetch'))) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          await saveReportOffline(formulario, userData?.user?.id || null);
          window.dispatchEvent(new Event('offline-report-saved'));
          alert("Hubo un error de red al intentar subir el reporte. Se ha guardado localmente e intentaremos subirlo más tarde.");
          if (setVistaActual) setVistaActual('inicio');
          else navigate('/');
        } catch(fallbackError) {
          alert("Error crítico al enviar el reporte: " + error.message);
        }
      } else {
        alert("Error al procesar el reporte: " + error.message);
      }
    } finally {
      setCargando(false);
    }
  };

  // Renderizado del Stepper
  const renderizarStepper = () => (
    <div className="reporte-stepper-container">
      <div className="reporte-stepper-line"></div>
      {[1, 2, 3].map((paso) => {
        let clases = 'reporte-stepper-step';
        if (pasoActual > paso) clases += ' completed';
        if (pasoActual === paso) clases += ' active';
        return (
          <div key={paso} className={clases}>
            {pasoActual > paso ? '✓' : paso}
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="reporte-contenedor-principal">
      <div className="reporte-top-nav">
        <button 
          type="button" 
          className="reporte-btn-volver" 
          onClick={() => {
            if (setVistaActual && typeof setVistaActual === 'function') {
              setVistaActual('inicio');
            } else {
              navigate('/');
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Volver al Inicio
        </button>
      </div>

      <header className="reporte-cabecera">
        <h2 className="reporte-titulo-principal">Nuevo Reporte</h2>
        <p className="reporte-subtitulo">Registra los detalles para que nuestro equipo pueda actuar de inmediato.</p>
      </header>

      {renderizarStepper()}

      <form onSubmit={manejarEnvio}>

        {/* Animación 'reporte-animacion-paso' controlada por el estado de React */}
        <div key={pasoActual} className="reporte-animacion-paso">

          {/* PASO 1 */}
          {pasoActual === 1 && (
            <div>
              <div className="reporte-formulario-grupo">
                <label className="reporte-etiqueta-input" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                  Selecciona la Categoría de la Incidencia
                </label>

                {/* Tarjetas Interactivas */}
                <div className="reporte-tarjetas-grid-categorias">
                  <div
                    className={`reporte-tarjeta-btn ${formulario.categoria === 'Fauna' ? 'activa' : ''}`}
                    onClick={() => setFormulario({ ...formulario, categoria: 'Fauna' })}
                  >
                    <span className="reporte-emoji">🐢</span>
                    <span className="reporte-tarjeta-titulo">Fauna</span>
                  </div>
                  <div
                    className={`reporte-tarjeta-btn ${formulario.categoria === 'Desechos' ? 'activa' : ''}`}
                    onClick={() => setFormulario({ ...formulario, categoria: 'Desechos' })}
                  >
                    <span className="reporte-emoji">🗑️</span>
                    <span className="reporte-tarjeta-titulo">Desechos</span>
                  </div>
                  <div
                    className={`reporte-tarjeta-btn ${formulario.categoria === 'Actividad Antrópica' ? 'activa' : ''}`}
                    onClick={() => setFormulario({ ...formulario, categoria: 'Actividad Antrópica' })}
                  >
                    <span className="reporte-emoji">🚜</span>
                    <span className="reporte-tarjeta-titulo">Act. Antrópica</span>
                  </div>
                </div>
              </div>

              <div className="reporte-formulario-grupo">
                <label className="reporte-etiqueta-input">Ubicación GPS (Latitud y Longitud)</label>
                <div className="reporte-grupo-coordenadas-moderno">
                  <div className="reporte-input-wrapper">
                    <input
                      type="number"
                      step="any"
                      name="latitud"
                      value={formulario.latitud || ''}
                      onChange={(e) => {
                        manejarCambio(e);
                        setFormulario(prev => ({ ...prev, coordenadas: `Lat: ${e.target.value}, Lng: ${prev.longitud || ''}` }));
                      }}
                      placeholder="Latitud (ej: 10.985)"
                      className="reporte-input-estilizado"
                    />
                  </div>
                  <div className="reporte-input-wrapper">
                    <input
                      type="number"
                      step="any"
                      name="longitud"
                      value={formulario.longitud || ''}
                      onChange={(e) => {
                        manejarCambio(e);
                        setFormulario(prev => ({ ...prev, coordenadas: `Lat: ${prev.latitud || ''}, Lng: ${e.target.value}` }));
                      }}
                      placeholder="Longitud (ej: -64.120)"
                      className="reporte-input-estilizado"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={capturarCoordenadas}
                    className="reporte-btn-capturar-gps"
                    title="Obtener mi ubicación actual"
                    disabled={cargando}
                  >
                    {cargando ? (
                      <span className="spinner-mini"></span>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2 */}
          {pasoActual === 2 && (
            <div>
              <h3 className="reporte-titulo-paso">Evidencia Fotográfica y Descriptiva</h3>

              <div className="reporte-formulario-grupo" style={{ position: 'relative' }}>
                <label className="reporte-etiqueta-input">Descripción del Escenario</label>
                <textarea
                  name="descripcion"
                  value={formulario.descripcion}
                  onChange={(e) => setFormulario(prev => ({...prev, descripcion: validarTexto('descripcion', e.target.value, 500)}))}
                  placeholder="Describa el contexto de la incidencia de forma clara..."
                  className="reporte-textarea-estilizado"
                  required
                />
                {advertencias.descripcion && <span style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-20px', left: '0' }}>{advertencias.descripcion}</span>}
              </div>

              <div className="reporte-formulario-grupo">
                <label className="reporte-etiqueta-input">Fotografía (Evidencia)</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <label style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.8)', border: '2px dashed var(--color-ola)', borderRadius: '12px', padding: '1rem', cursor: 'pointer', color: 'var(--color-oceano)', fontWeight: '600', transition: 'all 0.2s' }}>
                    <span style={{ display: 'block', fontSize: '1.5rem', marginBottom: '0.5rem' }}>📷</span>
                    Tomar Foto
                    <input type="file" accept="image/*" capture="environment" onChange={manejarArchivo} style={{ display: 'none' }} />
                  </label>
                  <label style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.8)', border: '2px dashed var(--color-ola)', borderRadius: '12px', padding: '1rem', cursor: 'pointer', color: 'var(--color-oceano)', fontWeight: '600', transition: 'all 0.2s' }}>
                    <span style={{ display: 'block', fontSize: '1.5rem', marginBottom: '0.5rem' }}>🖼️</span>
                    Galería
                    <input type="file" accept="image/*" onChange={manejarArchivo} style={{ display: 'none' }} />
                  </label>
                </div>
                {formulario.foto && (
                  <div style={{ marginTop: '1rem', padding: '0.8rem', background: '#dcfce7', color: '#166534', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>✅</span> Archivo listo: {formulario.foto.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 3 */}
          {pasoActual === 3 && (
            <div>
              <h3 className="reporte-titulo-paso">Detalles Específicos: {formulario.categoria}</h3>

              {formulario.categoria === 'Fauna' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div className="reporte-formulario-grupo" style={{ position: 'relative' }}>
                    <label className="reporte-etiqueta-input">Nombre Común de la Especie</label>
                    <input type="text" name="nombreComun" value={formulario.nombreComun} onChange={(e) => setFormulario(prev => ({...prev, nombreComun: validarTexto('nombreComun', e.target.value, 50)}))} className="reporte-input-estilizado" />
                    {advertencias.nombreComun && <span style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-20px', left: '0' }}>{advertencias.nombreComun}</span>}
                  </div>
                  <div className="reporte-formulario-grupo" style={{ position: 'relative' }}>
                    <label className="reporte-etiqueta-input">Nombre Científico (Opcional)</label>
                    <input type="text" name="nombreCientifico" value={formulario.nombreCientifico} onChange={(e) => setFormulario(prev => ({...prev, nombreCientifico: validarTexto('nombreCientifico', e.target.value, 50)}))} className="reporte-input-estilizado" />
                    {advertencias.nombreCientifico && <span style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-20px', left: '0' }}>{advertencias.nombreCientifico}</span>}
                  </div>
                  <div className="reporte-formulario-grupo">
                    <label className="reporte-etiqueta-input">Condición de la Especie</label>
                    <select name="condicion" value={formulario.condicion} onChange={manejarCambio} className="reporte-select-estilizado">
                      <option value="">-- Seleccione condición --</option>
                      <option value="Sana/Avistamiento">Sana / Avistamiento normal</option>
                      <option value="Herida">Herida</option>
                      <option value="Muerta">Muerta</option>
                      <option value="Nidificando">Nidificando</option>
                    </select>
                  </div>
                  <div className="reporte-formulario-grupo">
                    <label className="reporte-etiqueta-input">Tipo de Alerta</label>
                    <select name="tipoAlerta" value={formulario.tipoAlerta} onChange={manejarCambio} className="reporte-select-estilizado">
                      <option value="">-- Seleccione alerta --</option>
                      <option value="Especie en Peligro">Especie en Peligro</option>
                      <option value="Especie Invasora">Especie Invasora</option>
                    </select>
                  </div>
                </div>
              )}

              {formulario.categoria === 'Desechos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div className="reporte-formulario-grupo">
                    <label className="reporte-etiqueta-input">Tipo de Material Principal</label>
                    <select name="tipoMaterial" value={formulario.tipoMaterial} onChange={manejarCambio} className="reporte-select-estilizado">
                      <option value="">-- Seleccione material --</option>
                      <option value="Plástico">Plástico</option>
                      <option value="Vidrio">Vidrio</option>
                      <option value="Redes/Artes de Pesca">Redes / Artes de Pesca</option>
                      <option value="Orgánico">Orgánico</option>
                      <option value="Químicos">Químicos</option>
                    </select>
                  </div>
                  <div className="reporte-formulario-grupo">
                    <label className="reporte-etiqueta-input">Volumen Aproximado</label>
                    <select name="volumenAproximado" value={formulario.volumenAproximado} onChange={manejarCambio} className="reporte-select-estilizado">
                      <option value="">-- Seleccione volumen --</option>
                      <option value="Bajo">Bajo (Equivalente a una bolsa)</option>
                      <option value="Medio">Medio (Acumulación local)</option>
                      <option value="Alto">Alto (Requiere maquinaria)</option>
                    </select>
                  </div>
                  <label className="reporte-checkbox-premium-container">
                    <input type="checkbox" name="esPeligroso" checked={formulario.esPeligroso} onChange={manejarCheckbox} />
                    <span style={{ fontWeight: '600', color: 'var(--color-oceano)' }}>Riesgo biológico/químico inmediato</span>
                  </label>
                </div>
              )}

              {formulario.categoria === 'Actividad Antrópica' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div className="reporte-formulario-grupo">
                    <label className="reporte-etiqueta-input">Tipo de Actividad</label>
                    <select name="tipoActividad" value={formulario.tipoActividad} onChange={manejarCambio} className="reporte-select-estilizado">
                      <option value="">-- Seleccione actividad --</option>
                      <option value="Construcción no autorizada">Construcción no autorizada</option>
                      <option value="Extracción ilegal de arena">Extracción ilegal de arena</option>
                      <option value="Vehículos en la arena">Vehículos en la arena</option>
                      <option value="Tala de manglares">Tala de manglares</option>
                    </select>
                  </div>
                  <label className="reporte-checkbox-premium-container">
                    <input type="checkbox" name="maquinariaPresente" checked={formulario.maquinariaPresente} onChange={manejarCheckbox} />
                    <span style={{ fontWeight: '600', color: 'var(--color-oceano)' }}>Maquinaria pesada presente en el sitio</span>
                  </label>
                </div>
              )}
            </div>
          )}

        </div>

        <nav className="reporte-botones-navegacion">
          {pasoActual > 1 && (
            <button
              key="btn-atras"
              type="button"
              onClick={irPasoAnterior}
              className="reporte-btn reporte-btn-atras"
              disabled={cargando}
            >
              Atrás
            </button>
          )}

          {pasoActual < 3 ? (
            <button
              key="btn-siguiente"
              type="button"
              onClick={irSiguientePaso}
              className="reporte-btn reporte-btn-siguiente"
              disabled={pasoActual === 1 && !formulario.categoria || cargando}
              style={{ marginLeft: pasoActual === 1 ? 'auto' : '0', width: pasoActual === 1 ? '100%' : 'auto' }}
            >
              Siguiente Paso
            </button>
          ) : (
            <button
              key="btn-enviar"
              type="submit"
              className="reporte-btn reporte-btn-enviar"
              disabled={cargando}
            >
              {cargando ? 'Enviando...' : 'Enviar Reporte'}
            </button>
          )}
        </nav>
      </form>
    </section>
  );
}