import { get, set, del, keys } from 'idb-keyval';
import { supabase } from '../supabaseClient';

const PENDING_REPORTS_KEY_PREFIX = 'pending_report_';

/**
 * Guarda un reporte en IndexedDB para ser subido posteriormente
 * @param {Object} formDataPayload - Los datos del formulario
 * @param {File} formDataPayload.foto - Opcional, el archivo de foto original
 * @param {string} idUsuario - ID del usuario de Supabase o null
 */
export const saveReportOffline = async (formDataPayload, idUsuario) => {
  const id = `${PENDING_REPORTS_KEY_PREFIX}${Date.now()}`;
  const record = {
    id,
    timestamp: Date.now(),
    payload: formDataPayload,
    idUsuario: idUsuario
  };
  await set(id, record);
  return id;
};

/**
 * Obtiene el conteo de reportes pendientes
 */
export const getPendingCount = async () => {
  try {
    const allKeys = await keys();
    return allKeys.filter(k => typeof k === 'string' && k.startsWith(PENDING_REPORTS_KEY_PREFIX)).length;
  } catch (error) {
    console.error("Error al obtener conteo offline:", error);
    return 0;
  }
};

/**
 * Intenta sincronizar todos los reportes pendientes a Supabase
 * @returns {number} La cantidad de reportes pendientes restantes (0 si todo se sincronizó)
 */
export const syncOfflineReports = async () => {
  if (!navigator.onLine) return await getPendingCount();

  const allKeys = await keys();
  const reportKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(PENDING_REPORTS_KEY_PREFIX));

  if (reportKeys.length === 0) return 0;

  console.log(`Intentando sincronizar ${reportKeys.length} reportes offline...`);

  for (const key of reportKeys) {
    try {
      const record = await get(key);
      if (!record) continue;

      const { payload, idUsuario } = record;
      let fotoUrl = null;

      // 1. Subir la foto si existe
      if (payload.foto) {
        const nombreArchivo = `${Date.now()}_offline_${payload.foto.name}`;
        const { error: uploadError } = await supabase.storage
          .from('evidencias')
          .upload(nombreArchivo, payload.foto);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('evidencias')
          .getPublicUrl(nombreArchivo);

        fotoUrl = publicUrlData.publicUrl;
      }

      // 2. Insertar en tabla padre 'reportes'
      const { data: reporteGuardado, error: dbError } = await supabase.from('reportes').insert([
        {
          categoria: payload.categoria,
          descripcion: payload.descripcion,
          coordenadas: payload.coordenadas,
          latitud: payload.latitud,
          longitud: payload.longitud,
          foto_url: fotoUrl,
          usuario_id: idUsuario
        }
      ]).select('id').single();

      if (dbError) throw dbError;

      // 3. Insertar en tablas hijas
      if (payload.categoria === 'Fauna') {
        const { error: errorEspecie } = await supabase.from('reportes_especies').insert([{
          reporte_id: reporteGuardado.id,
          nombre_comun: payload.nombreComun,
          nombre_cientifico: payload.nombreCientifico,
          condicion: payload.condicion,
          tipo_alerta: payload.tipoAlerta
        }]);
        if (errorEspecie) throw errorEspecie;
      } else if (payload.categoria === 'Desechos') {
        const { error: errorDesecho } = await supabase.from('reportes_desechos').insert([{
          reporte_id: reporteGuardado.id,
          tipo_material: payload.tipoMaterial,
          volumen_aproximado: payload.volumenAproximado,
          es_peligroso: payload.esPeligroso
        }]);
        if (errorDesecho) throw errorDesecho;
      } else if (payload.categoria === 'Actividad Antrópica') {
        const { error: errorActividad } = await supabase.from('reportes_actividades').insert([{
          reporte_id: reporteGuardado.id,
          tipo_actividad: payload.tipoActividad,
          maquinaria_presente: payload.maquinariaPresente
        }]);
        if (errorActividad) throw errorActividad;
      }

      // Si todo fue bien, lo borramos de IndexedDB
      await del(key);
      console.log(`Reporte offline ${key} sincronizado con éxito.`);

    } catch (error) {
      console.error(`Error al sincronizar el reporte ${key}:`, error);
      // No lo borramos, se intentará de nuevo en la próxima sincronización
    }
  }

  return await getPendingCount();
};
