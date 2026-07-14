// Archivo: frontend/src/pages/AdminDashboard.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../custom-datepicker.css';
import 'react-datepicker/dist/react-datepicker.css';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

registerLocale('es', es);
import './AdminDashboard.css';
import AdminFAB from '../components/AdminFAB';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

// Solución para que los íconos de los pines carguen correctamente en Vite
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

const ELEMENTOS_POR_PAGINA = 10;
const COLORES_PIE = ['#F59E0B', '#38BDF8', '#10B981', '#EF4444']; // Ambar, Azul, Verde, Rojo

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const modulo = searchParams.get('modulo') || 'mapa';
  const setModulo = (m) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('modulo', m);
    setSearchParams(newParams);
  };

  // Estados para la base de datos
  const [reportesDb, setReportesDb] = useState([]);
  const [cargandoReportes, setCargandoReportes] = useState(false);
  const [usuariosDb, setUsuariosDb] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [especiesDb, setEspeciesDb] = useState([]);
  const [cargandoEspecies, setCargandoEspecies] = useState(false);

  // Estados de Drawers (Paneles Laterales) y Selección
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [usuarioAEditar, setUsuarioAEditar] = useState(null);
  const [especieAEditar, setEspecieAEditar] = useState(null);
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [notaTemporal, setNotaTemporal] = useState('');
  const [reportesSeleccionados, setReportesSeleccionados] = useState([]);
  
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

  // Estados para buscadores y filtros
  const [busquedaReportes, setBusquedaReportes] = useState('');
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('');
  const [busquedaEspecies, setBusquedaEspecies] = useState('');
  const [filtroEstadoMapa, setFiltroEstadoMapa] = useState(['Pendiente', 'En Proceso']); // Por defecto solo activos
  const filtroFechaGlobal = searchParams.get('fecha') || 'todos';

  // Paginación
  const [paginaReportesActual, setPaginaReportesActual] = useState(1);
  const [paginaUsuariosActual, setPaginaUsuariosActual] = useState(1);
  const [paginaEspeciesActual, setPaginaEspeciesActual] = useState(1);

  // Estados para Noticias
  const [noticiasDb, setNoticiasDb] = useState([]);
  const [cargandoNoticias, setCargandoNoticias] = useState(false);
  const [noticiaAEditar, setNoticiaAEditar] = useState(null);
  const [paginaNoticiasActual, setPaginaNoticiasActual] = useState(1);

  // Estados para Data Mart (OLAP RPC)
  const [datosDataMart, setDatosDataMart] = useState({ categoria: [], estado: [], estadoCategoria: [], evolucion: [] });
  const [cargandoDataMart, setCargandoDataMart] = useState(false);

  useEffect(() => {
    const traerDatos = async () => {
      setCargandoReportes(true);
      setCargandoUsuarios(true);

      const { data: reportesData, error: reportesError } = await supabase
        .from('reportes')
        .select('*, reportes_especies(*), reportes_desechos(*), reportes_actividades(*)')
        .order('fecha', { ascending: false });

      if (reportesError) {
        console.error("Error obteniendo reportes:", reportesError);
      } else {
        setReportesDb(reportesData || []);
      }
      setCargandoReportes(false);

      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*')
        .order('creado_en', { ascending: false });

      if (usuariosError) {
        console.error("Error obteniendo usuarios:", usuariosError);
      } else {
        setUsuariosDb(usuariosData || []);
      }
      setCargandoUsuarios(false);

      setCargandoEspecies(true);
      const { data: especiesData, error: especiesError } = await supabase
        .from('especies')
        .select('*')
        .order('creado_en', { ascending: false });

      if (especiesError) {
        console.warn("Error obteniendo especies (¿tabla no creada?):", especiesError);
        alert("Error cargando especies: " + especiesError.message);
      } else {
        setEspeciesDb(especiesData || []);
      }
      setCargandoEspecies(false);

      setCargandoNoticias(true);
      const { data: noticiasData, error: noticiasError } = await supabase
        .from('noticias')
        .select('*')
        .order('fecha_publicacion', { ascending: false });

      if (noticiasError) {
        console.error("Error obteniendo noticias:", noticiasError);
      } else {
        setNoticiasDb(noticiasData || []);
      }
      setCargandoNoticias(false);
    };

    traerDatos();
  }, []);

  // Funciones de utilidad
  const aplicarFiltroFecha = (fechaString) => {
    if (filtroFechaGlobal === 'todos' || !fechaString) return true;
    const fechaObj = new Date(fechaString);
    const hoy = new Date();

    if (filtroFechaGlobal === 'hoy') {
      return fechaObj.toDateString() === hoy.toDateString();
    }
    if (filtroFechaGlobal === 'semana') {
      const hace7Dias = new Date();
      hace7Dias.setDate(hoy.getDate() - 7);
      return fechaObj >= hace7Dias;
    }
    if (filtroFechaGlobal === 'mes') {
      return fechaObj.getMonth() === hoy.getMonth() && fechaObj.getFullYear() === hoy.getFullYear();
    }
    
    // Si es una fecha exacta en formato YYYY-MM-DD
    if (filtroFechaGlobal.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const yyyy = fechaObj.getFullYear();
      const mm = String(fechaObj.getMonth() + 1).padStart(2, '0');
      const dd = String(fechaObj.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}` === filtroFechaGlobal;
    }

    return true;
  };

  const renderFiltroFecha = () => {
    const isExacta = filtroFechaGlobal.match(/^\d{4}-\d{2}-\d{2}$/);
    
    return (
      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', background: 'var(--admin-bg-tarjeta)', padding: '0.5rem 1.5rem', borderRadius: '100px', border: '1px solid var(--admin-border)', boxShadow: 'var(--admin-shadow)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-secundario)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <select
          value={isExacta ? 'exacta' : filtroFechaGlobal}
          onChange={(e) => {
            const newParams = new URLSearchParams(searchParams);
            if (e.target.value === 'exacta') {
              const hoyStr = new Date().toISOString().split('T')[0];
              newParams.set('fecha', hoyStr);
            } else {
              newParams.set('fecha', e.target.value);
            }
            setSearchParams(newParams);
          }}
          style={{ width: 'auto', padding: '0.2rem', border: 'none', background: 'transparent', outline: 'none', color: 'var(--admin-text-principal)', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <option value="todos">Todo el tiempo</option>
          <option value="hoy">Hoy</option>
          <option value="semana">Últimos 7 días</option>
          <option value="mes">Este Mes</option>
          <option value="exacta">Fecha Exacta...</option>
        </select>

        {isExacta && (
          <DatePicker
            selected={filtroFechaGlobal && filtroFechaGlobal.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(filtroFechaGlobal + 'T12:00:00Z') : null}
            onChange={(date) => {
              if (date) {
                const newParams = new URLSearchParams(searchParams);
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                newParams.set('fecha', `${yyyy}-${mm}-${dd}`);
                setSearchParams(newParams);
              }
            }}
            onKeyDown={(e) => e.preventDefault()}
            dateFormat="dd/MM/yyyy"
            className="admin-form-input custom-datepicker-input"
            style={{ width: 'auto', padding: '0.2rem 0.5rem', border: '1px solid var(--admin-border)', borderRadius: '6px', outline: 'none', color: 'var(--admin-text-principal)', fontFamily: 'inherit', fontWeight: '500' }}
            placeholderText="Seleccionar fecha..."
            isClearable={false}
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            portalId="root-portal"
            maxDate={new Date()}
            locale="es"
          />
        )}
      </div>
    );
  };

  const generarCSV = (datos, nombreArchivo) => {
    if (!datos || datos.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
    const encabezados = Object.keys(datos[0]);

    const filasCSV = datos.map(fila => {
      return encabezados.map(header => {
        let valor = fila[header];
        if (valor === null || valor === undefined) valor = '';
        else if (typeof valor === 'object') valor = JSON.stringify(valor);
        else valor = String(valor);

        valor = valor.replace(/"/g, '""');
        if (valor.includes(';') || valor.includes('\n') || valor.includes('"')) {
          valor = `"${valor}"`;
        }
        return valor;
      }).join(';');
    });

    const contenidoCSV = "sep=;\r\n" + [encabezados.join(';'), ...filasCSV].join('\r\n');
    const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generarPDF = (datos, nombreArchivo, titulo) => {
    if (!datos || datos.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
    const doc = new jsPDF('landscape'); // Horizontal para que quepan las columnas
    
    doc.setFontSize(16);
    doc.text(titulo, 14, 15);
    
    const encabezados = Object.keys(datos[0]);
    const filas = datos.map(fila => {
      return encabezados.map(header => {
        let valor = fila[header];
        if (valor === null || valor === undefined) return '';
        if (typeof valor === 'object') return JSON.stringify(valor);
        return String(valor);
      });
    });

    const columnStyles = {};
    const imgIndex = encabezados.findIndex(h => h.toLowerCase().includes('imagen') || h.toLowerCase().includes('url'));
    if (imgIndex !== -1) {
      columnStyles[imgIndex] = { cellWidth: 35 }; // Reducir ancho de la URL
    }
    const descIndex = encabezados.findIndex(h => h.toLowerCase().includes('descripci'));
    if (descIndex !== -1) {
      columnStyles[descIndex] = { cellWidth: 80 }; // Darle más espacio a la descripción
    }

    autoTable(doc, {
      head: [encabezados],
      body: filas,
      startY: 20,
      styles: { fontSize: 8, overflow: 'linebreak' },
      columnStyles: columnStyles,
      headStyles: { fillColor: [16, 185, 129] } // Verde acorde a tu tema
    });

    doc.save(nombreArchivo);
  };

  // Acciones en DB
  const cambiarEstadoReporte = async (id, nuevoEstado) => {
    const { error } = await supabase
      .from('reportes')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) {
      alert("Error actualizando reporte: " + error.message);
    } else {
      setReportesDb(prev => prev.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r));
      if (reporteSeleccionado && reporteSeleccionado.id === id) {
        setReporteSeleccionado(prev => ({ ...prev, estado: nuevoEstado }));
      }
    }
  };

  const guardarNotaInterna = async () => {
    if (!reporteSeleccionado) return;
    const { error } = await supabase
      .from('reportes')
      .update({ notas_internas: notaTemporal })
      .eq('id', reporteSeleccionado.id);

    if (error) {
      alert("Error guardando nota: " + error.message);
    } else {
      setReportesDb(prev => prev.map(r => r.id === reporteSeleccionado.id ? { ...r, notas_internas: notaTemporal } : r));
      setReporteSeleccionado(prev => ({ ...prev, notas_internas: notaTemporal }));
      alert("Nota interna guardada con éxito.");
    }
  };

  const guardarCambiosUsuario = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('usuarios')
      .update({
        nombre: usuarioAEditar.nombre,
        cedula: usuarioAEditar.cedula,
        rol: usuarioAEditar.rol,
        estado_cuenta: usuarioAEditar.estado_cuenta
      })
      .eq('id', usuarioAEditar.id);

    if (error) {
      alert("Error actualizando usuario: " + error.message);
    } else {
      setUsuariosDb(prev => prev.map(u => u.id === usuarioAEditar.id ? { ...u, ...usuarioAEditar } : u));
      setUsuarioAEditar(null);
    }
  };

  const toggleEstadoUsuario = async (user) => {
    const nuevoEstado = user.estado_cuenta === 'suspendido' ? 'activo' : 'suspendido';
    const { error } = await supabase
      .from('usuarios')
      .update({ estado_cuenta: nuevoEstado })
      .eq('id', user.id);

    if (error) {
      alert("Error actualizando estado del usuario: " + error.message);
    } else {
      setUsuariosDb(prev => prev.map(u => u.id === user.id ? { ...u, estado_cuenta: nuevoEstado } : u));
    }
  };

  const accionMasiva = async (nuevoEstado) => {
    if (reportesSeleccionados.length === 0) return;
    if (!window.confirm(`¿Marcar ${reportesSeleccionados.length} reportes como ${nuevoEstado}?`)) return;

    const { error } = await supabase
      .from('reportes')
      .update({ estado: nuevoEstado })
      .in('id', reportesSeleccionados);

    if (error) {
      alert("Error en acción masiva: " + error.message);
    } else {
      setReportesDb(prev => prev.map(r => reportesSeleccionados.includes(r.id) ? { ...r, estado: nuevoEstado } : r));
      setReportesSeleccionados([]);
    }
  };

  const toggleSeleccionReporte = (id) => {
    setReportesSeleccionados(prev =>
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  // Acciones en DB (Especies)
  const abrirModalNuevaEspecie = () => {
    setEspecieAEditar({ nombre: '', nombre_cientifico: '', tipo: 'Anida', descripcion: '', protocolo_accion: '', imagen_url: '' });
    setArchivoImagen(null);
  };

  const guardarEspecie = async (e) => {
    e.preventDefault();
    setSubiendoImagen(true);
    let urlImagen = especieAEditar.imagen_url;

    try {
      if (archivoImagen) {
        const fileExt = archivoImagen.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('imagenes_especies')
          .upload(filePath, archivoImagen);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('imagenes_especies')
          .getPublicUrl(filePath);

        urlImagen = publicUrl;
      }

      const payload = {
        nombre: especieAEditar.nombre,
        nombre_cientifico: especieAEditar.nombre_cientifico,
        tipo: especieAEditar.tipo,
        descripcion: especieAEditar.descripcion,
        protocolo_accion: especieAEditar.protocolo_accion,
        imagen_url: urlImagen
      };

      if (especieAEditar.id) {
        const { error } = await supabase.from('especies').update(payload).eq('id', especieAEditar.id);
        if (error) throw error;
        setEspeciesDb(prev => prev.map(esp => esp.id === especieAEditar.id ? { ...esp, ...payload } : esp));
      } else {
        const { data, error } = await supabase.from('especies').insert([payload]).select();
        if (error) throw error;
        if (data) setEspeciesDb(prev => [data[0], ...prev]);
      }

      setEspecieAEditar(null);
      setArchivoImagen(null);
      alert('Especie guardada exitosamente.');
    } catch (error) {
      alert("Error guardando especie: " + error.message);
    } finally {
      setSubiendoImagen(false);
    }
  };

  const eliminarEspecie = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta especie?")) return;
    const { error } = await supabase.from('especies').delete().eq('id', id);
    if (error) {
      alert("Error eliminando: " + error.message);
    } else {
      setEspeciesDb(prev => prev.filter(esp => esp.id !== id));
    }
  };

  // Funciones para Noticias
  const guardarNoticia = async (e) => {
    e.preventDefault();
    setSubiendoImagen(true);

    try {
      let urlImagen = noticiaAEditar.imagen_url;

      if (archivoImagen) {
        const fileExt = archivoImagen.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = fileName; // Directamente en la raíz del bucket 'noticias'

        const { error: uploadError } = await supabase.storage.from('noticias').upload(filePath, archivoImagen);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('noticias').getPublicUrl(filePath);
        urlImagen = publicUrl;
      }

      const payload = {
        titulo: noticiaAEditar.titulo,
        tipo: noticiaAEditar.tipo,
        resumen: noticiaAEditar.resumen,
        contenido: noticiaAEditar.contenido,
        imagen_url: urlImagen
      };

      if (noticiaAEditar.id) {
        const { error } = await supabase.from('noticias').update(payload).eq('id', noticiaAEditar.id);
        if (error) throw error;
        setNoticiasDb(prev => prev.map(n => n.id === noticiaAEditar.id ? { ...n, ...payload } : n));
      } else {
        const { data, error } = await supabase.from('noticias').insert([payload]).select();
        if (error) throw error;
        if (data) setNoticiasDb(prev => [data[0], ...prev]);
      }

      setNoticiaAEditar(null);
      setArchivoImagen(null);
      alert('Publicación guardada exitosamente.');
    } catch (error) {
      alert("Error guardando publicación: " + error.message);
    } finally {
      setSubiendoImagen(false);
    }
  };

  const eliminarNoticia = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta publicación?")) return;
    const { error } = await supabase.from('noticias').delete().eq('id', id);
    if (error) {
      alert("Error eliminando: " + error.message);
    } else {
      setNoticiasDb(prev => prev.filter(n => n.id !== id));
    }
  };

  // Badge de estado Premium
  const renderBadge = (estado) => {
    const estadoActual = estado || 'Pendiente';
    let clase = 'admin-dashboard-badge ';

    if (estadoActual === 'Pendiente') clase += 'badge-pendiente';
    if (estadoActual === 'En Proceso') clase += 'badge-proceso';
    if (estadoActual === 'Resuelto' || estadoActual === 'Activo') clase += 'badge-resuelto';
    if (estadoActual === 'Rechazado' || estadoActual === 'Suspendido') clase += 'badge-rechazado';

    return <span className={clase}>{estadoActual}</span>;
  };

  // Datos procesados (Filtrados, Paginados y para Gráficas)
  const reportesFiltradosPorFecha = reportesDb.filter(rep => aplicarFiltroFecha(rep.fecha));
  const usuariosFiltradosPorFecha = usuariosDb.filter(user => aplicarFiltroFecha(user.creado_en));
  const noticiasFiltradasPorFecha = noticiasDb.filter(noticia => aplicarFiltroFecha(noticia.fecha_publicacion));


  const reportesFiltrados = reportesFiltradosPorFecha.filter(rep => {
    const termino = busquedaReportes.toLowerCase();
    const idString = `rep-${rep.id}`.toLowerCase();
    const fechaString = rep.fecha ? new Date(rep.fecha).toLocaleDateString('es-VE').toLowerCase() : '';
    return (
      idString.includes(termino) ||
      (rep.categoria && rep.categoria.toLowerCase().includes(termino)) ||
      (rep.estado && rep.estado.toLowerCase().includes(termino)) ||
      fechaString.includes(termino)
    );
  });

  // Fetch dedicado para el Data Mart (RPCs)
  useEffect(() => {
    const fetchEstadisticasDataMart = async () => {
      setCargandoDataMart(true);
      
      let p_fecha_inicio = null;
      let p_fecha_fin = null;
      const hoyStr = new Date().toISOString().split('T')[0];

      if (filtroFechaGlobal === 'hoy') {
         p_fecha_inicio = hoyStr;
         p_fecha_fin = hoyStr;
      } else if (filtroFechaGlobal === 'semana') {
         const hace7 = new Date();
         hace7.setDate(hace7.getDate() - 7);
         p_fecha_inicio = hace7.toISOString().split('T')[0];
         p_fecha_fin = hoyStr;
      } else if (filtroFechaGlobal === 'mes') {
         const hoy = new Date();
         p_fecha_inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
         p_fecha_fin = hoyStr;
      } else if (filtroFechaGlobal !== 'todos') {
         p_fecha_inicio = filtroFechaGlobal;
         p_fecha_fin = filtroFechaGlobal;
      }

      const params = { p_fecha_inicio, p_fecha_fin };

      try {
        const [resCat, resEst, resEstCat, resEvo] = await Promise.all([
          supabase.rpc('get_stats_categoria', params),
          supabase.rpc('get_stats_estado', params),
          supabase.rpc('get_stats_estado_categoria', params),
          supabase.rpc('get_stats_evolucion', params)
        ]);

        if (resCat.error || resEst.error || resEstCat.error || resEvo.error) {
           throw new Error("RPC Error: Posiblemente las funciones no han sido creadas aún.");
        }

        setDatosDataMart({
          categoria: resCat.data || [],
          estado: resEst.data || [],
          estadoCategoria: resEstCat.data || [],
          evolucion: resEvo.data || []
        });

      } catch (error) {
         console.warn("Advertencia:", error.message);
         // Fallback manual procesado en el cliente (como estaba antes)
         const countsCat = {};
         const countsEst = {};
         const agrupadoCatEst = {};
         const countsEvo = {};

         reportesFiltradosPorFecha.forEach(rep => {
           // Categoria
           countsCat[rep.categoria] = (countsCat[rep.categoria] || 0) + 1;
           // Estado
           const st = rep.estado || 'Pendiente';
           countsEst[st] = (countsEst[st] || 0) + 1;
           // Categoria + Estado
           const cat = rep.categoria || 'Sin Categoría';
           if (!agrupadoCatEst[cat]) {
             agrupadoCatEst[cat] = { categoria: cat, 'Pendiente': 0, 'En proceso': 0, 'Resuelto': 0, 'Rechazado': 0 };
           }
           agrupadoCatEst[cat][st] = (agrupadoCatEst[cat][st] || 0) + 1;
           // Evolucion
           if (rep.fecha) {
             const fechaObj = new Date(rep.fecha);
             const diaStr = `${fechaObj.getDate().toString().padStart(2, '0')}/${(fechaObj.getMonth() + 1).toString().padStart(2, '0')}`;
             countsEvo[diaStr] = (countsEvo[diaStr] || 0) + 1;
           }
         });

         setDatosDataMart({
           categoria: Object.keys(countsCat).map(key => ({ categoria: key, total: countsCat[key] })),
           estado: Object.keys(countsEst).map(key => ({ estado: key, total: countsEst[key] })),
           estadoCategoria: Object.values(agrupadoCatEst),
           evolucion: Object.keys(countsEvo).slice(-7).map(key => ({ fecha: key, total: countsEvo[key] })).reverse()
         });
      }
      setCargandoDataMart(false);
    };
    
    // Solo consultamos si estamos viendo las estadísticas
    if (modulo === 'estadisticas') {
      fetchEstadisticasDataMart();
    }
  }, [filtroFechaGlobal, modulo, reportesFiltradosPorFecha]);


  const usuariosFiltrados = usuariosFiltradosPorFecha.filter(user => {
    const termino = busquedaUsuarios.toLowerCase();
    const fechaRegistro = user.creado_en ? new Date(user.creado_en).toLocaleDateString('es-VE').toLowerCase() : '';
    return (
      (user.nombre && user.nombre.toLowerCase().includes(termino)) ||
      (user.apellido && user.apellido.toLowerCase().includes(termino)) ||
      (user.cedula && user.cedula.toLowerCase().includes(termino)) ||
      (user.rol && user.rol.toLowerCase().includes(termino)) ||
      fechaRegistro.includes(termino)
    );
  });

  const startIndexReportes = (paginaReportesActual - 1) * ELEMENTOS_POR_PAGINA;
  const reportesPaginados = reportesFiltrados.slice(startIndexReportes, startIndexReportes + ELEMENTOS_POR_PAGINA);
  const totalPaginasReportes = Math.ceil(reportesFiltrados.length / ELEMENTOS_POR_PAGINA);

  const startIndexUsuarios = (paginaUsuariosActual - 1) * ELEMENTOS_POR_PAGINA;
  const usuariosPaginados = usuariosFiltrados.slice(startIndexUsuarios, startIndexUsuarios + ELEMENTOS_POR_PAGINA);
  const totalPaginasUsuarios = Math.ceil(usuariosFiltrados.length / ELEMENTOS_POR_PAGINA);

  const especiesFiltradas = especiesDb.filter(esp => {
    const termino = busquedaEspecies.toLowerCase();
    return (
      (esp.nombre && esp.nombre.toLowerCase().includes(termino)) ||
      (esp.nombre_cientifico && esp.nombre_cientifico.toLowerCase().includes(termino)) ||
      (esp.tipo && esp.tipo.toLowerCase().includes(termino))
    );
  });

  const startIndexEspecies = (paginaEspeciesActual - 1) * ELEMENTOS_POR_PAGINA;
  const especiesPaginadas = especiesFiltradas.slice(startIndexEspecies, startIndexEspecies + ELEMENTOS_POR_PAGINA);
  const totalPaginasEspecies = Math.ceil(especiesFiltradas.length / ELEMENTOS_POR_PAGINA);

  const startIndexNoticias = (paginaNoticiasActual - 1) * ELEMENTOS_POR_PAGINA;
  const noticiasPaginadas = noticiasFiltradasPorFecha.slice(startIndexNoticias, startIndexNoticias + ELEMENTOS_POR_PAGINA);
  const totalPaginasNoticias = Math.ceil(noticiasFiltradasPorFecha.length / ELEMENTOS_POR_PAGINA);

  // Datos para Gráficas (Alimentados por el Data Mart RPC)
  const datosGraficaCategoria = useMemo(() => {
    return datosDataMart.categoria.map(item => ({ name: item.categoria, cantidad: Number(item.total) }));
  }, [datosDataMart.categoria]);

  const datosGraficaEstado = useMemo(() => {
    const colors = { 'Pendiente': '#f59e0b', 'En proceso': '#3b82f6', 'Resuelto': '#10b981', 'Rechazado': '#ef4444' };
    return datosDataMart.estado.map(item => ({ 
      name: item.estado, 
      value: Number(item.total), 
      color: colors[item.estado] || '#94a3b8' 
    }));
  }, [datosDataMart.estado]);

  const datosGraficaEstadoPorCategoria = useMemo(() => {
    // Si viene del fallback ya está agrupado, si viene del RPC hay que mapearlo para Recharts
    if (datosDataMart.estadoCategoria.length > 0 && datosDataMart.estadoCategoria[0].hasOwnProperty('Pendiente')) {
       return datosDataMart.estadoCategoria;
    }
    
    const agrupado = datosDataMart.estadoCategoria.reduce((acc, curr) => {
      const cat = curr.categoria || 'Sin Categoría';
      const est = curr.estado || 'Pendiente';
      
      if (!acc[cat]) {
        acc[cat] = { categoria: cat, 'Pendiente': 0, 'En proceso': 0, 'Resuelto': 0, 'Rechazado': 0 };
      }
      acc[cat][est] = Number(curr.total);
      return acc;
    }, {});
    return Object.values(agrupado);
  }, [datosDataMart.estadoCategoria]);

  const datosGraficaEvolucion = useMemo(() => {
    // Recharts espera un array de { fecha: string, reportes: number }
    const mapped = datosDataMart.evolucion.map(item => {
      let f = item.fecha;
      // Si viene del RPC, la fecha es YYYY-MM-DD
      if (f && f.includes('-')) {
        const p = f.split('-');
        if (p.length === 3) f = `${p[2]}/${p[1]}`;
      }
      return { fecha: f, reportes: Number(item.total) };
    });
    
    // Si la lista ya está al revés (fallback) no hacemos reverse, sino dependemos del RPC (que manda ORDER BY DESC)
    return mapped.reverse();
  }, [datosDataMart.evolucion]);

  const reportesAgrupadosMapa = useMemo(() => {
    const agrupados = {};
    reportesFiltradosPorFecha
      .filter(rep => {
        // Si filtroEstadoMapa está vacío, mostramos todos. Si no, filtramos por los seleccionados.
        if (filtroEstadoMapa.length === 0) return true;
        const estadoReporte = rep.estado || 'Pendiente';
        return filtroEstadoMapa.includes(estadoReporte);
      })
      .forEach(rep => {
        if (rep.latitud && rep.longitud) {
          // Redondear un poco para agrupar coordenadas extremadamente cercanas
          const key = `${Number(rep.latitud).toFixed(5)}_${Number(rep.longitud).toFixed(5)}`;
          if (!agrupados[key]) {
            agrupados[key] = {
              latitud: rep.latitud,
              longitud: rep.longitud,
              reportes: []
            };
          }
          agrupados[key].reportes.push(rep);
        }
      });
    return Object.values(agrupados);
  }, [reportesFiltradosPorFecha, filtroEstadoMapa]);

  const crearIconoMarcador = (reportesGrupo) => {
    const colores = {
      'Fauna': '#10b981', // Verde
      'Desechos': '#ef4444', // Rojo
      'Actividad Antrópica': '#f59e0b', // Naranja/Ambar
    };
    
    const cantidad = reportesGrupo.length;
    const primeraCat = reportesGrupo[0]?.categoria;
    const todasMismaCat = reportesGrupo.every(r => r.categoria === primeraCat);
    
    // Si todos son de la misma categoría, usar ese color. Si están mezclados, usar un gris oscuro.
    const colorFondo = todasMismaCat ? (colores[primeraCat] || '#64748b') : '#334155';
    
    const html = `
      <div style="
        background-color: ${colorFondo};
        width: 26px;
        height: 26px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${cantidad > 1 ? `<span style="transform: rotate(45deg); color: white; font-size: 11px; font-weight: bold;">${cantidad}</span>` : ''}
      </div>
    `;

    return L.divIcon({
      html: html,
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 26],
      popupAnchor: [0, -26]
    });
  };

  const renderModulo = () => {
    switch (modulo) {
      case 'mapa':
        return (
          <div key={modulo} className="admin-dashboard-animacion-paso admin-dashboard-hub-layout">
            <h2 className="admin-dashboard-titulo-modulo">Centro de Control</h2>

            {/* KPIs */}
            <div className="admin-dashboard-kpi-row">
              <div className="admin-dashboard-kpi-card">
                <div className="admin-dashboard-kpi-valor">{reportesFiltradosPorFecha.length}</div>
                <div className="admin-dashboard-kpi-etiqueta">Total Reportes</div>
              </div>
              <div className="admin-dashboard-kpi-card critico">
                <div className="admin-dashboard-kpi-valor">{reportesFiltradosPorFecha.filter(r => r.es_peligroso).length}</div>
                <div className="admin-dashboard-kpi-etiqueta">Peligro Inminente</div>
              </div>
              <div className="admin-dashboard-kpi-card activo">
                <div className="admin-dashboard-kpi-valor">{reportesFiltradosPorFecha.filter(r => r.estado === 'Pendiente' || !r.estado).length}</div>
                <div className="admin-dashboard-kpi-etiqueta">Requieren Atención</div>
              </div>
            </div>

            {/* Split View */}
            <div className="admin-dashboard-split-view">
              <div className="admin-dashboard-map-container" style={{ position: 'relative' }}>
                
              {/* Filtros de estado del mapa */}
                <div style={{
                  position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
                  zIndex: 1000, display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.95)',
                  padding: '8px 12px', borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0', backdropFilter: 'blur(4px)'
                }}>
                  {['Pendiente', 'En Proceso', 'Resuelto', 'Rechazado'].map(estado => {
                    const activo = filtroEstadoMapa.includes(estado);
                    const coloresEstado = {
                      'Pendiente': '#f59e0b',
                      'En Proceso': '#3b82f6',
                      'Resuelto': '#10b981',
                      'Rechazado': '#ef4444',
                    };
                    return (
                      <button
                        key={estado}
                        onClick={() => {
                          setFiltroEstadoMapa(prev =>
                            prev.includes(estado)
                              ? prev.filter(e => e !== estado)
                              : [...prev, estado]
                          );
                        }}
                        style={{
                          padding: '4px 12px', borderRadius: '20px', border: `2px solid ${coloresEstado[estado]}`,
                          background: activo ? coloresEstado[estado] : 'transparent',
                          color: activo ? 'white' : coloresEstado[estado],
                          cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        {estado}
                      </button>
                    );
                  })}
                </div>

                {/* Leyenda del Mapa */}
                <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '12px 15px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '0.85rem', backdropFilter: 'blur(4px)', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--admin-text-principal)', fontWeight: '700' }}>Categorías</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%' }}></div> <span style={{color: 'var(--admin-text-secundario)', fontWeight: '500'}}>Fauna</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '50%' }}></div> <span style={{color: 'var(--admin-text-secundario)', fontWeight: '500'}}>Desechos</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '50%' }}></div> <span style={{color: 'var(--admin-text-secundario)', fontWeight: '500'}}>Act. Antrópica</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#334155', borderRadius: '50%' }}></div> <span style={{color: 'var(--admin-text-secundario)', fontWeight: '500'}}>Múltiples / Mixto</span>
                  </div>
                </div>

                <MapContainer center={[10.985, -64.120]} zoom={11} minZoom={10} maxZoom={18} maxBounds={[[10.75, -64.55], [11.25, -63.70]]} maxBoundsViscosity={1.0} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  {reportesAgrupadosMapa.map((grupo, index) => (
                    <Marker key={index} position={[grupo.latitud, grupo.longitud]} icon={crearIconoMarcador(grupo.reportes)}>
                      <Popup>
                        {grupo.reportes.length > 1 ? (
                          <div style={{ minWidth: '180px' }}>
                            <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--admin-acento)' }}>📍 {grupo.reportes.length} reportes aquí</strong>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                              {grupo.reportes.map(r => (
                                <div key={r.id} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
                                  <strong style={{ fontSize: '0.9rem', color: 'var(--admin-text-principal)' }}>{r.categoria}</strong>
                                  <div style={{ margin: '4px 0' }}>{renderBadge(r.estado)}</div>
                                  <small style={{ color: 'var(--admin-text-secundario)' }}>{new Date(r.fecha).toLocaleDateString('es-VE')}</small>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ minWidth: '150px' }}>
                            <strong style={{ fontSize: '1rem', color: 'var(--admin-text-principal)' }}>{grupo.reportes[0].categoria}</strong>
                            <div style={{ margin: '8px 0' }}>{renderBadge(grupo.reportes[0].estado)}</div>
                            <small style={{ color: 'var(--admin-text-secundario)' }}>{new Date(grupo.reportes[0].fecha).toLocaleDateString('es-VE')}</small>
                          </div>
                        )}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              <div className="admin-dashboard-timeline">
                <h3>Actividad Reciente</h3>
                {reportesDb.slice(0, 10).map(r => (
                  <div key={r.id} className="admin-timeline-item">
                    <span className="admin-timeline-time">{new Date(r.fecha).toLocaleString('es-VE')}</span>
                    <span className="admin-timeline-text">Reporte de <strong>{r.categoria}</strong> en estado {r.estado || 'Pendiente'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'reportes':
        return (
          <div key={modulo} className="admin-dashboard-animacion-paso">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="admin-dashboard-titulo-modulo" style={{ margin: 0 }}>Gestión de Reportes</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="admin-btn admin-btn-success" onClick={() => {
                  const dataExport = reportesFiltrados.map(r => ({
                    ID: r.id.substring(0,8),
                    Fecha: new Date(r.fecha).toLocaleDateString('es-VE'),
                    Categoría: r.categoria,
                    Estado: r.estado,
                    Descripción: r.descripcion,
                    Actualizado: new Date(r.actualizado_en).toLocaleDateString('es-VE')
                  }));
                  generarCSV(dataExport, 'reportes_sicmgta.csv');
                }}>
                  Exportar CSV
                </button>
                <button className="admin-btn admin-btn-outline" style={{ borderColor: 'var(--admin-danger)', color: 'var(--admin-danger)' }} onClick={() => {
                  const dataExport = reportesFiltrados.map(r => ({
                    ID: r.id.substring(0,8),
                    Fecha: new Date(r.fecha).toLocaleDateString('es-VE'),
                    Categoría: r.categoria,
                    Estado: r.estado,
                    Descripción: r.descripcion,
                    Actualizado: new Date(r.actualizado_en).toLocaleDateString('es-VE')
                  }));
                  generarPDF(dataExport, 'reportes_sicmgta.pdf', 'Reporte de Incidencias SIC-MGTA');
                }}>
                  Exportar PDF
                </button>
              </div>
            </div>

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Buscar por ID, Categoría o Estado..."
                className="admin-dashboard-busqueda-input"
                style={{ marginBottom: 0 }}
                value={busquedaReportes}
                onChange={(e) => { 
                  setBusquedaReportes(validarTexto('busquedaReportes', e.target.value, 30)); 
                  setPaginaReportesActual(1); 
                }}
              />
              {advertencias.busquedaReportes && <span className="admin-advertencia" style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-18px', left: '10px' }}>{advertencias.busquedaReportes}</span>}
            </div>

            {reportesSeleccionados.length > 0 && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--admin-text-principal)' }}>{reportesSeleccionados.length} seleccionados</span>
                <button onClick={() => accionMasiva('En Proceso')} className="admin-btn admin-btn-primary">A "En Proceso"</button>
                <button onClick={() => accionMasiva('Resuelto')} className="admin-btn admin-btn-success">A "Resuelto"</button>
              </div>
            )}

            <div className="admin-dashboard-tabla-wrapper">
              <table className="admin-dashboard-tabla">
                <thead>
                  <tr>
                    <th><input type="checkbox" onChange={(e) => {
                      if (e.target.checked) setReportesSeleccionados(reportesPaginados.map(r => r.id));
                      else setReportesSeleccionados([]);
                    }} /></th>
                    <th>Fecha de Reporte</th>
                    <th>Categoría</th>
                    <th>Ubicación</th>
                    <th>Última Actualización</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoReportes ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</td></tr>
                  ) : reportesPaginados.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No hay resultados.</td></tr>
                  ) : (
                    reportesPaginados.map((rep) => (
                      <tr key={rep.id}>
                        <td>
                          <input type="checkbox" checked={reportesSeleccionados.includes(rep.id)} onChange={() => toggleSeleccionReporte(rep.id)} />
                        </td>
                        <td>{new Date(rep.fecha).toLocaleDateString('es-VE')}</td>
                        <td>{rep.categoria}</td>
                        <td title={rep.coordenadas}>{rep.coordenadas ? rep.coordenadas.split('(')[0] : 'N/A'}</td>
                        <td>{rep.actualizado_en ? new Date(rep.actualizado_en).toLocaleDateString('es-VE') : 'N/A'}</td>
                        <td>{renderBadge(rep.estado)}</td>
                        <td style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                          <button className="admin-btn-icon-only action-neutral" title="Ver Detalles" onClick={() => { setReporteSeleccionado(rep); setNotaTemporal(rep.notas_internas || ''); }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          {rep.estado !== 'En Proceso' && (
                            <button className="admin-btn-icon-only action-primary" title="Marcar En Proceso" onClick={() => cambiarEstadoReporte(rep.id, 'En Proceso')}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </button>
                          )}
                          {rep.estado !== 'Resuelto' && (
                            <button className="admin-btn-icon-only action-success" title="Resolver" onClick={() => cambiarEstadoReporte(rep.id, 'Resuelto')}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            </button>
                          )}
                          {rep.estado !== 'Rechazado' && (
                            <button className="admin-btn-icon-only action-danger" title="Rechazar" onClick={() => cambiarEstadoReporte(rep.id, 'Rechazado')}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {/* Controles de Paginación */}
              {totalPaginasReportes > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                  <button className="admin-btn admin-btn-outline" disabled={paginaReportesActual === 1} onClick={() => setPaginaReportesActual(p => p - 1)}>Anterior</button>
                  <span style={{ alignSelf: 'center', color: 'var(--admin-text-secundario)' }}>Página {paginaReportesActual} de {totalPaginasReportes}</span>
                  <button className="admin-btn admin-btn-outline" disabled={paginaReportesActual === totalPaginasReportes} onClick={() => setPaginaReportesActual(p => p + 1)}>Siguiente</button>
                </div>
              )}
            </div>
          </div>
        );

      case 'usuarios':
        return (
          <div key={modulo} className="admin-dashboard-animacion-paso">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="admin-dashboard-titulo-modulo" style={{ margin: 0 }}>Control de Usuarios</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="admin-btn admin-btn-success" onClick={() => {
                  const dataExport = usuariosFiltrados.map(u => ({
                    Email: u.email,
                    Rol: u.rol,
                    Registrado: new Date(u.creado_en).toLocaleDateString('es-VE')
                  }));
                  generarCSV(dataExport, 'usuarios_sicmgta.csv');
                }}>
                  Exportar CSV
                </button>
                <button className="admin-btn admin-btn-outline" style={{ borderColor: 'var(--admin-danger)', color: 'var(--admin-danger)' }} onClick={() => {
                  const dataExport = usuariosFiltrados.map(u => ({
                    Email: u.email,
                    Rol: u.rol,
                    Registrado: new Date(u.creado_en).toLocaleDateString('es-VE')
                  }));
                  generarPDF(dataExport, 'usuarios_sicmgta.pdf', 'Listado de Usuarios SIC-MGTA');
                }}>
                  Exportar PDF
                </button>
              </div>
            </div>

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Buscar usuarios..."
                className="admin-dashboard-busqueda-input"
                style={{ marginBottom: 0 }}
                value={busquedaUsuarios}
                onChange={(e) => { 
                  setBusquedaUsuarios(validarTexto('busquedaUsuarios', e.target.value, 30)); 
                  setPaginaUsuariosActual(1); 
                }}
              />
              {advertencias.busquedaUsuarios && <span className="admin-advertencia" style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-18px', left: '10px' }}>{advertencias.busquedaUsuarios}</span>}
            </div>

            <div className="admin-dashboard-tabla-wrapper">
              <table className="admin-dashboard-tabla">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Cédula</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoUsuarios ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</td></tr>
                  ) : usuariosPaginados.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No hay resultados.</td></tr>
                  ) : (
                    usuariosPaginados.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.nombre} {user.apellido}</strong></td>
                        <td>{user.cedula}</td>
                        <td style={{ textTransform: 'capitalize' }}>{user.rol}</td>
                        <td>{renderBadge(user.estado_cuenta === 'suspendido' ? 'Suspendido' : 'Activo')}</td>
                        <td>{user.creado_en ? new Date(user.creado_en).toLocaleDateString('es-VE') : 'N/A'}</td>
                        <td style={{ display: 'flex', gap: '0.2rem' }}>
                          <button className="admin-btn-icon-only action-neutral" title="Editar Usuario" onClick={() => setUsuarioAEditar({ ...user, estado_cuenta: user.estado_cuenta || 'activo' })}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                          </button>
                          <button 
                            className={`admin-btn-icon-only ${user.estado_cuenta === 'suspendido' ? 'action-success' : 'action-danger'}`} 
                            title={user.estado_cuenta === 'suspendido' ? 'Activar Usuario' : 'Desactivar Usuario'}
                            onClick={() => toggleEstadoUsuario(user)}
                          >
                            {user.estado_cuenta === 'suspendido' ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {/* Controles de Paginación */}
              {totalPaginasUsuarios > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                  <button className="admin-btn admin-btn-outline" disabled={paginaUsuariosActual === 1} onClick={() => setPaginaUsuariosActual(p => p - 1)}>Anterior</button>
                  <span style={{ alignSelf: 'center', color: 'var(--admin-text-secundario)' }}>Página {paginaUsuariosActual} de {totalPaginasUsuarios}</span>
                  <button className="admin-btn admin-btn-outline" disabled={paginaUsuariosActual === totalPaginasUsuarios} onClick={() => setPaginaUsuariosActual(p => p + 1)}>Siguiente</button>
                </div>
              )}
            </div>
          </div>
        );

      case 'estadisticas':
        let textoPeriodo = 'Histórico completo';
        if (filtroFechaGlobal === 'hoy') textoPeriodo = 'Hoy';
        else if (filtroFechaGlobal === 'semana') textoPeriodo = 'Últimos 7 días';
        else if (filtroFechaGlobal === 'mes') textoPeriodo = 'Este mes';
        else if (filtroFechaGlobal !== 'todos' && filtroFechaGlobal.match(/^\d{4}-\d{2}-\d{2}$/)) {
          textoPeriodo = new Date(filtroFechaGlobal + 'T12:00:00Z').toLocaleDateString('es-VE');
        }

        const COLORES_BARRAS = ['#0284C7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];
        const totalReportesPeriodo = reportesFiltradosPorFecha.length;

        const CustomTooltip = ({ active, payload, label }) => {
          if (active && payload && payload.length) {
            // Filtrar los valores que son 0 para no saturar el tooltip
            const payloadFiltrado = payload.filter(p => p.value > 0);
            
            if (payloadFiltrado.length === 0) return null;

            return (
              <div style={{ backgroundColor: '#ffffff', padding: '10px 15px', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)', zIndex: 9999, position: 'relative' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '5px', color: 'var(--admin-text-principal)' }}>{label || 'Detalle'}</p>
                {payloadFiltrado.map((p, index) => {
                  const valor = p.value || 0;
                  const porcentaje = totalReportesPeriodo > 0 ? ((valor / totalReportesPeriodo) * 100).toFixed(1) : 0;
                  return (
                    <div key={index} style={{ marginBottom: '5px' }}>
                      <p style={{ color: p.color || p.fill || 'var(--admin-text-principal)', fontWeight: '600' }}>
                        {p.name}: {valor}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-secundario)' }}>
                        Fórmula: ({valor} / {totalReportesPeriodo} totales) * 100 = {porcentaje}%
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          }
          return null;
        };

        return (
          <div key={modulo} className="admin-dashboard-animacion-paso">
            <h2 className="admin-dashboard-titulo-modulo">Estadísticas de Incidencias</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

              <div className="admin-dashboard-tarjeta" style={{ height: '350px' }}>
                <h3 style={{ marginBottom: '0.2rem', color: 'var(--admin-text-principal)', textAlign: 'center', fontWeight: '600' }}>Reportes por Categoría</h3>
                <p style={{ textAlign: 'center', color: 'var(--admin-text-secundario)', fontSize: '0.85rem', marginBottom: '1rem' }}>Período: {textoPeriodo}</p>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={datosGraficaCategoria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="var(--admin-text-secundario)" />
                    <YAxis allowDecimals={false} stroke="var(--admin-text-secundario)" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {datosGraficaCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORES_BARRAS[index % COLORES_BARRAS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="admin-dashboard-tarjeta" style={{ height: '350px' }}>
                <h3 style={{ marginBottom: '0.2rem', color: 'var(--admin-text-principal)', textAlign: 'center', fontWeight: '600' }}>Estado por Categoría</h3>
                <p style={{ textAlign: 'center', color: 'var(--admin-text-secundario)', fontSize: '0.85rem', marginBottom: '1rem' }}>Período: {textoPeriodo}</p>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={datosGraficaEstadoPorCategoria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="categoria" stroke="var(--admin-text-secundario)" />
                    <YAxis allowDecimals={false} stroke="var(--admin-text-secundario)" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Pendiente" stackId="a" fill="#f59e0b" isAnimationActive={false} />
                    <Bar dataKey="En proceso" stackId="a" fill="#3b82f6" isAnimationActive={false} />
                    <Bar dataKey="Resuelto" stackId="a" fill="#10b981" isAnimationActive={false} />
                    <Bar dataKey="Rechazado" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="admin-dashboard-tarjeta" style={{ height: '350px' }}>
                <h3 style={{ marginBottom: '0.2rem', color: 'var(--admin-text-principal)', textAlign: 'center', fontWeight: '600' }}>Estado de Reportes</h3>
                <p style={{ textAlign: 'center', color: 'var(--admin-text-secundario)', fontSize: '0.85rem', marginBottom: '1rem' }}>Período: {textoPeriodo}</p>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie data={datosGraficaEstado} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label isAnimationActive={false}>
                      {datosGraficaEstado.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="admin-dashboard-tarjeta" style={{ height: '350px', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '0.2rem', color: 'var(--admin-text-principal)', textAlign: 'center', fontWeight: '600' }}>Evolución de Reportes (Últimos días)</h3>
                <p style={{ textAlign: 'center', color: 'var(--admin-text-secundario)', fontSize: '0.85rem', marginBottom: '1rem' }}>Período: {textoPeriodo}</p>
                <ResponsiveContainer width="100%" height="80%">
                  <LineChart data={datosGraficaEvolucion}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="fecha" stroke="var(--admin-text-secundario)" />
                    <YAxis allowDecimals={false} stroke="var(--admin-text-secundario)" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="reportes" stroke="var(--admin-verde)" strokeWidth={3} activeDot={{ r: 8 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

            </div>
          </div>
        );

      case 'noticias':
        return (
          <div key={modulo} className="admin-dashboard-animacion-paso admin-dashboard-hub-layout">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="admin-dashboard-titulo-modulo">Novedades y Acciones</h2>
                <p style={{ color: 'var(--admin-text-secundario)', marginTop: '0.5rem' }}>Administra las noticias, logros y eventos de capacitación.</p>
              </div>
              <button 
                className="admin-btn admin-btn-primary" 
                onClick={() => setNoticiaAEditar({ titulo: '', resumen: '', contenido: '', tipo: 'Noticia', imagen_url: '' })}
              >
                + Nueva Publicación
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {cargandoNoticias ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--admin-text-secundario)' }}>Cargando publicaciones...</div>
              ) : noticiasPaginadas.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--admin-text-secundario)' }}>No hay publicaciones registradas.</div>
              ) : (
                noticiasPaginadas.map((noticia) => (
                  <div key={noticia.id} className="admin-noticia-card">
                    <div className="admin-noticia-card-img-wrapper">
                      {noticia.imagen_url ? (
                        <img src={noticia.imagen_url} alt={noticia.titulo} className="admin-noticia-card-img" />
                      ) : (
                        <div className="admin-noticia-card-placeholder">📰</div>
                      )}
                      <div className="admin-noticia-card-badge-container">
                        {renderBadge(noticia.tipo)}
                      </div>
                    </div>
                    <div className="admin-noticia-card-content">
                      <h3 className="admin-noticia-card-title">{noticia.titulo}</h3>
                      <p className="admin-noticia-card-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px', verticalAlign: 'middle', marginTop: '-2px'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        {new Date(noticia.fecha_publicacion).toLocaleDateString('es-VE')}
                      </p>
                      
                      <div className="admin-noticia-card-actions">
                        <button className="admin-btn admin-noticia-btn-edit" onClick={() => setNoticiaAEditar(noticia)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          Editar
                        </button>
                        <button className="admin-btn admin-noticia-btn-delete" onClick={() => eliminarNoticia(noticia.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

              {totalPaginasNoticias > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', padding: '1.5rem' }}>
                  <button className="admin-btn admin-btn-outline" disabled={paginaNoticiasActual === 1} onClick={() => setPaginaNoticiasActual(p => p - 1)}>Anterior</button>
                  <span style={{ alignSelf: 'center', color: 'var(--admin-text-secundario)' }}>Página {paginaNoticiasActual} de {totalPaginasNoticias}</span>
                  <button className="admin-btn admin-btn-outline" disabled={paginaNoticiasActual === totalPaginasNoticias} onClick={() => setPaginaNoticiasActual(p => p + 1)}>Siguiente</button>
                </div>
              )}
          </div>
        );

      case 'especies':
        return (
          <div key={modulo} className="admin-dashboard-animacion-paso">
            <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h2 className="admin-dashboard-titulo-modulo" style={{margin:0}}>Catálogo de Especies</h2>
              <div style={{display:'flex', gap:'1rem'}}>
                <button className="admin-btn admin-btn-success" onClick={() => {
                  const dataExport = especiesFiltradas.map(e => ({
                    Nombre: e.nombre,
                    Nombre_Científico: e.nombre_cientifico,
                    Tipo: e.tipo,
                    Descripción: e.descripcion,
                    URL_Imagen: e.imagen_url,
                    Registrada: new Date(e.creado_en).toLocaleDateString('es-VE')
                  }));
                  generarCSV(dataExport, 'especies_sicmgta.csv');
                }}>Exportar CSV</button>
                <button className="admin-btn admin-btn-outline" style={{ borderColor: 'var(--admin-danger)', color: 'var(--admin-danger)' }} onClick={() => {
                  const dataExport = especiesFiltradas.map(e => ({
                    Nombre: e.nombre,
                    Nombre_Científico: e.nombre_cientifico,
                    Tipo: e.tipo,
                    Descripción: e.descripcion,
                    URL_Imagen: e.imagen_url,
                    Registrada: new Date(e.creado_en).toLocaleDateString('es-VE')
                  }));
                  generarPDF(dataExport, 'especies_sicmgta.pdf', 'Catálogo de Especies SIC-MGTA');
                }}>Exportar PDF</button>
                <button className="admin-btn admin-btn-primary" onClick={abrirModalNuevaEspecie}>+ Nueva Especie</button>
              </div>
            </div>

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                placeholder="Buscar especies por nombre, científico o tipo..." 
                className="admin-dashboard-busqueda-input"
                style={{ marginBottom: 0 }}
                value={busquedaEspecies}
                onChange={(e) => { 
                  setBusquedaEspecies(validarTexto('busquedaEspecies', e.target.value, 30)); 
                  setPaginaEspeciesActual(1); 
                }}
              />
              {advertencias.busquedaEspecies && <span className="admin-advertencia" style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-18px', left: '10px' }}>{advertencias.busquedaEspecies}</span>}
            </div>

            <div className="admin-dashboard-tabla-wrapper">
              <table className="admin-dashboard-tabla">
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>Nombre</th>
                    <th>Nombre Científico</th>
                    <th>Tipo (Categoría)</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoEspecies ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</td></tr>
                  ) : especiesPaginadas.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay resultados.</td></tr>
                  ) : (
                    especiesPaginadas.map((esp) => (
                      <tr key={esp.id}>
                        <td>
                          {esp.imagen_url ? <img src={esp.imagen_url} alt={esp.nombre} style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'8px'}} /> : <span style={{color:'var(--admin-text-secundario)'}}>N/A</span>}
                        </td>
                        <td><strong>{esp.nombre}</strong></td>
                        <td><i>{esp.nombre_cientifico}</i></td>
                        <td><span className={`admin-dashboard-badge ${esp.tipo === 'Anida' ? 'badge-proceso' : esp.tipo === 'Encalla' ? 'badge-pendiente' : 'badge-rechazado'}`}>{esp.tipo}</span></td>
                        <td style={{ display: 'flex', gap: '0.2rem' }}>
                          <button className="admin-btn-icon-only action-neutral" title="Editar Especie" onClick={() => { setEspecieAEditar(esp); setArchivoImagen(null); }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                          </button>
                          <button className="admin-btn-icon-only action-danger" title="Eliminar Especie" onClick={() => eliminarEspecie(esp.id)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {totalPaginasEspecies > 1 && (
                <div style={{display:'flex', justifyContent:'center', gap:'1rem', marginTop:'2rem'}}>
                  <button className="admin-btn admin-btn-outline" disabled={paginaEspeciesActual === 1} onClick={() => setPaginaEspeciesActual(p => p - 1)}>Anterior</button>
                  <span style={{alignSelf:'center', color:'var(--admin-text-secundario)'}}>Página {paginaEspeciesActual} de {totalPaginasEspecies}</span>
                  <button className="admin-btn admin-btn-outline" disabled={paginaEspeciesActual === totalPaginasEspecies} onClick={() => setPaginaEspeciesActual(p => p + 1)}>Siguiente</button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="admin-dashboard-layout">
      <AdminFAB setModulo={setModulo} />

      <main className="admin-dashboard-modulo-contenedor">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', animation: 'adminFadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          {renderFiltroFecha()}
        </div>
        {renderModulo()}
      </main>

      {/* DRAWER: Detalles del Reporte */}
      {reporteSeleccionado && (
        <div className="admin-drawer-overlay" onClick={() => setReporteSeleccionado(null)}>
          <div className="admin-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-header">
              <h3 className="admin-drawer-title">
                REP-{reporteSeleccionado.id.toString().substring(0, 6).toUpperCase()}
              </h3>
              <button className="admin-drawer-close" onClick={() => setReporteSeleccionado(null)}>×</button>
            </div>

            <div className="admin-drawer-body">
              <div className="admin-drawer-item">
                <span className="admin-drawer-label">Categoría</span>
                <span className="admin-drawer-value">{reporteSeleccionado.categoria}</span>
              </div>
              <div className="admin-drawer-item">
                <span className="admin-drawer-label">Fecha</span>
                <span className="admin-drawer-value">{new Date(reporteSeleccionado.fecha).toLocaleString('es-VE')}</span>
              </div>
              <div className="admin-drawer-item">
                <span className="admin-drawer-label">Descripción</span>
                <span className="admin-drawer-value" style={{ fontWeight: 'normal' }}>{reporteSeleccionado.descripcion}</span>
              </div>
              <div className="admin-drawer-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="admin-drawer-label" style={{ margin: 0 }}>Estado Actual</span>
                {renderBadge(reporteSeleccionado.estado)}
              </div>

              {reporteSeleccionado.foto_url && (
                <img src={reporteSeleccionado.foto_url} alt="Evidencia" className="admin-drawer-img" />
              )}

              <div className="admin-drawer-item" style={{ marginTop: '1rem' }}>
                <span className="admin-drawer-label" style={{ color: 'var(--admin-acento)' }}>Notas Internas (Admin)</span>
                <textarea
                  value={notaTemporal}
                  onChange={(e) => setNotaTemporal(e.target.value)}
                  placeholder="Ej: Se envió brigada el martes..."
                  rows="3"
                  className="admin-form-input"
                  style={{ marginTop: '0.5rem', resize: 'vertical' }}
                />
                <button onClick={guardarNotaInterna} className="admin-btn admin-btn-outline" style={{ marginTop: '0.8rem', width: '100%' }}>Guardar Nota</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: Edición de Usuario */}
      {usuarioAEditar && (
        <div className="admin-drawer-overlay" onClick={() => setUsuarioAEditar(null)}>
          <div className="admin-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-header">
              <h3 className="admin-drawer-title">Editar Usuario</h3>
              <button className="admin-drawer-close" onClick={() => setUsuarioAEditar(null)}>×</button>
            </div>

            <form onSubmit={guardarCambiosUsuario} className="admin-drawer-body">
              <div className="admin-drawer-item" style={{ position: 'relative' }}>
                <span className="admin-drawer-label">Nombre</span>
                <input type="text" value={usuarioAEditar.nombre || ''} onChange={(e) => setUsuarioAEditar({ ...usuarioAEditar, nombre: validarTexto('editUserNombre', e.target.value, 20, true, false) })} className="admin-form-input" placeholder="Nombre" />
                {advertencias.editUserNombre && <span className="admin-advertencia" style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-18px', left: '0' }}>{advertencias.editUserNombre}</span>}
              </div>
              <div className="admin-drawer-item" style={{ position: 'relative' }}>
                <span className="admin-drawer-label">Apellido</span>
                <input type="text" value={usuarioAEditar.apellido || ''} onChange={(e) => setUsuarioAEditar({ ...usuarioAEditar, apellido: validarTexto('editUserApellido', e.target.value, 20, true, false) })} className="admin-form-input" placeholder="Apellido" />
                {advertencias.editUserApellido && <span className="admin-advertencia" style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-18px', left: '0' }}>{advertencias.editUserApellido}</span>}
              </div>
              <div className="admin-drawer-item" style={{ position: 'relative' }}>
                <span className="admin-drawer-label">Cédula</span>
                <input type="text" value={usuarioAEditar.cedula || ''} onChange={(e) => setUsuarioAEditar({ ...usuarioAEditar, cedula: validarTexto('editUserCedula', e.target.value, 8, false, true) })} className="admin-form-input" />
                {advertencias.editUserCedula && <span className="admin-advertencia" style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-18px', left: '0' }}>{advertencias.editUserCedula}</span>}
              </div>
              <div className="admin-drawer-item">
                <span className="admin-drawer-label">Rol del Sistema</span>
                <select value={usuarioAEditar.rol || 'ciudadano'} onChange={(e) => setUsuarioAEditar({ ...usuarioAEditar, rol: e.target.value })} className="admin-form-input">
                  <option value="ciudadano">Ciudadano</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="admin-drawer-item">
                <span className="admin-drawer-label">Estado de la Cuenta</span>
                <select value={usuarioAEditar.estado_cuenta || 'activo'} onChange={(e) => setUsuarioAEditar({ ...usuarioAEditar, estado_cuenta: e.target.value })} className="admin-form-input" style={{ borderColor: usuarioAEditar.estado_cuenta === 'suspendido' ? 'var(--admin-rojo)' : 'var(--admin-border-cristal)' }}>
                  <option value="activo">Activo</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="admin-btn admin-btn-primary" style={{ flex: 1 }}>Guardar Cambios</button>
                <button type="button" className="admin-btn admin-btn-outline" onClick={() => setUsuarioAEditar(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: Edición/Nueva Especie */}
      {especieAEditar && (
        <div className="admin-drawer-overlay" onClick={() => setEspecieAEditar(null)}>
          <div className="admin-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-header">
              <h3 className="admin-drawer-title">{especieAEditar.id ? 'Editar Especie' : 'Nueva Especie'}</h3>
              <button className="admin-drawer-close" onClick={() => setEspecieAEditar(null)}>×</button>
            </div>
            
            <form onSubmit={guardarEspecie} className="admin-drawer-body">
              <div className="admin-drawer-item" style={{ position: 'relative' }}>
                <span className="admin-drawer-label">Nombre</span>
                <input type="text" required value={especieAEditar.nombre} onChange={(e) => setEspecieAEditar({...especieAEditar, nombre: validarTexto('editEspecieNombre', e.target.value, 50)})} className="admin-form-input" placeholder="Ej: Tortuga Cardón" />
                {advertencias.editEspecieNombre && <span className="admin-advertencia" style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-18px', left: '0' }}>{advertencias.editEspecieNombre}</span>}
              </div>
              <div className="admin-drawer-item" style={{ position: 'relative' }}>
                <span className="admin-drawer-label">Nombre Científico</span>
                <input type="text" required value={especieAEditar.nombre_cientifico} onChange={(e) => setEspecieAEditar({...especieAEditar, nombre_cientifico: validarTexto('editEspecieCientifico', e.target.value, 50)})} className="admin-form-input" placeholder="Ej: Dermochelys coriacea"/>
                {advertencias.editEspecieCientifico && <span className="admin-advertencia" style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-18px', left: '0' }}>{advertencias.editEspecieCientifico}</span>}
              </div>
              <div className="admin-drawer-item">
                <span className="admin-drawer-label">Categoría (Tipo)</span>
                <select value={especieAEditar.tipo} onChange={(e) => setEspecieAEditar({...especieAEditar, tipo: e.target.value})} className="admin-form-input">
                  <option value="Anida">Anida</option>
                  <option value="Encalla">Encalla</option>
                  <option value="Invasora">Invasora</option>
                </select>
              </div>
              <div className="admin-drawer-item" style={{ position: 'relative' }}>
                <span className="admin-drawer-label">Descripción</span>
                <div style={{ background: 'white', color: 'black', borderRadius: '4px' }}>
                  <ReactQuill theme="snow" value={especieAEditar.descripcion || ''} onChange={(val) => {
                    const rawText = val.replace(/<[^>]*>/g, '');
                    if (rawText.length <= 500) setEspecieAEditar({...especieAEditar, descripcion: val});
                    else setAdvertenciaTemporal('editEspecieDesc', 'Máximo 500 caracteres (aprox)');
                  }} placeholder="Descripción detallada..." />
                </div>
                {advertencias.editEspecieDesc && <span className="admin-advertencia" style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-18px', left: '0' }}>{advertencias.editEspecieDesc}</span>}
              </div>
              <div className="admin-drawer-item" style={{ position: 'relative' }}>
                <span className="admin-drawer-label">Protocolo de Acción</span>
                <div style={{ background: 'white', color: 'black', borderRadius: '4px' }}>
                  <ReactQuill theme="snow" value={especieAEditar.protocolo_accion || ''} onChange={(val) => {
                    const rawText = val.replace(/<[^>]*>/g, '');
                    if (rawText.length <= 500) setEspecieAEditar({...especieAEditar, protocolo_accion: val});
                    else setAdvertenciaTemporal('editEspecieProt', 'Máximo 500 caracteres (aprox)');
                  }} placeholder="¿Qué hacer si se avista esta especie? (Opcional)" />
                </div>
                {advertencias.editEspecieProt && <span className="admin-advertencia" style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-18px', left: '0' }}>{advertencias.editEspecieProt}</span>}
              </div>
              
              <div className="admin-drawer-item">
                <span className="admin-drawer-label">Imagen</span>
                {especieAEditar.imagen_url && (
                  <div style={{marginBottom: '1rem'}}>
                    <img src={especieAEditar.imagen_url} alt="Vista previa" style={{width: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px', background: 'var(--admin-bg-fondo)'}} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => setArchivoImagen(e.target.files[0])} className="admin-form-input" style={{padding: '0.5rem'}} />
                <small style={{color: 'var(--admin-text-secundario)'}}>Deja en blanco si no deseas cambiar la imagen actual.</small>
              </div>

              <div style={{display:'flex', gap:'1rem', marginTop:'2rem'}}>
                <button type="submit" disabled={subiendoImagen} className="admin-btn admin-btn-primary" style={{flex:1}}>
                  {subiendoImagen ? 'Guardando...' : 'Guardar Especie'}
                </button>
                <button type="button" className="admin-btn admin-btn-outline" onClick={() => setEspecieAEditar(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SPLIT SCREEN: Edición/Creación de Noticia con Live Preview */}
      {noticiaAEditar && (
        <div className="admin-drawer-overlay admin-split-modal-overlay" onClick={() => { setNoticiaAEditar(null); setArchivoImagen(null); }}>
          <div className="admin-split-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-header">
              <h3 className="admin-drawer-title">{noticiaAEditar.id ? 'Editar Publicación' : 'Nueva Publicación'}</h3>
              <button className="admin-drawer-close" onClick={() => { setNoticiaAEditar(null); setArchivoImagen(null); }}>×</button>
            </div>

            <div className="admin-split-layout">
              {/* Lado Izquierdo: Formulario */}
              <form onSubmit={guardarNoticia} className="admin-split-form">
                <div className="admin-drawer-item">
                  <span className="admin-drawer-label">Título</span>
                  <input type="text" required value={noticiaAEditar.titulo} onChange={(e) => setNoticiaAEditar({...noticiaAEditar, titulo: e.target.value})} className="admin-form-input" placeholder="Ej: Nueva Jornada de Limpieza" disabled={subiendoImagen}/>
                </div>
                
                <div className="admin-drawer-item">
                  <span className="admin-drawer-label">Categoría</span>
                  <select value={noticiaAEditar.tipo} onChange={(e) => setNoticiaAEditar({...noticiaAEditar, tipo: e.target.value})} className="admin-form-input" disabled={subiendoImagen}>
                    <option value="Noticia">Noticia</option>
                    <option value="Capacitación">Capacitación</option>
                    <option value="Logro">Logro</option>
                    <option value="Alerta">Alerta</option>
                    <option value="Fauna">Fauna</option>
                    <option value="Costas">Costas</option>
                    <option value="Eventos">Eventos</option>
                    <option value="Educación">Educación</option>
                  </select>
                </div>

                <div className="admin-drawer-item">
                  <span className="admin-drawer-label">Resumen (Para tarjeta)</span>
                  <textarea rows="2" value={noticiaAEditar.resumen || ''} onChange={(e) => setNoticiaAEditar({...noticiaAEditar, resumen: e.target.value})} className="admin-form-input" placeholder="Breve descripción..." disabled={subiendoImagen}></textarea>
                </div>

                <div className="admin-drawer-item">
                  <span className="admin-drawer-label">Contenido Completo</span>
                  <textarea required rows="8" value={noticiaAEditar.contenido} onChange={(e) => setNoticiaAEditar({...noticiaAEditar, contenido: e.target.value})} className="admin-form-input" placeholder="Escribe todo el contenido aquí..." disabled={subiendoImagen}></textarea>
                </div>
                
                <div className="admin-drawer-item">
                  <span className="admin-drawer-label">Imagen Destacada</span>
                  <div className="admin-file-upload-wrapper">
                    <input type="file" accept="image/*" onChange={(e) => setArchivoImagen(e.target.files[0])} className="admin-form-input" disabled={subiendoImagen} />
                  </div>
                  <small style={{color: 'var(--admin-text-secundario)'}}>Selecciona una nueva imagen o arrástrala aquí.</small>
                </div>

                <div style={{display:'flex', gap:'1rem', marginTop:'2rem'}}>
                  <button type="submit" disabled={subiendoImagen} className="admin-btn admin-btn-primary" style={{flex:1}}>
                    {subiendoImagen ? 'Publicando...' : (noticiaAEditar.id ? 'Guardar Cambios' : 'Publicar Noticia')}
                  </button>
                  <button type="button" disabled={subiendoImagen} className="admin-btn admin-btn-outline" onClick={() => { setNoticiaAEditar(null); setArchivoImagen(null); }}>Cancelar</button>
                </div>
              </form>

              {/* Lado Derecho: Live Preview */}
              <div className="admin-split-preview">
                <h4 className="admin-preview-title">Vista Previa en Vivo</h4>
                <div className="admin-preview-container">
                  {/* Tarjeta simulando el estilo de Noticias.css */}
                  <article className="noticia-card admin-live-card">
                    <div className="noticia-img-wrapper">
                      {(archivoImagen ? URL.createObjectURL(archivoImagen) : noticiaAEditar.imagen_url) ? (
                        <img 
                          src={archivoImagen ? URL.createObjectURL(archivoImagen) : noticiaAEditar.imagen_url} 
                          alt="Preview" 
                          className="noticia-img" 
                        />
                      ) : (
                        <div className="noticia-img-placeholder">📰</div>
                      )}
                      <span className={`noticia-badge badge-${(noticiaAEditar.tipo || 'Noticia').toLowerCase().replace('ó','o').replace(' ', '-')}`}>
                        {noticiaAEditar.tipo || 'Categoría'}
                      </span>
                    </div>
                    <div className="noticia-contenido">
                      <div className="noticia-meta">
                        <span className="noticia-fecha-tiempo">
                          {new Date().toLocaleDateString('es-VE')} • {Math.max(1, Math.ceil(((noticiaAEditar.contenido || '').trim().split(/\s+/).length) / 200))} min lectura
                        </span>
                      </div>
                      <h3 className="noticia-titulo">{noticiaAEditar.titulo || 'Título de la Noticia'}</h3>
                      <p className="noticia-resumen">
                        {noticiaAEditar.resumen || (noticiaAEditar.contenido ? noticiaAEditar.contenido.substring(0, 100) + '...' : 'Escribe contenido para ver el resumen aquí...')}
                      </p>
                      <span className="noticia-leer-mas">Leer más →</span>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}