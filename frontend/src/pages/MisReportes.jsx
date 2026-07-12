import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './MisReportes.css';

export default function MisReportes() {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);
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
  }, [reportes]);

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
        <h2 className="mis-reportes-titulo">Mis Reportes</h2>
        <p className="mis-reportes-subtitulo">
          Historial de incidencias ecológicas reportadas por ti.
        </p>
        <Link to="/reporte" className="mis-reportes-btn-nuevo">
          + Nuevo Reporte
        </Link>
      </header>

      {cargando ? (
        <div className="mis-reportes-estado-carga">Cargando tus reportes...</div>
      ) : reportes.length === 0 ? (
        <div className="mis-reportes-vacio">
          <span className="mis-reportes-vacio-icono">🍃</span>
          <h3>Aún no has hecho ningún reporte</h3>
          <p>
            Ayúdanos a proteger nuestras costas registrando tu primera incidencia.
          </p>
        </div>
      ) : (
        <div className="mis-reportes-masonry">
          {reportes.map((rep, index) => {
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
                    <span>📷 Sin foto</span>
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
                  <div className="mis-reportes-detalles">
                    <strong>📍 Ubicación:</strong>{' '}
                    {rep.coordenadas ? rep.coordenadas.split('(')[0] : 'No registrada'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
