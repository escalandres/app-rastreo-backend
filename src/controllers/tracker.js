import { processTracker } from "./shipment.js";
import { sendTrackerOn, sendTrackerActivated } from "./modules/email.mjs";
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
        // consoleLog("datosRastreador", trackerData, true);
        
        if(Object.keys(trackerData).length > 0){
            console.log("Comienza proceso de guardado de datos");
            const response = await processTracker(trackerData);
            if(!response.success){
                return res.status(400).json(response)
            }else{
                return res.status(200).json(response);
            }
        }
        console.log("El mensaje no tiene un formato válido");
        return res.status(400).json({ success: false, message: "El mensaje no tiene un formato válido" })
        
    } catch (error) {
        console.error('Ocurrio un error:',error);
        // Enviar respuesta JSON indicando fallo
        res.status(400).json({ success: false , message: "Error al guardar coordenadas"});
    }
}

function extraerDatos(mensaje) {
    let datosRastreador = {};

    if (mensaje.includes("+CMGR")) {
        const regex = /\+(CMT|CMGR):\s'REC UNREAD','(\+52\d{10,12})','','([\d\/:,]+)-([\d\/:,]+)'id:(\d+),time:([\d\-:T]+),red:(\w+),mcc:(\d+),mnc:(\d+),lac:(\d+),cid:(\d+),bat:(\d+),lat:([-\d.]+),lon:([-\d.]+),gps_fix:(\d+)/m;

        const r = regex.exec(mensaje);
        if (!r) return {};
        console.log("r", r);
        datosRastreador = {
            numcell: r[2],
            fecha: formatDate_ddMMyyyy(r[3]),
            id: r[5],
            time: convertirUTCAMexico(r[6]),
            network: r[7],
            mcc: Number(r[8]),
            mnc: agregarCerosIzquierda(r[9]),
            lac: Number(r[10]),
            cid: Number(r[11]),
            batteryLevel: Number(r[12]),
            lat: Number(r[13]),
            lng: Number(r[14]),
            gps_fix: r[15] === '1'
        };
        console.log("r", r);
        console.log("gos_fix", r[15]);
    } else if (mensaje.includes("+CMT")) {
        const regex = /\+CMT:\s*'(\+52\d{10,12})','','([\d\/:,]+)-([\d\/:,]+)'id:(\d+),time:([\d\-:T]+),red:(\w+),mcc:(\d+),mnc:(\d+),lac:(\d+),cid:(\d+),bat:(\d+),lat:([-\d.]+),lon:([-\d.]+),gps_fix:(\d+)/m;

        const r = regex.exec(mensaje);
        if (!r) return {};
        // console.log("r2", r);
        datosRastreador = {
            numcell: r[1],
            fecha: formatDate_ddMMyyyy(r[2]),
            id: r[4],
            time: convertirUTCAMexico(r[5]),
            network: r[6],
            mcc: Number(r[7]),
            mnc: agregarCerosIzquierda(r[8]),
            lac: Number(r[9]),
            cid: Number(r[10]),
            batteryLevel: Number(r[11]),
            lat: Number(r[12]),
            lng: Number(r[13]),
            gps_fix: r[15] === '1'
        };
        console.log("r", r);
        console.log("gos_fix", r[15]);
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
        
        if(Object.keys(trackerData).length > 0){
            const response = await sendTrackerOn(trackerData);
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

export async function notificarRastreoActivo(req, res){
    try {
        let mensajeReceptor = req.body.datos;
        consoleLog("Mensaje del receptor:", mensajeReceptor, true)
        const token = req.headers.authorization.replace("Bearer ", "");

        if (!token || token !== process.env.TOKEN) {
            return res.status(401).json({ success: false, message: "Token de autorización inválido" });
        }
        // Extraer datos del mensaje enviado por el rastreador
        const trackerData = extraerDatosRastreoActivo(mensajeReceptor);
        consoleLog("Rastreo ON", trackerData, true);
        
        if(Object.keys(trackerData).length > 0){
            const response = await sendTrackerActivated(trackerData);
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
    let datosRastreador = {};

    if (mensaje.includes("+CMGR")) {
        const regex = /\+(CMT|CMGR):\s'REC UNREAD','(\+52\d{10,12})','','([\d\/:,]+)-([\d\/:,]+)'El rastreador:\s*(\d+),\s*esta encendido\. Tiempo:\s*([\d\-:T]+)\.OK/gm;

        const resultado = regex.exec(mensaje);
        if (!resultado) return {};
        console.log("resultado1", resultado);
        datosRastreador = {
            numcell: resultado[1],
            fecha: formatDate_ddMMyyyy(resultado[2]),
            tracker: resultado[3],
            time: convertirUTCAMexico(resultado[4]),
        };

    } else if (mensaje.includes("+CMT")) {
        const regex = /\+CMT:\s'(\+52\d{10,12})','','([\d\/:,]+)-([\d\/:,]+)'El rastreador:\s*(\d+),\s*esta encendido\. Tiempo:\s*([\d\-:T]+)\./gm;

        const resultado = regex.exec(mensaje);
        if (!resultado) return {};
        // console.log("resultado2", resultado);
        datosRastreador = {
            numcell: resultado[1],
            fecha: formatDate_ddMMyyyy(resultado[2]),
            tracker: resultado[4],
            time: convertirUTCAMexico(resultado[5]),
        };
    }

    return datosRastreador;
}

function extraerDatosRastreoActivo(mensaje) {
    const encabezado = mensaje.includes("+CMGR")
        ? "\\+(CMT|CMGR):\\s'REC UNREAD',"
        : mensaje.includes("+CMT")
            ? "\\+CMT:\\s*"
            : null;

    if (!encabezado) return {};

    const regexAhorro = new RegExp(
        `${encabezado}'?(\\+52\\d{10,12})'?,'','([\\d\\/,:,]+)-([\\d\\/,:,]+)'` +
        `Rastreo con Modo Ahorro ACTIVADO\\. Rastreador:\\s*(\\d+)\\. ` +
        `Time:\\s*([\\d\\-:T]+)\\. INT:\\s*` +
        `([0-9]+)D([0-9]+)H([0-9]+)M([0-9]+)S`,
        "m"
    );

    const regexContinuo = new RegExp(
        `${encabezado}'?(\\+52\\d{10,12})'?,'','([\\d\\/,:,]+)-([\\d\\/,:,]+)'` +
        `Rastreo Continuo ACTIVADO\\. Rastreador:\\s*(\\d+)\\. ` +
        `Time:\\s*([\\d\\-:T]+)`,
        "m"
    );

    let resultado = regexAhorro.exec(mensaje);
    console.log("resultado", resultado);
    if (resultado) {
        return {
            fecha: formatDate_ddMMyyyy(resultado[2]),
            tracker: resultado[4],
            time: convertirUTCAMexico(resultado[5]),
            dias: Number(resultado[6]),
            horas: Number(resultado[7]),
            minutos: Number(resultado[8]),
            seg: Number(resultado[9]),
            modo: "ahorro"
        };
    }

    resultado = regexContinuo.exec(mensaje);
    if (resultado) {
        return {
            fecha: formatDate_ddMMyyyy(resultado[3]),
            tracker: resultado[5],
            time: convertirUTCAMexico(resultado[6]),
            dias: 0,
            horas: 0,
            minutos: 0,
            seg: 59,
            modo: "continuo"
        };
    }

    return {};
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

