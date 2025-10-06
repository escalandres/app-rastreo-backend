import { processTracker } from "./shipment.js";
import { sendEncendido } from "./modules/email.mjs";
import { consoleLog, convertirUTCAMexico } from "./modules/utils.mjs";

export async function subirDatos(req, res){
    try {
        let mensajeReceptor = req.body.datos;
        consoleLog("Mensaje del receptor:", mensajeReceptor, true)
        const token = req.headers.authorization.replace("Bearer ", "");

        if (!token || token !== process.env.TOKEN) {
            return res.status(401).json({ success: false, message: "Token de autorización inválido" });
        }
        // Extraer datos del mensaje enviado por el rastreador
        const trackerData = extraerDatos(mensajeReceptor);
        consoleLog("datosRastreador", trackerData, true);
        
        if(trackerData != {}){
            const response = await processTracker(trackerData);
            if(!response.success){
                return res.status(400).json(response)
            }else{
                return res.status(200).json(response);
            }
        }
        
        return res.status(400).json({ success: false, message: "El mensaje no tiene un formato válido" })
        
    } catch (error) {
        console.error('Ocurrio un error:',error);
        // Enviar respuesta JSON indicando fallo
        res.status(400).json({ success: false , message: "Error al guardar coordenadas"});
    }
}

function extraerDatos(mensaje) {
    let regex = ""
    let datosRastreador = {};
    if(mensaje.includes("+CMGR: 'REC UNREAD'")){
        // Expresión regular para extraer los datos
        regex = /\+(CMT|CMGR):\s'REC UNREAD','(\+52\d{10,12})','','([\d\/:,]+)-([\d\/:,]+)'id:(\d+),time:([\d\-:T]+),red:(\w+),mcc:(\d+),mnc:(\d+),lac:(\d+),cid:(\d+),nb:(\d+),lat:([-\d.]+),lon:([-\d.]+)OK/gm;

        const resultado = regex.exec(mensaje);

        if (resultado) {
            datosRastreador = {
                numcell: resultado[2],
                fecha: formatDate_ddMMyyyy(resultado[3]),
                id: resultado[5],
                time: convertirUTCAMexico(resultado[6]),
                network: resultado[7],
                mcc: parseInt(resultado[8]),
                mnc: agregarCerosIzquierda(resultado[9]),
                lac: parseInt(resultado[10]),
                cid: parseInt(resultado[11]),
                batteryLevel: resultado[12],
                lat: parseFloat(resultado[13]),
                lng: parseFloat(resultado[14])
            };
        } else {
            consoleLog("Formato de mensaje no válido", "", true);
            return {};
        }
    }else if(mensaje.includes("+CMT: ")){
        regex = /\+CMT:\s'(\+52\d{10,12})','','([\d\/:,]+)-([\d\/:,]+)'id:(\d+),time:([\d\-:T]+),red:(\w+),mcc:(\d+),mnc:(\d+),lac:(\d+),cid:(\d+),nb:(\d+),lat:([-\d.]+),lon:([-\d.]+)/gm
        const resultado = regex.exec(mensaje);
        if (resultado) {
            datosRastreador = {
                numcell: resultado[1],
                fecha: formatDate_ddMMyyyy(resultado[2]),
                id: resultado[4],
                time: convertirUTCAMexico(resultado[5]),
                network: resultado[6],
                mcc: parseInt(resultado[7]),
                mnc: agregarCerosIzquierda(resultado[8]),
                lac: parseInt(resultado[9]),
                cid: parseInt(resultado[10]),
                batteryLevel: resultado[11],
                lat: parseFloat(resultado[12]),
                lng: parseFloat(resultado[13])
            };
            
        } else {
            consoleLog("Formato de mensaje no válido", "", true);
            return {};
        }

    }
    return datosRastreador;
}

export async function notificarEncendido(req, res){
    try {
        let mensajeReceptor = req.body.datos;
        consoleLog("Mensaje del receptor:", mensajeReceptor, true)
        const token = req.headers.authorization.replace("Bearer ", "");

        if (!token || token !== process.env.TOKEN) {
            return res.status(401).json({ success: false, message: "Token de autorización inválido" });
        }
        // Extraer datos del mensaje enviado por el rastreador
        const trackerData = extraerDatosEncendido(mensajeReceptor);
        consoleLog("Encendido", trackerData, true);
        
        if(trackerData != {}){
            const response = await sendEncendido(trackerData);
            if(!response.success){
                return res.status(400).json(response)
            }else{
                return res.status(200).json(response);
            }
        }
        
        return res.status(400).json({ success: false, message: "El mensaje no tiene un formato válido" })
        
    } catch (error) {
        console.error('Ocurrio un error:',error);
        // Enviar respuesta JSON indicando fallo
        res.status(400).json({ success: false , message: "Error al guardar coordenadas"});
    }
}

function extraerDatosEncendido(mensaje) {
    let regex = ""
    let datosRastreador = {};
    if(mensaje.includes("+CMGR: 'REC UNREAD'")){
        // Expresión regular para extraer los datos
        regex = /\+(CMT|CMGR):\s'REC UNREAD','(\+52\d{10,12})','','([\d\/:,]+)-([\d\/:,]+)'El rastreador:(\d+), esta encendido. Tiempo:([\d\-:T]+)OK/gm;

        const resultado = regex.exec(mensaje);

        if (resultado) {
            datosRastreador = {
                numcell: resultado[2],
                fecha: formatDate_ddMMyyyy(resultado[3]),
                tracker: resultado[5],
                time: convertirUTCAMexico(resultado[6]),
            };
        } else {
            consoleLog("Formato de mensaje no válido", "", true);
            return {};
        }
    }else if(mensaje.includes("+CMT: ")){
        regex = /\+CMT:\s'(\+52\d{10,12})','','([\d\/:,]+)-([\d\/:,]+)'tracker:(\d+),time:([\d\-:T]+)/gm
        const resultado = regex.exec(mensaje);
        if (resultado) {
            datosRastreador = {
                numcell: resultado[1],
                fecha: formatDate_ddMMyyyy(resultado[2]),
                tracker: resultado[4],
                time: convertirUTCAMexico(resultado[5]),
            };
            
        } else {
            consoleLog("Formato de mensaje no válido", "", true);
            return {};
        }

    }
    return datosRastreador;
}

// ---------------------- Funciones auxiliares ------------------

function formatDate_ddMMyyyy(inputDate) {
    // Divide la fecha y la hora
    const [datePart, timePart] = inputDate.split(',');
    consoleLog("inputDate", inputDate);
    consoleLog("datePart", datePart);
    consoleLog("timePart", timePart);
    // Divide los componentes de la fecha
    const [dd, MM, yy] = datePart.split('/');

    // Divide los componentes de la hora (ignorando los segundos y la zona horaria)
    const [hh, mm] = timePart.split(':');

    // Formatea la nueva fecha
    const formattedDate = `${dd}/${MM}/20${yy} a las ${hh}:${mm}`;

    return formattedDate;
}

function agregarCerosIzquierda(cadena) {
    return cadena.toString().padStart(3, '0');
}

// Función de prueba para extraer datos

export async function subirDatos1(req, res){
    try {
        // Extraer datos del mensaje enviado por el rastreador
        const trackerData = extraerDatos(req.body.datos);
        consoleLog("Coordenadas:",trackerData);
        res.status(200).json({ success: true , result: trackerData});
    } catch (error) {
        console.error('Ocurrio un error:',error);
        // Enviar respuesta JSON indicando fallo
        res.status(400).json({ success: false , message: "Error al guardar coordenadas"});
    }
}

