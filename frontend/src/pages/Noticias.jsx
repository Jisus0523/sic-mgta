import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import './Noticias.css';
import fondoNoticias from '../assets/fondo-bienvenida.png';

export default function Noticias() {
    const [noticias, setNoticias] = useState([]);
    const [noticiaSeleccionada, setNoticiaSeleccionada] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
    const [advertenciaBusqueda, setAdvertenciaBusqueda] = useState('');

    const manejarBusqueda = (e) => {
        let valor = e.target.value;
        if (valor.length > 30) {
            valor = valor.substring(0, 30);
            setAdvertenciaBusqueda('Máximo 30 caracteres');
            setTimeout(() => setAdvertenciaBusqueda(''), 3000);
        }
        setBusqueda(valor);
    };

    useEffect(() => {
        const fetchNoticias = async () => {
            const { data, error } = await supabase
                .from('noticias')
                .select('*')
                .order('fecha_publicacion', { ascending: false });
            
            if (!error && data) {
                setNoticias(data);
            }
            setCargando(false);
        };
        fetchNoticias();
    }, []);

    // Extraer categorías únicas para los filtros
    const categorias = useMemo(() => {
        const cats = new Set(noticias.map(n => n.tipo));
        return ['Todas', ...Array.from(cats)];
    }, [noticias]);

    // Filtrar noticias por búsqueda y categoría
    const noticiasFiltradas = useMemo(() => {
        return noticias.filter(noticia => {
            const coincideCategoria = categoriaFiltro === 'Todas' || noticia.tipo === categoriaFiltro;
            const coincideBusqueda = noticia.titulo.toLowerCase().includes(busqueda.toLowerCase()) || 
                                     noticia.contenido.toLowerCase().includes(busqueda.toLowerCase());
            return coincideCategoria && coincideBusqueda;
        });
    }, [noticias, busqueda, categoriaFiltro]);

    // Separar Hero post (la primera) del resto, si no hay filtros activos
    const isFiltrando = busqueda !== '' || categoriaFiltro !== 'Todas';
    const heroNoticia = (!isFiltrando && noticiasFiltradas.length > 0) ? noticiasFiltradas[0] : null;
    const gridNoticias = (!isFiltrando && noticiasFiltradas.length > 0) ? noticiasFiltradas.slice(1) : noticiasFiltradas;

    const calcularTiempoLectura = (texto) => {
        if (!texto) return 1;
        const palabras = texto.trim().split(/\s+/).length;
        const minutos = Math.ceil(palabras / 200);
        return minutos;
    };

    return (
        <main className="noticias-pagina-contenedor">
            <header className="noticias-hero-banner" style={{ backgroundImage: `url(${fondoNoticias})` }}>
                <div className="noticias-hero-banner-contenido">
                    <span className="noticias-insignia">🗞️ Mantente al día</span>
                    <h1 className="noticias-titulo">Nuestro Blog</h1>
                    <p className="noticias-subtitulo">
                        Descubre las últimas novedades, proyectos y logros en la preservación del ecosistema en Margarita.
                    </p>
                </div>
            </header>

            <section className="noticias-controles">
                <div className="noticias-buscador-wrapper" style={{ position: 'relative' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                        type="text" 
                        placeholder="Buscar artículos..." 
                        value={busqueda}
                        onChange={manejarBusqueda}
                        className="noticias-buscador"
                    />
                    {advertenciaBusqueda && <span style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-20px', left: '10px' }}>{advertenciaBusqueda}</span>}
                </div>
                <div className="noticias-filtros">
                    {categorias.map(cat => (
                        <button 
                            key={cat} 
                            className={`noticias-filtro-btn ${categoriaFiltro === cat ? 'activo' : ''}`}
                            onClick={() => setCategoriaFiltro(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </section>

            <section className="noticias-seccion-principal">
                {cargando ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando publicaciones...</div>
                ) : noticiasFiltradas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No se encontraron artículos que coincidan con tu búsqueda.</div>
                ) : (
                    <div className="noticias-contenedor-grid">
                        
                        {heroNoticia && (
                            <article key={heroNoticia.id} className="noticia-card hero-card" onClick={() => setNoticiaSeleccionada(heroNoticia)}>
                                <div className="noticia-img-wrapper">
                                    {heroNoticia.imagen_url ? (
                                        <img src={heroNoticia.imagen_url} alt={heroNoticia.titulo} className="noticia-img" />
                                    ) : (
                                        <div className="noticia-img-placeholder">📰</div>
                                    )}
                                </div>
                                <div className="noticia-contenido">
                                    <div className="noticia-meta">
                                        <span className={`noticia-badge badge-${heroNoticia.tipo.toLowerCase().replace('ó','o').replace(' ', '-')}`}>{heroNoticia.tipo}</span>
                                        <span className="noticia-fecha-tiempo">
                                            {new Date(heroNoticia.fecha_publicacion).toLocaleDateString('es-VE')} • {calcularTiempoLectura(heroNoticia.contenido)} min lectura
                                        </span>
                                    </div>
                                    <h2 className="noticia-titulo">{heroNoticia.titulo}</h2>
                                    <p className="noticia-resumen">{heroNoticia.resumen || (heroNoticia.contenido.substring(0, 150) + '...')}</p>
                                    <span className="noticia-leer-mas">Leer artículo completo →</span>
                                </div>
                            </article>
                        )}

                        <div className="noticias-grid-secundario">
                            {gridNoticias.map(noticia => (
                                <article key={noticia.id} className="noticia-card" onClick={() => setNoticiaSeleccionada(noticia)}>
                                    <div className="noticia-img-wrapper">
                                        {noticia.imagen_url ? (
                                            <img src={noticia.imagen_url} alt={noticia.titulo} className="noticia-img" />
                                        ) : (
                                            <div className="noticia-img-placeholder">📰</div>
                                        )}
                                        <span className={`noticia-badge badge-${noticia.tipo.toLowerCase().replace('ó','o').replace(' ', '-')}`}>{noticia.tipo}</span>
                                    </div>
                                    <div className="noticia-contenido">
                                        <span className="noticia-fecha-tiempo">
                                            {new Date(noticia.fecha_publicacion).toLocaleDateString('es-VE')} • {calcularTiempoLectura(noticia.contenido)} min lectura
                                        </span>
                                        <h3 className="noticia-titulo">{noticia.titulo}</h3>
                                        <p className="noticia-resumen">{noticia.resumen || (noticia.contenido.substring(0, 100) + '...')}</p>
                                        <span className="noticia-leer-mas">Leer más →</span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Modal de Noticia (Premium) */}
            {noticiaSeleccionada && (
                <div className="noticia-modal-overlay" onClick={() => setNoticiaSeleccionada(null)}>
                    <div className="noticia-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="noticia-modal-close" onClick={() => setNoticiaSeleccionada(null)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        
                        <div className="noticia-modal-scroll-area">
                            {noticiaSeleccionada.imagen_url && (
                                <div className="noticia-modal-hero">
                                    <div className="noticia-modal-hero-gradient"></div>
                                    <img src={noticiaSeleccionada.imagen_url} alt={noticiaSeleccionada.titulo} className="noticia-modal-img" />
                                    <div className="noticia-modal-badge-container">
                                        <span className={`noticia-badge badge-${noticiaSeleccionada.tipo.toLowerCase().replace('ó','o').replace(' ', '-')}`}>
                                            {noticiaSeleccionada.tipo}
                                        </span>
                                    </div>
                                </div>
                            )}
                            
                            <div className="noticia-modal-body">
                                <div className="noticia-modal-meta">
                                    <span className="noticia-modal-fecha">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        {new Date(noticiaSeleccionada.fecha_publicacion).toLocaleDateString('es-VE')}
                                    </span>
                                    <span className="noticia-modal-lectura">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        {calcularTiempoLectura(noticiaSeleccionada.contenido)} min lectura
                                    </span>
                                </div>
                                <h2 className="noticia-modal-titulo">{noticiaSeleccionada.titulo}</h2>
                                <div className="noticia-modal-texto">
                                    {noticiaSeleccionada.contenido}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
