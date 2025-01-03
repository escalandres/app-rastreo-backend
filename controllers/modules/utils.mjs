import jwt from 'jsonwebtoken';


export function validateToken(token) { 
    try { 
        console.log("token:", token);
        const decodedToken = jwt.verify(token, process.env.KEY); 
        console.log('Token válido:', decodedToken); 
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