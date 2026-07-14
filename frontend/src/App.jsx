// Archivo: frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { syncOfflineReports, getPendingCount } from './utils/offlineSync';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import VistaInicio from './pages/VistaInicio';
import Reporte from './pages/Reporte';
import CatalogoEspecies from './pages/CatalogoEspecies';
import Auth from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import MisReportes from './pages/MisReportes';
import MiPerfil from './pages/MiPerfil';
import RecuperarPassword from './pages/RecuperarPassword';
import Noticias from './pages/Noticias';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

function MainLayout({ isOnline, usuario, cargandoUsuario, pendingSyncs }) {
  const location = useLocation();
  const esVistaAuth = location.pathname === '/auth' || location.pathname === '/recuperar-password';

  const esVistaAdmin = location.pathname.startsWith('/admin');

  if (cargandoUsuario) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-oceano)' }}>Cargando sistema...</div>;
  }

  return (
    <>
      <ScrollToTop />
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff', borderRadius: '10px' } }} />
      {!esVistaAuth && <Navbar isOnline={isOnline} usuario={usuario} pendingSyncs={pendingSyncs} />}
      <Routes>
        <Route path="/" element={<VistaInicio usuario={usuario} />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />
        <Route path="/reporte" element={<Reporte />} />
        <Route path="/catalogo" element={<CatalogoEspecies />} />
        <Route path="/noticias" element={<Noticias />} />
        
        {/* Rutas Protegidas */}
        <Route path="/admin" element={
          <ProtectedRoute usuario={usuario} rolesPermitidos={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/mis-reportes" element={
          <ProtectedRoute usuario={usuario}>
            <MisReportes />
          </ProtectedRoute>
        } />
        <Route path="/mi-perfil" element={
          <ProtectedRoute usuario={usuario}>
            <MiPerfil />
          </ProtectedRoute>
        } />
      </Routes>
      {!esVistaAuth && <Footer />}
      {!esVistaAdmin && <WhatsAppButton />}
    </>
  );
}

function App() {
  // Estados para manejar la información de la Navbar
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [usuario, setUsuario] = useState(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  // Monitor de conexión a internet para la PWA
  useEffect(() => {
    // ── Guardia de sesión por ventana ─────────────────────────────────────────
    // sessionStorage se borra cuando se cierra el navegador/pestaña, pero
    // sobrevive la navegación a páginas externas y el botón "atrás".
    // Si la bandera no existe → es una apertura nueva → limpiamos cualquier
    // sesión que haya quedado guardada en localStorage.
    const SESSION_FLAG = 'sic_ventana_activa';
    if (!sessionStorage.getItem(SESSION_FLAG)) {
      // Nueva ventana/pestaña: cerrar sesión previa silenciosamente
      // OMITIMOS esto si venimos de un link de confirmación de email/password (que trae access_token en la URL)
      if (!window.location.hash.includes('access_token')) {
        supabase.auth.signOut().catch(() => {});
      }
      sessionStorage.setItem(SESSION_FLAG, 'true');
    }
    // ─────────────────────────────────────────────────────────────────────────

    const irOnline = async () => {
      setIsOnline(true);
      // Intentar sincronizar cuando vuelva el internet
      const remaining = await syncOfflineReports();
      setPendingSyncs(remaining);
      if (remaining === 0) {
        // Podríamos lanzar una notificación de éxito aquí
        console.log("Sincronización completa");
      }
    };
    
    const irOffline = () => setIsOnline(false);

    const updatePendingCount = async () => {
      const count = await getPendingCount();
      setPendingSyncs(count);
    };

    window.addEventListener('online', irOnline);
    window.addEventListener('offline', irOffline);
    window.addEventListener('offline-report-saved', updatePendingCount);

    // Initial check
    if (navigator.onLine) {
      syncOfflineReports().then(rem => setPendingSyncs(rem));
    } else {
      updatePendingCount();
    }

    const fetchUserProfile = async (userId, updateAccess = false) => {
      if (!userId) {
        setUsuario(null);
        setCargandoUsuario(false);
        return;
      }

      if (updateAccess) {
        // Actualiza el último acceso en segundo plano
        supabase.from('usuarios').update({ ultimo_acceso: new Date().toISOString() }).eq('id', userId).then();
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error obteniendo perfil:", error);
        setUsuario(null);
      } else {
        setUsuario(data);
      }
      setCargandoUsuario(false);
    };

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserProfile(session?.user?.id, !!session?.user);
    });

    // Suscribirse a cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      fetchUserProfile(session?.user?.id, event === 'SIGNED_IN');
    });

    return () => {
      window.removeEventListener('online', irOnline);
      window.removeEventListener('offline', irOffline);
      window.removeEventListener('offline-report-saved', updatePendingCount);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <MainLayout isOnline={isOnline} usuario={usuario} cargandoUsuario={cargandoUsuario} pendingSyncs={pendingSyncs} />
    </Router>
  );
}

export default App;