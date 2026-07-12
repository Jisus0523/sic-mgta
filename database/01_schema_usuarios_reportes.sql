-- ==============================================================================
-- 1. TABLA DE USUARIOS Y ROLES
-- ==============================================================================

-- Crea la tabla "usuarios" conectada a los perfiles
CREATE TABLE public.usuarios (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT,
  apellido TEXT,
  cedula TEXT,
  fecha_nacimiento DATE,
  email TEXT,
  rol TEXT DEFAULT 'ciudadano'::text,
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. TRIGGER PARA NUEVOS USUARIOS DE AUTH
-- ==============================================================================

-- Función que se ejecuta cuando un usuario se registra
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, apellido, cedula, fecha_nacimiento, email, rol)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'apellido',
    new.raw_user_meta_data->>'cedula',
    (new.raw_user_meta_data->>'fecha_nacimiento')::DATE,
    new.email,
    'ciudadano' -- rol por defecto
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger atado a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 3. TABLA DE REPORTES Y CLASES HIJAS
-- ==============================================================================

-- 3.1 Tabla Principal: Reportes
CREATE TABLE public.reportes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  coordenadas TEXT,
  latitud FLOAT8,
  longitud FLOAT8,
  foto_url TEXT,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  estado TEXT DEFAULT 'Pendiente'::text,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Trigger para actualizar "actualizado_en" automáticamente en reportes
CREATE OR REPLACE FUNCTION public.update_actualizado_en_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reportes_actualizado_en
    BEFORE UPDATE ON public.reportes
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_actualizado_en_column();

-- 3.2 Tabla Especializada: Especies
CREATE TABLE public.reportes_especies (
  reporte_id UUID PRIMARY KEY REFERENCES public.reportes(id) ON DELETE CASCADE,
  nombre_comun TEXT,
  nombre_cientifico TEXT,
  condicion TEXT,
  tipo_alerta TEXT
);

-- 3.3 Tabla Especializada: Desechos
CREATE TABLE public.reportes_desechos (
  reporte_id UUID PRIMARY KEY REFERENCES public.reportes(id) ON DELETE CASCADE,
  tipo_material TEXT,
  volumen_aproximado TEXT,
  es_peligroso BOOLEAN DEFAULT false
);

-- 3.4 Tabla Especializada: Actividad Antrópica
CREATE TABLE public.reportes_actividades (
  reporte_id UUID PRIMARY KEY REFERENCES public.reportes(id) ON DELETE CASCADE,
  tipo_actividad TEXT,
  maquinaria_presente BOOLEAN DEFAULT false
);

-- ==============================================================================
-- 4. POLÍTICAS DE SEGURIDAD (RLS)
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_especies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_desechos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_actividades ENABLE ROW LEVEL SECURITY;

-- ---> POLÍTICAS PARA "usuarios" <---

-- Todos los usuarios autenticados pueden ver la lista de usuarios
-- (Requerido para que el admin dashboard liste los usuarios y para consultar a uno mismo)
CREATE POLICY "Permitir lectura de usuarios" 
ON public.usuarios FOR SELECT 
TO authenticated 
USING (true);

-- Solo el propio usuario o el admin pueden editar su perfil
CREATE POLICY "Permitir actualizar propio perfil"
ON public.usuarios FOR UPDATE
TO authenticated
USING (auth.uid() = id OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin');

-- ---> POLÍTICAS PARA "reportes" y TABLAS HIJAS <---

-- Cualquier persona puede crear reportes
CREATE POLICY "Permitir insercion de reportes a todo el mundo" 
ON public.reportes FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Permitir insercion de reportes_especies" 
ON public.reportes_especies FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Permitir insercion de reportes_desechos" 
ON public.reportes_desechos FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Permitir insercion de reportes_actividades" 
ON public.reportes_actividades FOR INSERT TO public WITH CHECK (true);

-- Todos pueden ver los reportes
CREATE POLICY "Permitir lectura de reportes" 
ON public.reportes FOR SELECT TO public USING (true);

CREATE POLICY "Permitir lectura de reportes_especies" 
ON public.reportes_especies FOR SELECT TO public USING (true);

CREATE POLICY "Permitir lectura de reportes_desechos" 
ON public.reportes_desechos FOR SELECT TO public USING (true);

CREATE POLICY "Permitir lectura de reportes_actividades" 
ON public.reportes_actividades FOR SELECT TO public USING (true);

-- Solo los admins pueden actualizar un reporte
CREATE POLICY "Permitir actualizacion solo admins" 
ON public.reportes FOR UPDATE 
TO authenticated 
USING ((SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin');

-- Las tablas hijas no necesitan policy de UPDATE si no se editan directamente desde la app, 
-- pero se puede añadir si en el futuro los admins editan esos detalles.
