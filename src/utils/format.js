/**
 * Formatea un número al estilo de moneda de Venezuela/España:
 * Separa los miles con punto (.) y los decimales con coma (,)
 * @param {number} value - El número a formatear
 * @returns {string} - El string formateado
 */
export const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '0,00';
    
    return value.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Usamos locale 'de-DE' (Alemán) porque sigue exactamente el mismo 
// formato que pidió el usuario (puntos para miles, comas para decimales)
