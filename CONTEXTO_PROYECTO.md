# Contexto del proyecto S.I.C. Mgta

> Documento generado para proporcionar contexto completo a asistentes de IA.
> **Última actualización:** julio 2026

---

## 1. Resumen ejecutivo

**S.I.C. Mgta** (*Sistema de Incidentes Costeros — Margarita*) es una aplicación web (PWA) para reportar y gestionar incidentes costeros en la isla de Margarita (Nueva Esparta, Venezuela): fauna afectada, contaminación/desechos y actividad antrópica ilegal.

| Aspecto | Detalle |
|---------|---------|
| **Autor** | Jesús Rafael Velásquez Martínez |
| **Tipo** | Aplicación Web Progresiva (PWA) Serverless con BaaS (Backend as a Service) |
| **Estado** | UI/UX avanzada en frontend. Integrado con Supabase para BD, Autenticación y Storage. |
| **PWA / offline** | Plenamente implementado con `vite-plugin-pwa` (manifiesto, service worker, iconos) y detección de estado online/offline. Sincronización en segundo plano de reportes usando IndexedDB. |

---

## 2. Árbol de directorios (código fuente, sin `node_modules`)

```
sic-mgta/
├── CONTEXTO_PROYECTO.md          ← este archivo
├── informe_proyecto.md           ← informe académico del sistema
├── database/                     ← (Obsoleto) carpeta vacía
├── backend/                      ← (Obsoleto) código Node.js/Express original, reemplazado por Supabase
└── frontend/
    ├── package.json
    ├── vite.config.js            ← Configuración Vite + PWA
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx               ← Rutas, Auth listener, layout principal
    │   ├── index.css             ← Variables CSS globales (design tokens)
    │   ├── supabaseClient.js     ← Conexión a API de Supabase
    │   ├── assets/               
    │   ├── components/
    │   │   ├── Navbar.jsx / .css
    │   │   ├── Footer.jsx / .css
    │   │   ├── AdminFAB.jsx / .css
    │   │   ├── ScrollToTop.jsx
    │   │   └── WhatsAppButton.jsx / .css
    │   └── pages/
    │       ├── VistaInicio.jsx / .css
    │       ├── Reporte.jsx / .css
    │       ├── CatalogoEspecies.jsx / .css
    │       ├── Auth.jsx / .css
    │       ├── RecuperarPassword.jsx / .css
    │       ├── MiPerfil.jsx / .css
    │       ├── MisReportes.jsx / .css
    │       ├── Noticias.jsx / .css
    │       └── AdminDashboard.jsx / .css
```

---

## 3. Stack tecnológico

### 3.1 Frontend

| Tecnología | Uso |
|------------|-----|
| **React 19** | UI por componentes, estado local (`useState`, `useEffect`) |
| **React Router DOM 7** | Enrutamiento SPA (`BrowserRouter`) |
| **Vite 8** | Bundler y dev server |
| **Vite PWA** | `vite-plugin-pwa` para Service Workers y Manifiesto |
| **CSS plano** | Un archivo `.css` por componente/página; variables en `:root` |
| **React Leaflet** | Integración de mapas interactivos |
| **Recharts** | Gráficos estadísticos para el panel administrador |
| **React Datepicker** | Selección de fechas (con `date-fns`) |

### 3.2 Backend / Base de Datos (BaaS)

El proyecto migró de un backend personalizado (Node/Express/pg) a **Supabase**.

| Tecnología | Uso |
|------------|-----|
| **Supabase (PostgreSQL)** | Base de datos relacional en la nube. Incluye Data Mart (Vistas y RPC) para analíticas del Dashboard. |
| **@supabase/supabase-js** | Cliente JS en el frontend para peticiones directas a la BD y Auth. |
| **Supabase Auth** | Autenticación y manejo de sesiones. Almacenadas en `localStorage` con guardia en `sessionStorage` por pestaña. |
| **Supabase Storage** | Almacenamiento en la nube para fotos de incidentes y noticias. |

*(Nota: La carpeta `backend/` existe pero su uso ha sido desplazado por la arquitectura Serverless actual).*

---

## 4. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  Navegador (React SPA PWA)                                  │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │ Navbar  │  │  Routes  │  │ Pages (estado, mapas)    │  │
│  └─────────┘  └──────────┘  └──────────────────────────┘  │
│  ┌──────────────────┐ ┌────────────────────────────────┐  │
│  │ Supabase Client  │ │ Vite PWA & IndexedDB (Sync)    │  │
│  └─────────┬────────┘ └────────────────────────────────┘  │
└────────────┼────────────────────────────────────────────────┘
             │  HTTP/REST / WebSockets (Realtime)
             ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase (BaaS)                                            │
│  ┌───────────────┐ ┌──────────────────┐ ┌───────────────┐   │
│  │ PostgreSQL DB │ │ Auth & Sessions  │ │ Storage / API │   │
│  │ (con RPC/Views) │ │                  │ │               │   │
│  └───────────────┘ └──────────────────┘ └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Rutas del frontend (`App.jsx`)

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | `VistaInicio` | Landing: hero, categorías, CTAs |
| `/auth` | `Auth` | Login / registro (conectado a Supabase) |
| `/recuperar-password` | `RecuperarPassword` | Recuperación de cuenta |
| `/reporte` | `Reporte` | Formulario multipaso de incidentes |
| `/catalogo` | `CatalogoEspecies` | Catálogo de especies |
| `/noticias` | `Noticias` | Feed de novedades/noticias |
| `/mis-reportes` | `MisReportes` | Listado de reportes creados por el usuario |
| `/mi-perfil` | `MiPerfil` | Datos y configuración del usuario |
| `/admin` | `AdminDashboard` | Panel admin (KPIs, gráficas Recharts, mapas Leaflet) |

**Componentes Globales:** 
- `Navbar` (detecta online/offline y usuario actual).
- `Footer`.
- `WhatsAppButton` (botón flotante de contacto, ausente en `/admin`).
- `ScrollToTop`.

---

## 6. Diseño y convenciones de código

### 6.1 CSS — prefijos por archivo (aislamiento de estilos)

**Regla estricta:** Al crear o editar estilos, el nombre de clase debe empezar siempre con el prefijo del archivo origen en kebab-case. **No usar estilos globales** salvo las variables (tokens) en `index.css`.

| Archivo | Prefijo de clases | Ejemplo |
|---------|-------------------|---------|
| `VistaInicio.jsx` | `vista-inicio-` | `vista-inicio-hero` |
| `Reporte.jsx` | `reporte-` | `reporte-stepper` |
| `Noticias.jsx` | `noticias-` | `noticias-grid` |

**Design tokens (`frontend/src/index.css`, `:root`):**
- `--color-arena`, `--color-oceano`, `--color-ola`, `--color-acento`, etc.
- **Debe** usarse estas variables para mantener coherencia; pero **no deben** usarse nombres de clase genéricos sin prefijo.

### 6.2 Supabase & Estado Global

- La sesión del usuario se gestiona a nivel global en `App.jsx` usando `supabase.auth.onAuthStateChange`.
- El objeto `usuario` se pasa por *props* a los componentes necesarios (`Navbar`, `VistaInicio`, etc.).
- Las llamadas a la base de datos se hacen directamente desde los `useEffect` o funciones en cada componente mediante `supabase.from('tabla')...`.

---

## 7. Trabajo pendiente / roadmap técnico

| Área | Estado |
|------|--------|
| Base de Datos (Supabase) | **Implementada** |
| Autenticación (Supabase) | **Implementada** (Con guardia de persistencia por ventana/tab) |
| Mapas interactivos (Leaflet) | **Implementada** |
| PWA (Manifiesto, Service Worker) | **Implementada** |
| Sincronización Offline de reportes | **Implementada** (con IndexedDB) |
| Gráficos en Dashboard (Recharts)| **Implementada** |
| Data Mart (Vistas y RPC para Dashboard) | **Implementada** |
| Integración de Storage para fotos de reportes | **Implementada** |
| Lógica Role-Based Access Control (RBAC) para /admin | **Pendiente** (requiere bloqueo en frontend router y RLS estricto) |
| Limpieza de código backend legacy | **Pendiente** (borrar carpeta `backend/`) |

---

## 8. Notas para asistentes de IA

1. **El proyecto ahora utiliza SUPABASE.** Ignorar por completo la carpeta `backend/` y Node/Express para el desarrollo de la lógica de negocio; todo fluye hacia `@supabase/supabase-js`.
2. **Idioma:** Código y UI en español.
3. **Respetar el aislamiento CSS:** Cada archivo tiene su prefijo de clases. No crear clases genéricas sin prefijo (`.btn`, `.card`).
4. **PWA:** Cualquier nuevo asset (icono) debe registrarse en `vite.config.js`.

*Fin del documento de contexto.*
