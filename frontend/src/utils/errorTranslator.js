// Archivo: frontend/src/utils/errorTranslator.js

/**
 * Traduce los mensajes de error comunes de Supabase Auth/Storage al español.
 * Si no encuentra una traducción, devuelve un mensaje por defecto o el mensaje original.
 * 
 * @param {string} errorMessage - El mensaje de error original en inglés
 * @returns {string} - El mensaje de error traducido al español
 */
export const translateError = (errorMessage) => {
    if (!errorMessage) return "Ocurrió un error inesperado.";

    const msg = errorMessage.toLowerCase();

    // ── Errores de Autenticación ──
    if (msg.includes('invalid login credentials')) {
        return "Credenciales inválidas. Verifica tu correo y contraseña.";
    }
    if (msg.includes('user already registered')) {
        return "Este correo ya está registrado en el sistema.";
    }
    if (msg.includes('password should be at least')) {
        return "La contraseña es muy débil. Debe tener al menos 8 caracteres.";
    }
    if (msg.includes('email not confirmed')) {
        return "Debes confirmar tu correo electrónico antes de iniciar sesión.";
    }
    if (msg.includes('user not found')) {
        return "No existe un usuario con estas credenciales.";
    }
    
    // ── Errores de Red / Fetch ──
    if (msg.includes('failed to fetch') || msg.includes('network error')) {
        return "Error de conexión. Verifica tu internet e intenta de nuevo.";
    }

    // ── Errores de Base de Datos / RLS ──
    if (msg.includes('new row violates row-level security policy')) {
        return "No tienes permisos para realizar esta acción.";
    }

    // Si no coincide con nada, se puede devolver el original o uno genérico
    // Preferimos uno genérico en producción, o el original para debugging.
    return "Error del sistema: " + errorMessage;
};
