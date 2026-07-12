# Informe del Sistema

## Título del Sistema
**S.I.C. Mgta (Sistema de Incidentes Costeros — Margarita)**

## Arquitectura Requerida
La arquitectura del sistema sigue el modelo **Serverless / Backend as a Service (BaaS)**, eliminando la necesidad de un servidor backend tradicional (ej. Node.js/Express) como intermediario.

1. **Frontend (Aplicación Web Progresiva - PWA):** Desarrollado con **React** y **Vite**. Es una **Progressive Web App (PWA)** que puede instalarse en dispositivos móviles y de escritorio, además de ofrecer capacidades de trabajo sin conexión y carga rápida gracias a los Service Workers configurados con `vite-plugin-pwa`. Integra mapas interactivos con **Leaflet** y gráficos estadísticos con **Recharts**.
2. **Backend as a Service (Supabase):** En lugar de un backend a la medida, el sistema utiliza la plataforma **Supabase**, la cual provee de forma integral:
   - **Autenticación y Autorización:** Manejo de registro, inicio de sesión, recuperación de contraseña y gestión de sesiones (`Supabase Auth`).
   - **Base de Datos:** PostgreSQL robusto expuesto a través de una API segura autogenerada (PostgREST). El frontend de React consume y escribe datos enviando peticiones directamente a Supabase mediante su SDK cliente (`@supabase/supabase-js`).
   - **Almacenamiento (Storage):** Alojamiento para la subida de evidencias fotográficas capturadas en los reportes.

## Data Mart (Propuesta Analítica)
Para un análisis avanzado a futuro de los incidentes costeros reportados, se propone el siguiente Data Mart (modelo en estrella). Podría implementarse a través de Vistas Materializadas directamente dentro de Supabase o en un Data Warehouse secundario:

- **Tabla de Hechos:**
  - `Hecho_Reporte_Incidente`
    - Claves foráneas a las dimensiones.
    - Métricas: `cantidad_incidentes`, `tiempo_resolucion_horas`.
- **Dimensiones:**
  - `Dim_Tiempo`: `fecha`, `mes`, `año`, `trimestre`, `dia_semana`.
  - `Dim_Ubicacion`: `latitud`, `longitud`, `zona_costera` (ej. La Guardia, Pampatar, El Yaque).
  - `Dim_Categoria`: `nombre_categoria` (Fauna, Desechos, Actividad Antrópica), `detalle_alerta`.
  - `Dim_Usuario`: `rol_usuario`, `rango_edad`.

Este Data Mart alimentará los cuadros de mando (dashboards) analíticos interactivos de los administradores.

## Diagrama de Caso de Uso General

```mermaid
usecaseDiagram
    actor Ciudadano as "Usuario/Ciudadano"
    actor Administrador as "Administrador"

    rectangle "S.I.C. Mgta (PWA Serverless)" {
        usecase UC1 as "Registrarse e Iniciar Sesión"
        usecase UC1_1 as "Recuperar Contraseña"
        usecase UC2 as "Reportar Incidente Costero (GPS y Fotos)"
        usecase UC3 as "Consultar Catálogo y Noticias"
        usecase UC4 as "Gestionar Mi Perfil y Mis Reportes"
        usecase UC5 as "Visualizar Mapas y Gráficos Estadísticos"
        usecase UC6 as "Gestionar Estado de Reportes Globales"
    }

    Ciudadano --> UC1
    Ciudadano --> UC1_1
    Ciudadano --> UC2
    Ciudadano --> UC3
    Ciudadano --> UC4
    
    Administrador --> UC1
    Administrador --> UC3
    Administrador --> UC5
    Administrador --> UC6
```

## Diagrama de Componentes

```mermaid
componentDiagram
    package "PWA Frontend (React / Vite)" {
        [Módulo de Autenticación]
        [Formulario de Reportes (Multistep)]
        [Panel de Usuario y Noticias]
        [Dashboard Administrativo (Recharts / Leaflet)]
        [Service Worker (Caché PWA)]
    }

    package "Supabase (BaaS Cloud)" {
        [Supabase Auth API]
        [API Autogenerada REST/Realtime]
        [PostgreSQL DB]
    }

    [Módulo de Autenticación] ..> [Supabase Auth API] : SDK (Email/Password)
    [Formulario de Reportes (Multistep)] ..> [API Autogenerada REST/Realtime] : SDK (CRUD Data)
    [Panel de Usuario y Noticias] ..> [API Autogenerada REST/Realtime] : SDK (CRUD Data)
    [Dashboard Administrativo (Recharts / Leaflet)] ..> [API Autogenerada REST/Realtime] : SDK (Lectura de KPIs)
    
    [Supabase Auth API] --> [PostgreSQL DB]
    [API Autogenerada REST/Realtime] --> [PostgreSQL DB]
```

## Requerimientos Funcionales y No Funcionales

### Requerimientos Funcionales
1. **Gestión Integral de Usuarios:** Permitir registro, login, recuperación de contraseñas (`RecuperarPassword`) y administración del perfil propio (`MiPerfil`).
2. **Generación y Seguimiento de Reportes:** Permitir levantar un reporte adjuntando geolocalización (con soporte Leaflet) y clasificarlo por especie o tipo de desecho. El usuario debe poder consultar sus incidentes creados (`MisReportes`).
3. **Concientización:** Publicar novedades en una sección de "Noticias" y consultar especies marítimas vulnerables o invasoras en el "Catálogo".
4. **Dashboard Administrativo Interactivo:** Proveer herramientas visuales a los perfiles de administradores, como gráficos estadísticos alimentados en tiempo real (Recharts) y mapas de calor o de pines geolocalizados (Leaflet).
5. **Autenticación Nativa Sincronizada:** Utilizar observadores de estado (`onAuthStateChange`) para proteger rutas privadas sin necesidad de sesiones complejas en el backend.

### Requerimientos No Funcionales
1. **Aplicación Web Progresiva (PWA):** El sistema debe instalarse como aplicación nativa desde el navegador (Android/iOS/PC), implementando manifestos y Service Workers para detectar caídas de internet y ofrecer funcionalidades básicas en caché.
2. **Escalabilidad Cloud:** La infraestructura (Base de datos y Auth) descansa sobre Supabase, lo que garantiza alta disponibilidad y escalabilidad automática sin gestión de servidores físicos o virtuales.
3. **Mobile-First:** El diseño de la interfaz de usuario debe estar priorizado para dispositivos móviles, asumiendo el uso en exteriores/playas.
4. **Mantenimiento CSS Aislado:** Asegurar que ninguna regla CSS colisione al empaquetar, garantizando nombres de clases con prefijos estrictos.

## Políticas de Seguridad de Software

1. **Delegración Criptográfica y Sesiones:** El hashing de contraseñas y la generación de JSON Web Tokens (JWT) no se desarrollan manualmente; se gestionan de forma nativa por el estándar robusto de **Supabase Auth**. Las sesiones persisten en el cliente mediante `sessionStorage`.
2. **Seguridad a Nivel de Fila (Row Level Security - RLS):** Como el cliente de React se comunica directamente a la base de datos vía API REST (con una *Anon Key* pública), la seguridad estructural depende obligatoriamente de habilitar RLS en PostgreSQL. Esto asegura, mediante políticas SQL, que un ciudadano común únicamente pueda leer, modificar o borrar *sus propios* reportes, y solo los administradores puedan consultar la totalidad de la base de datos.
3. **Validación Duplicada de Inputs:** Aunque los componentes de React (`Reporte.jsx`, `Auth.jsx`) validan que los campos sean correctos y obligatorios, la base de datos en Supabase debe aplicar restricciones estrictas en sus tablas (`CHECK`, tipos numéricos, validación de nulos) para evitar inyecciones maliciosas si alguien consumiera la API desde fuera de la web app.
4. **Protección de Keys Ocultas y Variables de Entorno:** Aunque la clave pública de Supabase (`anon key`) se expone en el código cliente de manera intencional, cualquier clave maestra de base de datos o *Service Role Key* está estrictamente censurada. Además, el archivo local `.env` se encuentra ignorado (vía `.gitignore`) para prevenir la fuga accidental de credenciales en repositorios públicos de GitHub.
5. **Privacidad de Datos e Imágenes:** Todos los recursos subidos por los ciudadanos (evidencias de incidentes) se almacenan en *Buckets* de Supabase Storage bajo políticas estrictas, garantizando que los archivos sensibles no sean manipulados ni borrados por terceros.
