import jwt from 'jsonwebtoken';


// export const consoleLog = {
//     prod: function(title, message){
//         console.log()
//     }
// }

export function consoleLog(title, message = "", showOnProd = false) {
    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
        if (showOnProd) {
            console.log(title, message);
        }
    } else {
        // Siempre muestra en development
        console.log(title, message);
    }
}

export function validateToken(req) { 
    try {
        const authHeader = req.headers['authorization']; 
        if (!authHeader) return null;
        const token = authHeader.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.KEY); 
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

export function translateStatusFedex(estado) { 
    // console.log('translateStatusFedex estado', estado);
    if (estado.indexOf('Delivered') !== -1) return 'delivered';
    if (estado.indexOf('Error') !== -1) return 'failure';
    return 'transit';
}

export function colorStatus(estado) { 
    const colores = {
        delivered: 'color: green;',
        transit: 'color: #FE7600;',
        failure: 'color: red;'
    };
    return colores[estado] || 'color: gray;';
}

export function translateStatusCode(estado) { 
    const traducciones = { 
        'ENTREGADO':'delivered', 
        'en tránsito': 'transit', 
        'error': 'failure'
    }; 
    return traducciones[estado] || estado;
}

export function convertDateToReport (cadena = '') {
    if (!cadena) return '';
    const meses = [ "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre" ];
    const fecha = new Date(cadena);
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();
    let hora = fecha.getHours();
    const minutos = fecha.getMinutes();
    const ampm = hora >= 12 ? 'pm' : 'am';
    hora = hora % 12 || 12;
    const strMinutos = minutos < 10 ? '0' + minutos : minutos;
    return `${dia} ${mes} ${año}, ${hora}:${strMinutos} ${ampm}`;
};

export function generateDate(date = '') {
    console.log('date', date);
    const d = date === '' ? new Date() : new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function processLocation(source, radius) {
    console.log('source', source);
    if (source === "CELL_TOWER") {
        return `Aproximada, en un radio de ${radius / 1000} km`
    }else if (source === "GPS") {
        return 'GPS, ubicación exacta'
    }else {
        return 'Fuente desconocida'
    }
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
    const [day, month, year] = datePart.split('/');

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

export function getMostRecentEntry(array) {
    if (array.length === 0) {
        return null; // O el valor que desees para un array vacío
    }

    return array.reduce((latest, current) => {
        return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
    });
}


export function getOldestEntry(array) {
    return array.reduce((oldest, current) => {
        return new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest;
    });
}


export function generarCoordenadasCiudadMexico() {
    const latMin = 19.000; // Latitud mínima aproximada de la Ciudad de México
    const latMax = 19.600; // Latitud máxima aproximada de la Ciudad de México
    const lonMin = -99.400; // Longitud mínima aproximada de la Ciudad de México
    const lonMax = -98.800; // Longitud máxima aproximada de la Ciudad de México

    const latitud = (Math.random() * (latMax - latMin) + latMin).toFixed(6);
    const longitud = (Math.random() * (lonMax - lonMin) + lonMin).toFixed(6);
    let fechaActual = new Date();
    let fechaISO = fechaActual.toISOString();
    return {
        lat: parseFloat(latitud),
        lng: parseFloat(longitud),
        date: fechaISO
    };
}

export function convertirUTCAMexico(fechaUTC) {
    if (!fechaUTC || fechaUTC === 'INVALID') return null;

    let fechaMexico = new Date(fechaUTC+"Z").toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    let fecha = new Date(fechaMexico);
    
    let año = fecha.getFullYear();
    let mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Meses en JS van de 0-11
    let dia = String(fecha.getDate()).padStart(2, '0');
    let horas = String(fecha.getHours()).padStart(2, '0');
    let minutos = String(fecha.getMinutes()).padStart(2, '0');
    let segundos = String(fecha.getSeconds()).padStart(2, '0');

    return `${año}-${mes}-${dia}T${horas}:${minutos}:${segundos}`;
}

export function getCurrentTime(){
    let nowInMexico = new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" });
    let dateInMexico = new Date(nowInMexico);

    let yyyy = dateInMexico.getFullYear();
    let MM = String(dateInMexico.getMonth() + 1).padStart(2, '0');
    let dd = String(dateInMexico.getDate()).padStart(2, '0');
    let hh = String(dateInMexico.getHours()).padStart(2, '0');
    let mm = String(dateInMexico.getMinutes()).padStart(2, '0');
    let ss = String(dateInMexico.getSeconds()).padStart(2, '0');

    let formattedDate = `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}`;

    consoleLog("current time", formattedDate, true);
    return formattedDate;
}

