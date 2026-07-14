import { useState } from 'react';

export function useValidacionForm(estadoInicial) {
    const [formulario, setFormulario] = useState(estadoInicial);
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

    const manejarCambio = (e) => {
        let { name, value, type, checked, dataset } = e.target;
        
        // 1. Buscadores
        if (name.toLowerCase().includes('buscar') || name === 'busqueda') {
            if (value.length > 30) {
                value = value.substring(0, 30);
                setAdvertenciaTemporal(name, 'Máximo 30 caracteres');
            }
        }

        // 2. Nombre y Apellido
        if ((name === 'nombre' && dataset.tipo !== 'especie') || name === 'apellido') {
            const newValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
            if (value !== newValue) {
                setAdvertenciaTemporal(name, 'Solo se permiten letras');
            }
            value = newValue;
            if (value.length > 20) {
                value = value.substring(0, 20);
                setAdvertenciaTemporal(name, 'Máximo 20 caracteres');
            }
        }

        // 3. Nombres de especies
        if (name === 'nombreCientifico' || name === 'nombre_cientifico' || (name === 'nombre' && dataset.tipo === 'especie')) {
            if (value.length > 50) {
                value = value.substring(0, 50);
                setAdvertenciaTemporal(name, 'Máximo 50 caracteres');
            }
        }

        // 4. Cédula
        if (name === 'cedula') {
            const newValue = value.replace(/\D/g, '');
            if (value !== newValue) {
                setAdvertenciaTemporal(name, 'Solo se permiten números');
            }
            value = newValue;
            if (value.length > 8) {
                value = value.substring(0, 8);
                setAdvertenciaTemporal(name, 'Máximo 8 caracteres');
            }
        }

        // 5. Correo Electrónico
        if (name === 'email' || name === 'correo') {
            if (value.length > 50) {
                value = value.substring(0, 50);
                setAdvertenciaTemporal(name, 'Máximo 50 caracteres');
            }
            // Validación de formato básico de correo (solo muestra advertencia si es inválido y no está vacío)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (value && !emailRegex.test(value)) {
                setAdvertenciaTemporal(name, 'Formato de correo inválido');
            }
        }

        // 6. Contraseñas
        if (name.toLowerCase().includes('password')) {
            if (value.length > 16) {
                value = value.substring(0, 16);
                setAdvertenciaTemporal(name, 'Máximo 16 caracteres');
            }
        }

        // 7. Descripciones
        if (name === 'descripcion' || name === 'protocolo_accion') {
            if (value.length > 500) {
                value = value.substring(0, 500);
                setAdvertenciaTemporal(name, 'Máximo 500 caracteres');
            }
        }

        setFormulario((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    return {
        formulario,
        setFormulario,
        manejarCambio,
        advertencias,
        setAdvertenciaTemporal
    };
}
