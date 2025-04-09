import { processTracker } from "./shipment.js";

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

function extraerDatos(mensaje) {
    // mensaje.replace('AT+', '');
    console.log("mensaje", mensaje);
    // Expresión regular para extraer los datos
    // const regex = /\+CMGR:\s'REC UNREAD','(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);/;
    // const regex = /AT\+CMGR=\d+\+CMGR:\s'REC UNREAD','(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);OK/;
    // const regex = /\+CMT:\s'(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);/;
    // const regex = /\+(CMT|CMGR):\s'REC UNREAD','(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);/;
    const regex = /\+(CMT|CMGR):\s'REC UNREAD','(\+52\d{10,12})','','([\d\/:,]+)-([\d\/:,]+)'{'id':'(\d+)',[^}]*time':'([\d\-:T]+)','cti':{'lac':'(\d+)','cellid':'(\d+)','mcc':'(\d+)','mnc':'(\d+)'},'lat':'([-\d.]+)','lon':'([-\d.]+)'}OK/gm;

    const resultado = regex.exec(mensaje);

    console.log("resultado", resultado);
    if (resultado) {
        const objetoDatos = {
            num_cell: resultado[2],
            cell_fecha: formatDate(resultado[3]),
            tracker_id: resultado[5],
            time: resultado[6],
            cell_lac: resultado[7],
            cell_id: resultado[8],
            cell_mcc: resultado[9],
            cell_mnc: resultado[10],
            latitud: parseFloat(resultado[11]),
            longitud: parseFloat(resultado[12])
        };
        console.log("objetoDatos", objetoDatos);
        const datosRastreador = {
            id: "48273619",
            date: formatDate(resultado[3]),
            lat: parseFloat(resultado[5]),
            lng: parseFloat(resultado[6])
        };
        return datosRastreador;
    } else {
        console.error("Formato de mensaje no válido");
        return {};
    }
}

export async function subirDatos(req, res){
    try {
        // Extraer datos del mensaje enviado por el rastreador
        const trackerData = extraerDatos(req.body.datos);
        console.log("Coordenadas:",trackerData);

        const response = await processTracker(trackerData);
        if(!response.success){
            return res.status(400).json({success: false, message: "Error al guardar coordenadas"})
        }else{
            return res.status(200).json({success: true, message: "Coordenadas guardadas correctamente"})
        }
            
        
        
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
        console.log("Coordenadas:",trackerData);
        res.status(200).json({ success: true , message: "Extraccion"});
    } catch (error) {
        console.error('Ocurrio un error:',error);
        // Enviar respuesta JSON indicando fallo
        res.status(400).json({ success: false , message: "Error al guardar coordenadas"});
    }
}

