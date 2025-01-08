import { guardarCoordenadas, getCurrentContainerShipment, updateShipment } from "./modules/database.mjs";
import { traducirEstado } from "./modules/utils.mjs";

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
    //console.log("mensaje", mensaje);
    // Expresión regular para extraer los datos
    // const regex = /\+CMGR:\s'REC UNREAD','(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);/;
    // const regex = /AT\+CMGR=\d+\+CMGR:\s'REC UNREAD','(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);OK/;
    // const regex = /\+CMT:\s'(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);/;
    const regex = /\+(CMT|CMGR):\s'REC UNREAD','(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);/;

    const resultado = regex.exec(mensaje);

    if (resultado) {
        const objetoDatos = {
            numero: resultado[2],
            fecha: formatDate(resultado[3]),
            id: resultado[4],
            latitud: parseFloat(resultado[5]),
            longitud: parseFloat(resultado[6])
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

        // Obtener información envío actual del rastreador provista por la paquetería
        const dbResult = await obtenerEnvioMasReciente(trackerData.id);
        if(dbResult.success){
            //Envio en curso
            if(!dbResult.result.delivery_date){
                let statusInfo = {};
                if(dbResult.result.shipment_data.company === "DHL"){
                    let companyInfo = await queryDHL(dbResult.result.shipment_data.tracking_number, dbResult.result.shipment_data. service_id);
                    statusInfo = processDHLResponse(companyInfo, dbResult.result.shipment_status);
                }

                const dbResponse = await updateShipment(dbResult.result.id, trackerData, statusInfo);
                console.log(dbResponse);
                if(!dbResponse.success){
                    return res.status(400).json({success: false, message: "Error al guardar coordenadas"})
                }else{
                    return res.status(200).json({success: true, message: "Coordenadas guardadas correctamente"})
                }
            }
        }
        
    } catch (error) {
        console.error('Ocurrio un error:',error);
        // Enviar respuesta JSON indicando fallo
        res.status(400).json({ success: false , message: "Error al guardar coordenadas"});
    }
}

async function obtenerEnvioMasReciente(trackerID) {
    return await getCurrentContainerShipment(trackerID);
}

async function queryDHL(trackingCode, service) {
    let serviceInfo = {};
    const myHeaders = new Headers();
    myHeaders.append("DHL-API-Key", process.env.DHL_API_KEY);    
    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };
    const language = "es";
    const limit = 1;
    console.log(`service: ${service}, language: ${language}, limit: ${limit}`);
    try{
        let response = await fetch(`https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingCode}&service=${service}&language=${language}&limit=${limit}`, requestOptions);
        let data = await response.text();
        serviceInfo = JSON.parse(data);
    }
    catch(error){
        console.error('error', error);
    }
    return serviceInfo;
}

function processDHLResponse(dhlResponse, shipmentStatus){
    console.log('processDHLResponse');
    console.log('dhlResponse',dhlResponse);
    console.log('shipmentStatus',shipmentStatus);
    console.log('dhlResponse.shipments.status',dhlResponse.shipments[0].status);
    //Verificar si el estatus ya existe en la DB
    const existe = shipmentStatus.some(item => item.timestamp === dhlResponse.shipments[0].status.timestamp);
    // Si no existe, extraer información a guardar
    if(!existe){
        let lastStatus = { 
            timestamp: dhlResponse.shipments[0].status.timestamp, 
            status_code: dhlResponse.shipments[0].status.statusCode,
            description: `${traducirEstado(dhlResponse.shipments[0].status.statusCode)} | ${dhlResponse.shipments[0].status.description}`,
            location: dhlResponse.shipments[0].status.location.address.addressLocality 
        };
        return lastStatus
    } 
    console.log('Estatus ya existe en la DB');
    return {};
}



