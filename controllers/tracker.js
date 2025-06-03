import { processTracker } from "./shipment.js";
import { sendOtpEmail, sendNotifyEmail } from "./modules/email.mjs";
import { consoleLog, convertirUTCAMexico } from "./modules/utils.mjs";

function formatDate(inputDate) {
    // Divide la fecha y la hora
    const [datePart, timePart] = inputDate.split(',');

    // Divide los componentes de la fecha
    const [yy, MM, dd] = datePart.split('/');

    // Divide los componentes de la hora
    const [hh, mm] = timePart.split(':');

    // Formatea la nueva fecha
    const formattedDate = `${dd}/${MM}/20${yy} a las ${hh}:${mm}`;

    return formattedDate;
}

function agregarCerosIzquierda(cadena) {
    return cadena.toString().padStart(3, '0');
}


function extraerDatos(mensaje) {
    // Expresión regular para extraer los datos
    const regex = /\+(CMT|CMGR):\s'REC UNREAD','(\+52\d{10,12})','','([\d\/:,]+)-([\d\/:,]+)'id:(\d+),time:([\d\-:T]+),red:(\w+),mcc:(\d+),mnc:(\d+),lac:(\d+),cid:(\d+),nb:(\d+),lat:([-\d.]+),lon:([-\d.]+)OK/gm;

    const resultado = regex.exec(mensaje);

    if (resultado) {
        const datosRastreador = {
            numcell: resultado[2],
            fecha: formatDate(resultado[3]),
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
        return datosRastreador;
    } else {
        consoleLog("Formato de mensaje no válido", "", true);
        return {};
    }
}

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

export async function subirDatos1(req, res){
    try {
        // Extraer datos del mensaje enviado por el rastreador
        const trackerData = extraerDatos(req.body.datos);
        consoleLog("Coordenadas:",trackerData);
        res.status(200).json({ success: true , message: "Extraccion"});
    } catch (error) {
        console.error('Ocurrio un error:',error);
        // Enviar respuesta JSON indicando fallo
        res.status(400).json({ success: false , message: "Error al guardar coordenadas"});
    }
}

