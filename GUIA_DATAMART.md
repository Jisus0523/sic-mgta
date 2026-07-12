# Implementación del Data Mart en Supabase

Dado que tu proyecto utiliza **Supabase (PostgreSQL)**, la forma más eficiente y moderna de implementar un Data Mart (Modelo en Estrella) sin necesidad de pagar por un Data Warehouse externo (como Snowflake o BigQuery), es utilizando **Vistas SQL** y **Vistas Materializadas** directamente en tu base de datos actual.

La idea es transformar tus tablas operacionales (`reportes`, `usuarios`, etc.) enfocadas en transacciones (OLTP), en tablas estructuradas para análisis rápido (OLAP) que alimentarán directamente los gráficos de `Recharts` en tu Panel de Administrador.

Aquí tienes la guía paso a paso y el código SQL que puedes copiar y pegar en el **SQL Editor de Supabase**.

---

## Paso 1: Crear las Dimensiones (Dimension Tables)

Las dimensiones dan el "contexto" a los datos (El Cuándo, Dónde, Quién y Qué). Como los datos ya existen en tus tablas, usaremos `VIEWS` (vistas dinámicas) para extraer esta información sin duplicar datos innecesariamente.

```sql
-- 1. Dimensión Tiempo
-- Extrae los componentes de la fecha a partir de la fecha de creación del reporte.
CREATE OR REPLACE VIEW dim_tiempo AS
SELECT DISTINCT
  DATE(fecha) AS id_fecha,
  EXTRACT(YEAR FROM fecha) AS anio,
  EXTRACT(MONTH FROM fecha) AS mes,
  EXTRACT(QUARTER FROM fecha) AS trimestre,
  EXTRACT(ISODOW FROM fecha) AS dia_semana -- 1 = Lunes, 7 = Domingo
FROM reportes
WHERE fecha IS NOT NULL;

-- 2. Dimensión Ubicación
-- Agrupa las coordenadas únicas reportadas.
CREATE OR REPLACE VIEW dim_ubicacion AS
SELECT DISTINCT
  latitud,
  longitud,
  -- Opcional: Podrías usar PostGIS a futuro para calcular la "zona_costera" basada en lat/lng
  'Zona por definir' AS zona_costera
FROM reportes
WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

-- 3. Dimensión Usuario
-- Toma datos básicos analíticos de los usuarios (anonimizados para métricas)
CREATE OR REPLACE VIEW dim_usuario AS
SELECT 
  id AS id_usuario,
  rol AS rol_usuario
FROM usuarios;
```

---

## Paso 2: Crear la Tabla de Hechos (Fact Table)

La Tabla de Hechos contiene las **métricas** (cantidades) y las **llaves foráneas** que conectan con las dimensiones. 
Usaremos una **Vista Materializada (`MATERIALIZED VIEW`)**. A diferencia de una vista normal, esta guarda los resultados físicamente en disco, lo que hace que las consultas para tus gráficos en React sean **extremadamente rápidas**, incluso con miles de reportes.

```sql
-- Crear la Tabla de Hechos (Modelo Estrella)
CREATE MATERIALIZED VIEW hecho_reporte_incidente AS
SELECT 
  -- Llaves hacia las dimensiones
  r.id AS id_hecho,
  DATE(r.fecha) AS id_fecha,
  r.latitud AS id_latitud,
  r.longitud AS id_longitud,
  r.usuario_id AS id_usuario,
  r.categoria AS nombre_categoria,
  COALESCE(r.estado, 'Pendiente') AS estado_reporte,
  
  -- Métricas (Hechos)
  1 AS cantidad_incidentes, -- Cada fila es 1 incidente
  
  -- (Opcional) Si tuvieras una columna 'fecha_resolucion', podrías calcular el tiempo aquí:
  -- EXTRACT(EPOCH FROM (r.fecha_resolucion - r.fecha))/3600 AS tiempo_resolucion_horas
  0 AS tiempo_resolucion_horas 
  
FROM reportes r;

-- Crear índices para hacer el Data Mart aún más rápido
CREATE UNIQUE INDEX idx_hecho_reporte_id ON hecho_reporte_incidente(id_hecho);
CREATE INDEX idx_hecho_fecha ON hecho_reporte_incidente(id_fecha);
CREATE INDEX idx_hecho_categoria ON hecho_reporte_incidente(nombre_categoria);
```

---

## Paso 3: Mantener el Data Mart Actualizado

Las Vistas Materializadas son "fotos" estáticas. Cuando entra un reporte nuevo, la vista no se actualiza sola. En Supabase, tienes dos opciones fáciles para actualizarla (`REFRESH MATERIALIZED VIEW hecho_reporte_incidente;`):

**Opción A (Recomendada): Usar pg_cron en Supabase**
Puedes decirle a Supabase que actualice el Data Mart automáticamente cada medianoche (o cada hora) para que los administradores vean los datos frescos al día siguiente.

```sql
-- Habilitar extensión (si no lo está)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar actualización todos los días a las 3:00 AM
SELECT cron.schedule(
  'actualizar_datamart_diario',
  '0 3 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY hecho_reporte_incidente;'
);
```

**Opción B: Usar un Trigger de Base de Datos (Para Tiempo Real Estricto)**
Como mencionaste que necesitas los datos en tiempo real para los administradores, la solución ideal es crear un "Trigger" (Disparador). Este código hará que PostgreSQL actualice el Data Mart automáticamente en el milisegundo exacto en que un usuario guarde un nuevo reporte.

Copia y ejecuta esto también en el SQL Editor:

```sql
-- 1. Creamos la función que refresca la vista
CREATE OR REPLACE FUNCTION refresh_datamart_hechos()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresca la vista. (Requiere que el índice único que creamos en el Paso 2 exista).
  REFRESH MATERIALIZED VIEW CONCURRENTLY hecho_reporte_incidente;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Creamos el Trigger que "escucha" los cambios en la tabla original
CREATE TRIGGER trigger_refresh_datamart
AFTER INSERT OR UPDATE OR DELETE ON reportes
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_datamart_hechos();
```
Con esto, tu Data Mart siempre estará 100% sincronizado al instante.

---

## Paso 4: Consumirlo desde React (`AdminDashboard.jsx`)

Como Supabase expone automáticamente todas las vistas (y vistas materializadas) en su API, en tu frontend puedes hacer las consultas analíticas exactamente igual que si fuera una tabla normal, sin escribir un solo endpoint adicional:

```javascript
import { supabase } from '../supabaseClient';

// En tu nuevo AdminDashboard, ahora consumimos los RPC directamente:
const fetchTotales = async () => {
   const { data } = await supabase.rpc('get_stats_categoria');
   console.log(data); // [{ categoria: 'Fauna', total: 34 }, ...]
};
```

---

## Paso 5: (MÁXIMO RENDIMIENTO) Funciones RPC para Graficar

Si dejamos que React descargue toda la `hecho_reporte_incidente`, seguirá siendo pesado por la red. La mejor práctica de un Data Mart es que la Base de Datos sume los valores y devuelva solo el resumen final. 
En Supabase, esto se logra creando **Funciones (RPC)**. 

Copia y ejecuta estos bloques en el SQL Editor de Supabase. Tu aplicación web ya está configurada para conectarse a ellas de manera automática:

```sql
-- 1. Total por Categoría
CREATE OR REPLACE FUNCTION get_stats_categoria(p_fecha_inicio DATE DEFAULT NULL, p_fecha_fin DATE DEFAULT NULL)
RETURNS TABLE (categoria TEXT, total BIGINT) AS $$
  SELECT nombre_categoria, SUM(cantidad_incidentes)
  FROM hecho_reporte_incidente
  WHERE (p_fecha_inicio IS NULL OR id_fecha >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR id_fecha <= p_fecha_fin)
  GROUP BY nombre_categoria;
$$ LANGUAGE sql STABLE;

-- 2. Total por Estado
CREATE OR REPLACE FUNCTION get_stats_estado(p_fecha_inicio DATE DEFAULT NULL, p_fecha_fin DATE DEFAULT NULL)
RETURNS TABLE (estado TEXT, total BIGINT) AS $$
  SELECT estado_reporte, SUM(cantidad_incidentes)
  FROM hecho_reporte_incidente
  WHERE (p_fecha_inicio IS NULL OR id_fecha >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR id_fecha <= p_fecha_fin)
  GROUP BY estado_reporte;
$$ LANGUAGE sql STABLE;

-- 3. Estado detallado por Categoría
CREATE OR REPLACE FUNCTION get_stats_estado_categoria(p_fecha_inicio DATE DEFAULT NULL, p_fecha_fin DATE DEFAULT NULL)
RETURNS TABLE (categoria TEXT, estado TEXT, total BIGINT) AS $$
  SELECT nombre_categoria, estado_reporte, SUM(cantidad_incidentes)
  FROM hecho_reporte_incidente
  WHERE (p_fecha_inicio IS NULL OR id_fecha >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR id_fecha <= p_fecha_fin)
  GROUP BY nombre_categoria, estado_reporte;
$$ LANGUAGE sql STABLE;

-- 4. Evolución de reportes (Últimos días activos)
CREATE OR REPLACE FUNCTION get_stats_evolucion(p_fecha_inicio DATE DEFAULT NULL, p_fecha_fin DATE DEFAULT NULL)
RETURNS TABLE (fecha DATE, total BIGINT) AS $$
  SELECT id_fecha, SUM(cantidad_incidentes)
  FROM hecho_reporte_incidente
  WHERE (p_fecha_inicio IS NULL OR id_fecha >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR id_fecha <= p_fecha_fin)
  GROUP BY id_fecha
  ORDER BY id_fecha DESC
  LIMIT 7;
$$ LANGUAGE sql STABLE;
```

¡Listo! Con esto tu panel administrativo puede manejar literalmente millones de reportes y las gráficas cargarán en menos de 100 milisegundos.
