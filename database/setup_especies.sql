-- Paso 1: Crear la tabla especies
CREATE TABLE especies (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    nombre_cientifico TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('Anida', 'Encalla', 'Invasora')),
    descripcion TEXT NOT NULL,
    protocolo_accion TEXT,
    imagen_url TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security para la tabla especies
ALTER TABLE especies ENABLE ROW LEVEL SECURITY;

-- Crear políticas para la tabla especies
-- Permitir que cualquier usuario (incluso no autenticados) pueda leer (SELECT) las especies
CREATE POLICY "Permitir lectura publica de especies"
ON especies FOR SELECT
USING (true);

-- Permitir que cualquier usuario pueda insertar/actualizar/eliminar (para propósitos de prueba/desarrollo)
-- En producción, esto debería estar restringido solo a usuarios administradores.
CREATE POLICY "Permitir insercion publica de especies"
ON especies FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir actualizacion publica de especies"
ON especies FOR UPDATE
USING (true);

CREATE POLICY "Permitir eliminacion publica de especies"
ON especies FOR DELETE
USING (true);

-- Paso 2: Crear el bucket de almacenamiento para las imágenes
INSERT INTO storage.buckets (id, name, public) VALUES ('imagenes_especies', 'imagenes_especies', true)
ON CONFLICT (id) DO NOTHING;

-- Paso 3: Configurar las políticas de seguridad (RLS) para el bucket
-- Permitir lectura a todos (público)
CREATE POLICY "Permitir lectura publica de imagenes de especies"
ON storage.objects FOR SELECT
USING (bucket_id = 'imagenes_especies');

-- Permitir inserción/subida (anon)
CREATE POLICY "Permitir subida anonima de imagenes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'imagenes_especies');

-- Permitir actualización/eliminación (anon)
CREATE POLICY "Permitir actualizacion y borrado de imagenes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'imagenes_especies');

CREATE POLICY "Permitir borrado de imagenes"
ON storage.objects FOR DELETE
USING (bucket_id = 'imagenes_especies');

-- Paso 4: Insertar datos de prueba iniciales (Las 12 especies originales del catálogo)
INSERT INTO especies (nombre, nombre_cientifico, tipo, descripcion, imagen_url) VALUES
('Tortuga Cardón', 'Dermochelys coriacea', 'Anida', 'La tortuga marina más grande del mundo. Frecuenta nuestras costas para desovar en la oscuridad. Puede superar los 2 metros de longitud y pesar hasta 700 kg.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Tortuga-Cardon.png'),
('Tortuga Verde', 'Chelonia mydas', 'Anida', 'Herbívora y vital para los ecosistemas de pastos marinos. Sus nidos requieren extrema protección debido al tráfico ilegal de huevos.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Tortuga-Verde.png'),
('Tortuga Carey', 'Eretmochelys imbricata', 'Anida', 'Especie en peligro crítico, reconocible por su hermoso caparazón con escamas superpuestas. Anida en zonas de vegetación costera y se alimenta de esponjas marinas.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Tortuga-Carey.png'),
('Tortuga Caguama', 'Caretta caretta', 'Anida', 'Mandíbulas poderosas para triturar moluscos y crustáceos. Sus rastros en la arena son anchos y asimétricos, fáciles de identificar durante los patrullajes nocturnos.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Tortuga-Caguama.png'),
('Delfín Nariz de Botella', 'Tursiops truncatus', 'Encalla', 'Especie altamente inteligente y social. Los varamientos suelen ocurrir por desorientación, enfermedad o contaminación acústica submarina.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Delfin-Nariz-De-Botella.png'),
('Delfín Común', 'Delphinus delphis', 'Encalla', 'Viajan en grandes manadas de hasta cientos de individuos. Un varamiento masivo requiere activación inmediata del protocolo de respuesta rápida.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Delfin-Comun.png'),
('Tortugas Marinas', 'Chelonioidea (varias especies)', 'Encalla', 'Los encallamientos pueden deberse a asfixia por redes de pesca, ingesta de plásticos o colisiones con embarcaciones. Requieren atención veterinaria inmediata.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Tortugas-Marinas.png'),
('Pez León', 'Pterois volitans', 'Invasora', 'Depredador voraz sin enemigos naturales en el Caribe. Sus espinas dorsales son venenosas. Representa una amenaza grave para los arrecifes de coral y la biodiversidad local.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Pez-Leon.png'),
('Algas Exóticas', 'Caulerpa taxifolia', 'Invasora', 'Crecimiento descontrolado que asfixia los corales nativos, altera la química del agua y desplaza la fauna bentónica local.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Algas-Exoticas.png'),
('Mejillón Verde', 'Perna viridis', 'Invasora', 'Desplaza a las especies de bivalvos locales y puede obstruir infraestructuras costeras como tuberías y muelles.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Mejillon-Verde.png'),
('Erizo de Mar', 'Diadema antillarum', 'Invasora', 'En ausencia de depredadores naturales, su sobrepoblación destruye la cobertura de algas coralinas esenciales para la salud del arrecife.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Erizo-de-Mar.png'),
('Coral Invasor Unomia', 'Unomia stolonifera', 'Invasora', 'Especie de rápido crecimiento que compite agresivamente por espacio y luz con los corales nativos, sofocando los ecosistemas coralinos.', 'https://kyzcdqxpcmkvogpiisfr.supabase.co/storage/v1/object/public/imagenes_especies/default/Coral-Invasor.png');

-- Nota: Las URLs de imágenes en este insert de prueba apuntarán a imágenes que posiblemente no existan en el storage aún (darán 404),
-- pero la estructura funcionará y el administrador podrá subir nuevas imágenes editando estas especies o creando nuevas.
