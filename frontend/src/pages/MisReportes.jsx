import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './MisReportes.css';

// SVG Icons
const IconoCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mis-reportes-icono-stat">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconoClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mis-reportes-icono-stat">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconoList = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mis-reportes-icono-stat">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const IconoPin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mis-reportes-icono-pin">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconoImageOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mis-reportes-icono-no-img">
    <line x1="3" y1="3" x2="21" y2="21" />
    <path d="M10.5 10.5 15 15" />
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

export default function MisReportes() {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const observer = useRef(null);

  useEffect(() => {
    const fetchMisReportes = async () => {
      setCargando(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (userId) {
        const { data, error } = await supabase
          .from('reportes')
          .select('*')
          .eq('usuario_id', userId)
          .order('fecha', { ascending: false });

        if (error) {
          console.error('Error al obtener mis reportes:', error);
        } else {
          setReportes(data || []);
        }
      }
      setCargando(false);
    };

    fetchMisReportes();
  }, []);

  // Filtrado de reportes
  const reportesFiltrados = reportes.filter(rep => {
    if (filtroEstado === 'Todos') return true;
    const estado = rep.estado || 'Pendiente';
    return estado === filtroEstado;
  });

  // Estadísticas
  const totalReportes = reportes.length;
  const resueltos = reportes.filter(r => r.estado === 'Resuelto').length;
  const pendientes = reportes.filter(r => !r.estado || r.estado === 'Pendiente' || r.estado === 'En Proceso').length;

  // IntersectionObserver for reveal animations
  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('mis-reportes-tarjeta-visible');
            entry.target.classList.remove('mis-reportes-tarjeta-oculta');
          }
        });
      },
      { threshold: 0.15 }
    );
    const cards = document.querySelectorAll('.mis-reportes-tarjeta');
    cards.forEach((card) => {
      card.classList.add('mis-reportes-tarjeta-oculta');
      observer.current.observe(card);
    });
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [reportesFiltrados]);

  const renderBadge = (estado) => {
    const estadoActual = estado || 'Pendiente';
    let clase = 'mis-reportes-badge-estado ';

    if (estadoActual === 'Pendiente') clase += 'mis-reportes-badge-pendiente';
    if (estadoActual === 'En Proceso') clase += 'mis-reportes-badge-proceso';
    if (estadoActual === 'Resuelto') clase += 'mis-reportes-badge-resuelto';
    if (estadoActual === 'Rechazado') clase += 'mis-reportes-badge-rechazado';

    return <span className={clase}>{estadoActual}</span>;
  };

  return (
    <section className="mis-reportes-contenedor-principal">
      <header className="mis-reportes-cabecera">
        <div className="mis-reportes-textos">
            <h2 className="mis-reportes-titulo">Mis Reportes</h2>
            <p className="mis-reportes-subtitulo">
            Historial de incidencias ecológicas reportadas por ti.
            </p>
        </div>
        <Link to="/reporte" className="mis-reportes-btn-nuevo mis-reportes-btn-desktop">
          + Nuevo Reporte
        </Link>
      </header>

      {!cargando && reportes.length > 0 && (
          <>
            {/* Dashboard Stats */}
            <div className="mis-reportes-stats-grid">
                <div className="mis-reportes-stat-card">
                    <div className="mis-reportes-stat-icon-wrapper blue"><IconoList /></div>
                    <div className="mis-reportes-stat-info">
                        <h3>{totalReportes}</h3>
                        <p>Total Emitidos</p>
                    </div>
                </div>
                <div className="mis-reportes-stat-card">
                    <div className="mis-reportes-stat-icon-wrapper green"><IconoCheck /></div>
                    <div className="mis-reportes-stat-info">
                        <h3>{resueltos}</h3>
                        <p>Resueltos</p>
                    </div>
                </div>
                <div className="mis-reportes-stat-card">
                    <div className="mis-reportes-stat-icon-wrapper amber"><IconoClock /></div>
                    <div className="mis-reportes-stat-info">
                        <h3>{pendientes}</h3>
                        <p>En Espera</p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="mis-reportes-filtros">
                {['Todos', 'Pendiente', 'En Proceso', 'Resuelto', 'Rechazado'].map(estado => (
                    <button
                        key={estado}
                        className={`mis-reportes-filtro-btn ${filtroEstado === estado ? 'activo' : ''}`}
                        onClick={() => setFiltroEstado(estado)}
                    >
                        {estado}
                    </button>
                ))}
            </div>
          </>
      )}

      {cargando ? (
        <div className="mis-reportes-estado-carga">
            <div className="mis-reportes-spinner"></div>
            <p>Cargando tus reportes...</p>
        </div>
      ) : reportes.length === 0 ? (
        <div className="mis-reportes-vacio">
          <div className="mis-reportes-vacio-icono-container">
            <span className="mis-reportes-vacio-icono">🍃</span>
          </div>
          <h3>Aún no has hecho ningún reporte</h3>
          <p>
            Ayúdanos a proteger nuestras costas registrando tu primera incidencia.
          </p>
          <Link to="/reporte" className="mis-reportes-btn-vacio">
            Crear mi primer reporte
          </Link>
        </div>
      ) : reportesFiltrados.length === 0 ? (
         <div className="mis-reportes-vacio mis-reportes-vacio-filtro">
            <h3>No hay reportes en este estado</h3>
            <p>Intenta con otro filtro.</p>
         </div>
      ) : (
        <div className="mis-reportes-masonry">
          {reportesFiltrados.map((rep, index) => {
            const esOverlay = index % 5 === 2;
            return (
              <div
                key={rep.id}
                className={`mis-reportes-tarjeta${esOverlay ? ' mis-reportes-tarjeta-overlay' : ''}`}
              >
                {/* Contenedor de imagen */}
                {rep.foto_url ? (
                  <div className="mis-reportes-imagen-contenedor">
                    <img src={rep.foto_url} alt={rep.categoria} className="mis-reportes-imagen" />
                  </div>
                ) : (
                  <div className="mis-reportes-imagen-contenedor mis-reportes-imagen-placeholder">
                    <IconoImageOff />
                    <span>Sin foto</span>
                  </div>
                )}

                {/* Gradient oscuro para variante overlay */}
                {esOverlay && <div className="mis-reportes-overlay-gradient" />}

                {/* Badge flotando sobre la imagen */}
                {renderBadge(rep.estado)}

                {/* Cuerpo */}
                <div className="mis-reportes-cuerpo">
                  <h3 className="mis-reportes-categoria">{rep.categoria}</h3>
                  <p className="mis-reportes-fecha">
                    🗓 {new Date(rep.fecha).toLocaleDateString('es-VE')}
                  </p>
                  <hr className="mis-reportes-linea" />
                  <p className="mis-reportes-descripcion">
                    {rep.descripcion.length > 100
                      ? rep.descripcion.substring(0, 100) + '...'
                      : rep.descripcion}
                  </p>
                  
                  <div className="mis-reportes-detalles-footer">
                      <div className="mis-reportes-detalles">
                        <IconoPin />
                        <span>
                            {rep.coordenadas ? rep.coordenadas.split('(')[0].substring(0, 25) + '...' : 'No registrada'}
                        </span>
                      </div>
                      <button className="mis-reportes-btn-detalles">Ver detalles →</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB para móviles */}
      <Link to="/reporte" className="mis-reportes-fab-movil" aria-label="Nuevo Reporte">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>
    </section>
  );
}
