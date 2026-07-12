// Archivo: frontend/src/pages/VistaInicio.jsx

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './VistaInicio.css';
import fondoBienvenida from '../assets/fondo-bienvenida.png';

export default function VistaInicio({ usuario }) {
    const contenedorRef = useRef(null);
    const categoriasRef = useRef(null);
    const [estadisticas, setEstadisticas] = useState({
        total: 0,
        fauna: 0,
        desechos: 0,
        antropica: 0,
        resueltos: 0
    });

    // Fetch Estadísticas de Impacto
    useEffect(() => {
        const fetchEstadisticas = async () => {
            // Solo traemos lo esencial para que sea rápido
            const { data, error } = await supabase
                .from('reportes')
                .select('categoria, estado');
            
            if (!error && data) {
                const stats = {
                    total: data.length,
                    fauna: data.filter(r => r.categoria === 'Fauna').length,
                    desechos: data.filter(r => r.categoria === 'Desechos').length,
                    antropica: data.filter(r => r.categoria === 'Actividad Antrópica').length,
                    resueltos: data.filter(r => r.estado === 'Resuelto').length
                };
                setEstadisticas(stats);
            }
        };
        fetchEstadisticas();
    }, []);

    // 1. Animación Scroll Reveal General (para otros elementos de la página)
    useEffect(() => {
        const observador = new IntersectionObserver(
            (entradas) => {
                entradas.forEach((entrada) => {
                    if (entrada.isIntersecting) {
                        entrada.target.classList.add('vista-inicio-scroll-visible');
                        observador.unobserve(entrada.target);
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }
        );

        if (contenedorRef.current) {
            const elementos = contenedorRef.current.querySelectorAll('.vista-inicio-scroll-oculto');
            elementos.forEach((el) => observador.observe(el));
        }

        return () => {
            observador.disconnect();
        };
    }, []);

    // 2. Animación Escalonada Específica de Categorías (con Reset/Reinicio bidireccional)
    useEffect(() => {
        const observador = new IntersectionObserver(
            (entradas) => {
                entradas.forEach((entrada) => {
                    if (entrada.isIntersecting) {
                        entrada.target.classList.add('vista-inicio-animacion-activa');
                    } else {
                        // Resetea la animación a opacity: 0 al salir de la pantalla
                        entrada.target.classList.remove('vista-inicio-animacion-activa');
                    }
                });
            },
            {
                threshold: 0.2 // Se activa cuando el 20% de la sección es visible
            }
        );

        const elementoActual = categoriasRef.current;
        if (elementoActual) {
            observador.observe(elementoActual);
        }

        return () => {
            if (elementoActual) {
                observador.unobserve(elementoActual);
            }
        };
    }, []);

    return (
        <main className="vista-inicio-contenedor" ref={contenedorRef}>
            {/* Sección Hero Inmersiva con Atardecer Costero */}
            <header className="vista-inicio-hero" style={{ backgroundImage: `url(${fondoBienvenida})` }}>
                <div className="vista-inicio-hero-contenido">
                    <span className="vista-inicio-insignia">🌊 Preservando Nuestra Biodiversidad</span>
                    <h1 className="vista-inicio-titulo">
                        <span className="vista-inicio-texto-gradiente">S.I.C Mgta</span>
                    </h1>
                    <p className="vista-inicio-subtitulo">
                        Protegiendo el ecosistema marino y las hermosas costas de la Perla del Caribe. Tu reporte rápido e inmediato marca la diferencia.
                    </p>
                    <div className="vista-inicio-cta-minimalista">
                        {!usuario && (
                            <Link to="/auth" className="vista-inicio-btn-mini secundario">
                                Iniciar Sesión
                            </Link>
                        )}
                        <Link to="/reporte" className="vista-inicio-btn-mini primario">
                            Registrar Incidente
                        </Link>
                        <Link to="/catalogo" className="vista-inicio-btn-mini tercero">
                            Ver Especies
                        </Link>
                    </div>
                </div>
            </header>

            {/* Sección Informativa: Tarjetas Flotantes */}
            <section className="vista-inicio-info-seccion">
                <article className="vista-inicio-info-tarjeta vista-inicio-scroll-oculto">
                    <div className="vista-inicio-info-icono">📸</div>
                    <div className="vista-inicio-info-cuerpo">
                        <h3>1. Observa el incidente</h3>
                        <p>Identifica fauna afectada, contaminación costera o actividades no autorizadas en nuestras playas.</p>
                    </div>
                </article>

                <article className="vista-inicio-info-tarjeta vista-inicio-scroll-oculto">
                    <div className="vista-inicio-info-icono">⚡</div>
                    <div className="vista-inicio-info-cuerpo">
                        <h3>2. Repórtalo rápido</h3>
                        <p>Usa la plataforma en tiempo real. Los datos se guardarán localmente si no tienes señal de red.</p>
                    </div>
                </article>

                <article className="vista-inicio-info-tarjeta vista-inicio-scroll-oculto">
                    <div className="vista-inicio-info-icono">🐢</div>
                    <div className="vista-inicio-info-cuerpo">
                        <h3>3. Protege el ecosistema</h3>
                        <p>Tu reporte llega directamente a los equipos de conservación para una intervención oportuna.</p>
                    </div>
                </article>
            </section>

            {/* NUEVA SECCIÓN: Categorías de Reporte con Animación Scroll Reveal e interactividad bidireccional */}
            <section className="vista-inicio-categorias-seccion" ref={categoriasRef}>
                <h2 className="vista-inicio-categorias-titulo">Categorías de Reporte</h2>
                <p className="vista-inicio-categorias-subtitulo">
                    Elige la categoría adecuada para documentar la incidencia y agilizar la respuesta de los brigadistas y biólogos.
                </p>

                <div className="vista-inicio-categorias-grid">
                    <article className="vista-inicio-categoria-tarjeta fauna">
                        <div className="vista-inicio-categoria-icono fauna">🐾</div>
                        <h3>Fauna y Especies</h3>
                        <p>Reporta animales sanos, heridos, encallados o en periodo de anidación (como las emblemáticas tortugas marinas).</p>
                    </article>

                    <article className="vista-inicio-categoria-tarjeta desechos">
                        <div className="vista-inicio-categoria-icono desechos">🗑️</div>
                        <h3>Desechos y Contaminación</h3>
                        <p>Reporta acumulación de plásticos, redes de pesca abandonadas, derrames químicos o basuras críticas en la playa.</p>
                    </article>

                    <article className="vista-inicio-categoria-tarjeta antropica">
                        <div className="vista-inicio-categoria-icono antropica">🚜</div>
                        <h3>Actividad Antrópica</h3>
                        <p>Reporta agresiones directas al entorno como construcciones ilegales, vehículos en las dunas o tala de manglares.</p>
                    </article>
                </div>
            </section>

            {/* NUEVA SECCIÓN: Impacto de la Comunidad */}
            <section className="vista-inicio-impacto-seccion vista-inicio-scroll-oculto">
                <h2 className="vista-inicio-categorias-titulo">Impacto de la Comunidad</h2>
                <p className="vista-inicio-categorias-subtitulo">Gracias a los reportes ciudadanos, logramos proteger nuestro ecosistema.</p>
                
                <div className="vista-inicio-impacto-grid">
                    <div className="vista-inicio-impacto-card total" data-icon="📋">
                        <div className="vista-inicio-impacto-valor">{estadisticas.total}</div>
                        <div className="vista-inicio-impacto-label">Reportes Totales</div>
                    </div>
                    <div className="vista-inicio-impacto-card resueltos" data-icon="✅">
                        <div className="vista-inicio-impacto-valor">{estadisticas.resueltos}</div>
                        <div className="vista-inicio-impacto-label">Casos Resueltos</div>
                    </div>
                    <div className="vista-inicio-impacto-card fauna" data-icon="🐢">
                        <div className="vista-inicio-impacto-valor">{estadisticas.fauna}</div>
                        <div className="vista-inicio-impacto-label">Alertas de Fauna</div>
                    </div>
                    <div className="vista-inicio-impacto-card desechos" data-icon="♻️">
                        <div className="vista-inicio-impacto-valor">{estadisticas.desechos}</div>
                        <div className="vista-inicio-impacto-label">Focos de Contaminación</div>
                    </div>
                </div>
            </section>

        </main>
    );
}