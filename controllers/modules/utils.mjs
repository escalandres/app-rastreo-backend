import jwt from 'jsonwebtoken';


export function validateToken(token) { 
    try { 
        const decodedToken = jwt.verify(token, process.env.KEY); 
        console.log('Token válido'); 
        // Puedes realizar acciones adicionales con el decodedToken aquí 
        return decodedToken; 
    } catch (error) { 
        console.error('Token no válido:', error.message); // Maneja el error según sea necesario 
        return null; 
    } 
};

export function generarOTP() {
    const min = 100000; // El número mínimo de 6 dígitos (inclusive)
    const max = 999999; // El número máximo de 6 dígitos (inclusive)
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateTimestamp() {
    const limitInMilliseconds = 1800000; // 30 minutos en milisegundos
    const ahora = Date.now(); // Obtiene la marca de tiempo actual.
    const timestampWithLimit = ahora + limitInMilliseconds;
    return timestampWithLimit;
}

export function isEmptyObj(obj) { return Object.keys(obj).length === 0 && obj.constructor === Object; }

export function formatDateToTimestamp(date) { 
    const pad = num => num.toString().padStart(2, '0'); 
    const year = date.getFullYear(); 
    const month = pad(date.getMonth() + 1); 
    const day = pad(date.getDate()); 
    const hours = pad(date.getHours()); 
    const minutes = pad(date.getMinutes()); 
    const seconds = pad(date.getSeconds()); 
    const offset = -date.getTimezoneOffset(); 
    const sign = offset >= 0 ? '+' : '-'; 
    const offsetHours = pad(Math.floor(Math.abs(offset) / 60)); 
    const offsetMinutes = pad(Math.abs(offset) % 60); 
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`; 
}