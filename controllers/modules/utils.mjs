import jwt from 'jsonwebtoken';


export function validateToken(token) { 
    try { 
        const decodedToken = jwt.verify(token, process.env.KEY); 
        // console.log('Token válido'); 
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

export function translateStatus(estado) { 
    const traducciones = { 
        'delivered': 'Entregado', 
        'transit': 'En tránsito', 
        'failure': 'Error' 
    }; 
    return traducciones[estado] || 'Estado desconocido';
}

export function translateStatusCode(estado) { 
    const traducciones = { 
        'ENTREGADO':'delivered', 
        'en tránsito': 'transit', 
        'error': 'failure'
    }; 
    return traducciones[estado] || estado;
}

export function convertToISO(fecha, hora) {
    if(!fecha || !hora) {
        return '';
    }
    // Mapeo de nombres de días a números de mes y día
    const meses = {
        '1': '01', '2': '02', '3': '03', '4': '04', '5': '05', '6': '06', '7': '07',
        '8': '08', '9': '09', '10': '10', '11': '11', '12': '12'
    };
    
    // Extraer el mes, día y año de la fecha
    const [, datePart] = fecha.split(', ');
    const [mes, dia, año] = datePart.split('/');
    const formattedDate = `20${año}-${meses[mes]}-${dia.padStart(2, '0')}`;
    
    // Convertir la hora al formato 24 horas
    const [time, period] = hora.split(' ');
    let [horas, minutos] = time.split(':');
    horas = parseInt(horas, 10);
    if (period === 'PM' && horas !== 12) {
        horas += 12;
    } else if (period === 'AM' && horas === 12) {
        horas = 0;
    }
    
    // Formatear la hora correctamente
    const formattedTime = `${horas.toString().padStart(2, '0')}:${minutos.padStart(2, '0')}:00`;
    
    return `${formattedDate}T${formattedTime}`;
}

export function convertToISOFromDDMMYYYY(dateString) {
    const [datePart, timePart, period] = dateString.split(' ');

    // Separar día, mes y año
    const [month, day, year] = datePart.split('/');

    // Separar hora y minutos
    let [hours, minutes] = timePart.split(':');

    // Convertir la hora a formato 24 horas
    if (period === 'P. M.' && hours !== '12') {
        hours = parseInt(hours, 10) + 12;
    } else if (period === 'A. M.' && hours === '12') {
        hours = '00';
    }

    // Crear la fecha en formato ISO
    const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00Z`;

    return isoString;
}


export function createStatusCodeFromDescription(description) {
    if(description === 'Delivered') return 'delivered';
    return 'transit';
}

export function extractDetailsFromEstafeta(entry) {
    const regex = /(.+?) \((.+?)\) (.+)/;
    const match = entry.match(regex);
    
    if (match) {
        const [_, place, code, movement] = match;
        return { place, code, movement };
    }
    return null;
}

export function getMostRecentEntry(array){
    array.reduce((latest, current) => {
        return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
    });
}
