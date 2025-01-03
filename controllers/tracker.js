import { guardarCoordenadas, getCurrentContainerShipment, updateShipment } from "./modules/database.mjs";


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
    const regex = /\+CMT:\s'(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);/;

    const resultado = regex.exec(mensaje);

    if (resultado) {
        const objetoDatos = {
            numero: resultado[1],
            fecha: formatDate(resultado[2]),
            id: resultado[3],
            latitud: parseFloat(resultado[4]),
            longitud: parseFloat(resultado[5])
        };
        console.log("objetoDatos", objetoDatos);
        const datosRastreador = {
            date: formatDate(resultado[2]),
            lat: parseFloat(resultado[4]),
            lng: parseFloat(resultado[5])
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
        const dbResult = await obtenerEnvioMasReciente();
        if(shipmentInfo.success){
            //Envio en curso
            if(!dbResult.result.delivery_date){
                let statusInfo = {};
                if(dbResult.result.shipment_data.company === "DHL"){
                    let companyInfo = await queryDHL(dbResult.result.shipment_data.tracking_number, dbResult.result.shipment_data. service_id);
                    statusInfo = processDHLResponse(companyInfo, dbResult.result.shipment_status);
                }

                const dbResponse = await updateShipment(dbResult.result.id, trackerData, statusInfo);
            }
        }
        const result = await guardarCoordenadas(coordenadas);
        if(!result.success){
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
    //Verificar si el estatus ya existe en la DB
    const existe = shipmentStatus.some(item => item.timestamp === dhlResponse.status.timestamp);
    // Si no existe, extraer información a guardar
    if(!existe){
        let lastStatus = { 
            timestamp: dhlResponse.status.timestamp, 
            status_code: dhlResponse.status.statusCode,
            description: `${traducirEstado(dhlResponse.status.statusCode)} | ${dhlResponse.status.description}`,
            location: dhlResponse.status.location.address.addressLocality 
        };
        return lastStatus
    } 
    return {};
}

function traducirEstado(estado) { 
    const traducciones = { 
        'delivered': 'Entregado', 
        'transit': 'En tránsito', 
        'failure': 'Error' 
    }; 
    return traducciones[estado] || 'Estado desconocido';
}

