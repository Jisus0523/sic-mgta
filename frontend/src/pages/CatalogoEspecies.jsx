// Archivo: frontend/src/pages/CatalogoEspecies.jsx

import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './CatalogoEspecies.css';
import fondoCatalogo from '../assets/fondo-catalogo.png';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function CatalogoEspecies() {
    const [especiesData, setEspeciesData] = useState({ anidan: [], encallan: [], invasoras: [] });
    const [cargando, setCargando] = useState(true);
    const [especieSeleccionada, setEspecieSeleccionada] = useState(null);
    const [reportesRecientes, setReportesRecientes] = useState([]);
    const [noticiasRelacionadas, setNoticiasRelacionadas] = useState([]);

    useEffect(() => {
        const fetchEspecies = async () => {
            setCargando(true);
            const { data, error } = await supabase.from('especies').select('*');
            if (error) {
                console.error("Error cargando especies:", error);
            } else if (data) {
                const agrupado = { anidan: [], encallan: [], invasoras: [] };
                data.forEach(esp => {
                    if (esp.tipo === 'Anida') agrupado.anidan.push({
                        ...esp,
                        nombreCientifico: esp.nombre_cientifico, // Mapear a la propiedad que usa el componente
                        imagen: esp.imagen_url
                    });
                    else if (esp.tipo === 'Encalla') agrupado.encallan.push({
                        ...esp,
                        nombreCientifico: esp.nombre_cientifico,
                        imagen: esp.imagen_url
                    });
                    else if (esp.tipo === 'Invasora') agrupado.invasoras.push({
                        ...esp,
                        nombreCientifico: esp.nombre_cientifico,
                        imagen: esp.imagen_url
                    });
                });
                setEspeciesData(agrupado);
            }
            setCargando(false);
        };
        fetchEspecies();
    }, []);

    useEffect(() => {
        if (!especieSeleccionada) {
            setReportesRecientes([]);
            setNoticiasRelacionadas([]);
            return;
        }

        const fetchRelacionados = async () => {
            // Fetch Reportes
            const { data: reportesData } = await supabase
                .from('reportes')
                .select('*, reportes_especies(*)')
                .order('fecha', { ascending: false });
            
            if (reportesData) {
                const coincidentes = reportesData.filter(r => 
                    r.reportes_especies && 
                    (r.reportes_especies.nombre_comun === especieSeleccionada.nombre || r.reportes_especies.nombre_cientifico === especieSeleccionada.nombreCientifico) &&
                    r.latitud && r.longitud
                ).slice(0, 5);
                setReportesRecientes(coincidentes);
            }

            // Fetch Noticias
            const { data: noticiasData } = await supabase
                .from('noticias')
                .select('*')
                .or(`titulo.ilike.%${especieSeleccionada.nombre}%,contenido.ilike.%${especieSeleccionada.nombre}%`)
                .order('fecha_publicacion', { ascending: false })
                .limit(3);
                
            if (noticiasData) {
                setNoticiasRelacionadas(noticiasData);
            }
        };

        fetchRelacionados();
    }, [especieSeleccionada]);

    // Aplanar para el Observer
    const todasLasEspecies = [
        ...especiesData.anidan,
        ...especiesData.encallan,
        ...especiesData.invasoras,
    ];

    // ── IntersectionObserver para Scroll Reveal ──────────────────────────────
    const tarjetasRef = useRef([]);

    useEffect(() => {
        if (cargando || todasLasEspecies.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('catalogo-tarjeta-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.08 }
        );

        tarjetasRef.current.forEach((tarjeta) => {
            if (tarjeta) observer.observe(tarjeta);
        });

        return () => {
            tarjetasRef.current.forEach((tarjeta) => {
                if (tarjeta) observer.unobserve(tarjeta);
            });
        };
    }, [cargando, todasLasEspecies.length]);



    // ── Helpers ──────────────────────────────────────────────────────────────
    const stripHtml = (html) => {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return (doc.body.textContent || '').replace(/\u00A0/g, ' ').trim();
    };

    const obtenerClaseBadge = (tipo) => {
        switch (tipo) {
            case 'Anida': return 'catalogo-badge-anida';
            case 'Encalla': return 'catalogo-badge-encalla';
            case 'Invasora': return 'catalogo-badge-invasora';
            default: return '';
        }
    };

    const obtenerClaseLinea = (tipo) => {
        switch (tipo) {
            case 'Anida': return 'catalogo-tarjeta-linea--anida';
            case 'Encalla': return 'catalogo-tarjeta-linea--encalla';
            case 'Invasora': return 'catalogo-tarjeta-linea--invasora';
            default: return '';
        }
    };

    // Determina si la tarjeta usa la variante "overlay" (imagen como fondo oscuro)
    const esOverlay = (index) => index % 5 === 2;

    // Contador global de refs (para stagger delays)
    let refIndex = 0;

    // ── Render de una Tarjeta ────────────────────────────────────────────────
    const renderTarjeta = (especie, localIndex) => {
        const currentRef = refIndex;
        refIndex++;
        const overlay = esOverlay(localIndex);

        return (
            <article
                key={especie.id}
                className={`catalogo-tarjeta-especie catalogo-tarjeta-oculta${overlay ? ' catalogo-tarjeta-overlay' : ''}`}
                ref={(el) => (tarjetasRef.current[currentRef] = el)}
                style={{ transitionDelay: `${(localIndex % 3) * 0.12}s`, cursor: 'pointer' }}
                onClick={() => setEspecieSeleccionada(especie)}
            >
                {/* Contenedor de imagen */}
                <div className="catalogo-tarjeta-imagen-contenedor">
                    <img
                        src={especie.imagen}
                        alt={especie.nombre}
                        className="catalogo-tarjeta-imagen"
                        loading="lazy"
                    />
                </div>

                {/* Overlay gradient (solo variante overlay) */}
                {overlay && <div className="catalogo-overlay-gradient" />}

                {/* Badge */}
                <span className={`catalogo-badge-categoria ${obtenerClaseBadge(especie.tipo)}`}>
                    {especie.tipo}
                </span>

                {/* Cuerpo */}
                <div className="catalogo-tarjeta-cuerpo">
                    <h3 className="catalogo-tarjeta-titulo">{especie.nombre}</h3>
                    <p className="catalogo-tarjeta-cientifico">{especie.nombreCientifico}</p>
                    <hr className={`catalogo-tarjeta-linea ${obtenerClaseLinea(especie.tipo)}`} />
                    <p className="catalogo-tarjeta-descripcion">{stripHtml(especie.descripcion)}</p>
                </div>
            </article>
        );
    };

    // ── Secciones ────────────────────────────────────────────────────────────
    const secciones = [
        {
            key: 'anidan',
            titulo: '🐢 Especies que Anidan',
            claseLinea: 'catalogo-seccion-titulo--anida',
            datos: especiesData.anidan,
        },
        {
            key: 'encallan',
            titulo: '🐬 Especies que Encallan',
            claseLinea: 'catalogo-seccion-titulo--encalla',
            datos: especiesData.encallan,
        },
        {
            key: 'invasoras',
            titulo: '⚠️ Especies Invasoras',
            claseLinea: 'catalogo-seccion-titulo--invasora',
            datos: especiesData.invasoras,
        },
    ];

    return (
        <main className="catalogo-contenedor">
            {/* ── Hero Section ──────────────────────────────────────────── */}
            <header
                className="catalogo-hero"
                style={{ backgroundImage: `url(${fondoCatalogo})` }}
            >
                <div className="catalogo-hero-overlay" />
                <div className="catalogo-hero-contenido">
                    <Link to="/" className="catalogo-btn-volver">← Volver al Inicio</Link>
                    <h1 className="catalogo-hero-titulo">Catálogo de Especies</h1>
                    <p className="catalogo-hero-subtitulo">
                        Desde los nidos ocultos en la costa margariteña hasta las aguas profundas del Caribe. Conoce la biodiversidad de nuestras costas y aprende a identificar las especies clave para su conservación.
                    </p>
                </div>
            </header>

            {/* ── Secciones por Categoría con Layout Masonry ────────────── */}
            {cargando ? (
                <div style={{textAlign: 'center', padding: '4rem', color: 'var(--color-oceano)'}}>
                    <h2>Cargando especies...</h2>
                </div>
            ) : todasLasEspecies.length === 0 ? (
                <div style={{textAlign: 'center', padding: '4rem', color: 'var(--color-oceano)'}}>
                    <h2>Aún no hay especies registradas en el catálogo.</h2>
                    <p>Si eres administrador, puedes agregarlas desde el Panel de Control.</p>
                </div>
            ) : (
                secciones.map((seccion) => (
                    seccion.datos.length > 0 && (
                        <React.Fragment key={seccion.key}>
                            <div className="catalogo-seccion-header">
                                <h2 className={`catalogo-seccion-titulo ${seccion.claseLinea}`}>
                                    {seccion.titulo}
                                </h2>
                            </div>
                            <section className="catalogo-masonry">
                                {seccion.datos.map((especie, i) => renderTarjeta(especie, i))}
                            </section>
                        </React.Fragment>
                    )
                ))
            )}

            <div className="catalogo-footer-spacer" />

            {/* Modal de Detalle de Especie */}
            {especieSeleccionada && (
                <div className="catalogo-modal-overlay" onClick={() => setEspecieSeleccionada(null)}>
                    <div className="catalogo-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="catalogo-modal-close" onClick={() => setEspecieSeleccionada(null)}>×</button>
                        <div className="catalogo-modal-header">
                            <span className={`catalogo-badge-categoria ${obtenerClaseBadge(especieSeleccionada.tipo)}`}>
                                {especieSeleccionada.tipo}
                            </span>
                            <h2 className="catalogo-modal-titulo">{especieSeleccionada.nombre}</h2>
                            <p className="catalogo-modal-cientifico">{especieSeleccionada.nombreCientifico}</p>
                            <Link to={`/reporte?especie=${encodeURIComponent(especieSeleccionada.nombre)}`} className="catalogo-modal-btn-reportar">
                                📍 Reportar Avistamiento
                            </Link>
                        </div>
                        <div className={`catalogo-modal-body ${!especieSeleccionada.imagen ? 'sin-imagen' : ''}`}>
                            {especieSeleccionada.imagen && (
                                <img src={especieSeleccionada.imagen} alt={especieSeleccionada.nombre} className="catalogo-modal-imagen" />
                            )}
                            <div className="catalogo-modal-info">
                                <h3>Descripción</h3>
                                <div className="catalogo-rich-text" dangerouslySetInnerHTML={{ __html: especieSeleccionada.descripcion }}></div>
                                
                                {especieSeleccionada.protocolo_accion && (
                                    <div className="catalogo-modal-protocolo">
                                        <h3>⚠️ Protocolo de Acción</h3>
                                        <div className="catalogo-rich-text" dangerouslySetInnerHTML={{ __html: especieSeleccionada.protocolo_accion }}></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Extra Info: Mapa y Noticias */}
                        <div className="catalogo-modal-extras">
                            {reportesRecientes.length > 0 && (
                                <div className="catalogo-modal-mapa">
                                    <h3>📍 Últimos avistamientos</h3>
                                    <div className="catalogo-mapa-contenedor">
                                        <MapContainer center={[reportesRecientes[0].latitud, reportesRecientes[0].longitud]} zoom={11} style={{ height: '250px', width: '100%', borderRadius: '8px' }}>
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                            />
                                            {reportesRecientes.map(rep => (
                                                <Marker key={rep.id} position={[rep.latitud, rep.longitud]}>
                                                    <Popup>
                                                        <strong>{rep.fecha && new Date(rep.fecha).toLocaleDateString()}</strong><br />
                                                        {rep.descripcion}
                                                    </Popup>
                                                </Marker>
                                            ))}
                                        </MapContainer>
                                    </div>
                                </div>
                            )}

                            {noticiasRelacionadas.length > 0 && (
                                <div className="catalogo-modal-noticias">
                                    <h3>📰 Noticias Relacionadas</h3>
                                    <ul className="catalogo-noticias-lista">
                                        {noticiasRelacionadas.map(noticia => (
                                            <li key={noticia.id}>
                                                <Link to={`/noticias?id=${noticia.id}`} className="catalogo-noticia-link">
                                                    {noticia.titulo}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}