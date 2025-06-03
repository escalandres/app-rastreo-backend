import jwt from "jsonwebtoken";
import { generarOTP, validateToken, consoleLog } from "./modules/utils.mjs";
import { consultaEmpresasPaqueteria, registerNewShipment, getContainerShipments, 
    getCurrentContainerShipment, getUserContainers, linkTracker, getAppInfo, 
    db_startShipment, db_updateTracker, db_getShipmentInfo } from "./modules/database.mjs";

import { generarPDF, generarReporteSeguimiento } from "./modules/pdf.mjs";

export async function dhlTracking(req, res) {
    const myHeaders = new Headers();
    myHeaders.append("DHL-API-Key", process.env.DHL_API_KEY);

    // consoleLog(process.env.DHL_API_KEY);
    
    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };
    const trackingCode = 2989923510;
    // const trackingCode = 1466833546;
    const service = "express";
    const language = "it";
    const limit = 2;
    consoleLog(`service: ${service}, language: ${language}, limit: ${limit}`);
    fetch(`https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingCode}&service=${service}&language=${language}&limit=${limit}`, requestOptions)
        .then((response) => response.text())
        .then((result) => consoleLog(result))
        .catch((error) => console.error(error));
    return res.status(200).json({ message: "Shipment tracked successfully" });
}

export async function obtenerInfo(req, res) {
    consoleLog("Obteniendo Info");
    const authHeader = req.headers['authorization']; 
    if (authHeader) { 
        const token = authHeader.split(' ')[1]; // Assuming 'Bearer <token>' 
        const decodedToken = validateToken(token);
        if(decodedToken){
            let response = await getAppInfo(decodedToken.user.id);
            consoleLog(response);
            return res.status(200).json({success: response.success, results: response.results, error: response.error});
        }
    } else { 
        return res.status(401).json({success: false, results: {}, error: 'Token no válido'});
    }   
}

export async function registrarNuevoEnvio(req, res) {
    const { containerID, startDate, deliveryDate, shipmentData, locations, shipmentStatus } = req.body;

    const shipment = {
        "container_id": containerID,
        "start_date": startDate,
        "delivery_date": deliveryDate,
        "shipment_data": shipmentData,
        "locations": locations,
        "shipment_status": shipmentStatus
    };

    const result = await registerNewShipment(shipment);
    if(!result.success){
        return res.status(400).json({success: false, message: result.error});
    }else{
        return res.status(200).json({success: true, message: result.result});
    }
}

export async function obtenerContenedoresUsuario(req, res) {
    consoleLog("Obteniendo contenedores de usuario");
    const authHeader = req.headers['authorization']; 
    if (authHeader) { 
        const token = authHeader.split(' ')[1]; // Assuming 'Bearer <token>' 
        const decodedToken = validateToken(token);
        if(decodedToken){
            const result = await getUserContainers(decodedToken.user.id);
            if(!result.success){
                return res.status(400).json({success: false, message: result.error});
            }else{
                return res.status(200).json({success: true, message: result.results});
            }
        }
        res.status(401).json({ success: false, message: 'El token proporcionado no es válido' });
    } else { 
        return res.status(404).json({ success: false, message: 'No se proporcionó el token' });
    }
}

export async function obtenerEnviosContenedor(req, res) {
    consoleLog("req.query:", req.query);
    const { containerID } = req.query;
    consoleLog("containerID:", containerID);
    const result = await getContainerShipments(containerID);
    if(!result.success){
        return res.status(400).json({success: false, message: result.error});
    }else{
        return res.status(200).json({success: true, message: result.results});
    }
}

export async function obtenerEnvioMasReciente(req, res) {
    consoleLog("Obteniendo envío más reciente");
    const { trackerID } = req.query;
    const authHeader = req.headers['authorization']; 
    const token = authHeader.split(' ')[1]; // Assuming 'Bearer <token>' 
    const decodedToken = validateToken(token);
    if(decodedToken){
        const result = await getCurrentContainerShipment(trackerID);
        if(!result.success){
            return res.status(400).json({success: false, message: result.error, result: {}});
        }else{
            return res.status(200).json({success: true, message: '', result: result.result});
        }
    }
    return res.status(401).json({ success: false, message: 'El token proporcionado no es válido' });
}

export async function vincularRastreador(req, res) {
    consoleLog("vinculado rastreador");
    try{
        const { trackerID } = req.body;
        const authHeader = req.headers['authorization']; 
        if (authHeader) { 
            const token = authHeader.split(' ')[1]; // Assuming 'Bearer <token>' 
            const decodedToken = validateToken(token);
            if(decodedToken){
                const tracker = {
                    id: parseInt(trackerID),
                    user_id: decodedToken.user.id,
                    nickname: `Rastreador ${trackerID}`,
                    linking_date: new Date(),
                    img: { src: "/icons/send-box.png", alt: "Send box" },
                    shipments: []
                }
                const result = await linkTracker(tracker);
                consoleLog("result:", result);
                if(!result.success){
                    return res.status(200).json({success: false, message: result.error});
                }else{
                    return res.status(200).json({success: true, message: result.message});
                }
            }
            return res.status(401).json({ success: false, message: 'No se proporcionó el token o no es válido' });
        } else { 
            res.status(401).json({ success: false, message: 'No se proporcionó el token o no es válido' });
        }
    }catch(error){
        console.error("Error:", error);
        res.status(500).json({ success: false, message: 'Ocurrió un error al vincular' });

    }
    
}

export async function startShipment(req, res) {
    try{
        const { trackerID, companyID, serviceID, trackingCode } = req.body;
        const authHeader = req.headers['authorization']; 
        if (authHeader) { 
            const token = authHeader.split(' ')[1]; // Assuming 'Bearer <token>' 
            const decodedToken = validateToken(token);
            if(decodedToken){
                const shipment = {
                    id: generarOTP(),
                    container_id: parseInt(trackerID),
                    start_date: new Date().toISOString(),
                    delivery_date: null,
                    shipment_data: {
                        company: companyID,
                        service_id: serviceID,
                        tracking_number: trackingCode
                    },
                    shipment_status: [],
                    locations: []
                }
                const result = await db_startShipment(shipment);
                // consoleLog("result:", result);
                if(!result.success){
                    return res.status(200).json({success: false, message: result.error});
                }else{
                    return res.status(200).json({success: true, message: result.message});
                }
            }
            return res.status(401).json({ success: false, message: 'No se proporcionó el token o no es válido' });
        } else { 
            res.status(401).json({ success: false, message: 'No se proporcionó el token o no es válido' });
        }
    }catch(error){
        console.error("Error:", error);
        res.status(500).json({ success: false, message: 'Ocurrió un error al vincular' });

    }
    
}

export async function updateTracker(req, res) {
    consoleLog("updateTracker");
    try{
        const { trackerId, nickname, img } = req.body;
        const authHeader = req.headers['authorization']; 
        if (authHeader) { 
            const token = authHeader.split(' ')[1]; // Assuming 'Bearer <token>' 
            const decodedToken = validateToken(token);
            if(decodedToken){
                const result = await db_updateTracker(trackerId, nickname, img);
                consoleLog("result:", result);
                if(!result.success){
                    return res.status(400).json({success: false, message: result.error});
                }else{
                    return res.status(200).json({success: true, message: result.message});
                }
            }
        }
        return res.status(401).json({ success: false, message: 'No se proporcionó el token o no es válido' });
    }catch(error){
        console.error("Error:", error);
        return res.status(500).json({ success: false, message: 'Ocurrió un error al vincular' });

    }
    
}

export async function generateReport(req, res){
    consoleLog("generateReport");
    try{
        const result = await generarPDF();
        return res.status(200).json({success: true, message: result});
    }catch(error){
        console.error("Error:", error);
        return res.status(500).json({ success: false, message: 'Ocurrió un error al generar el reporte' });
    }
}

export async function generateCurrentReporteSeguimiento(req, res){
    consoleLog("generateReporteSeguimiento");
    const { containerID } = req.query;
    consoleLog("containerID:", containerID);
    try{
        const result = await getCurrentContainerShipment(containerID);
        const pdf = await generarReporteSeguimiento(result.result);
        return res.status(200).json({success: true, file: pdf});
    }catch(error){
        console.error("Error:", error);
        return res.status(500).json({ success: false, message: 'Ocurrió un error al generar el reporte' });
    }
}

export async function generateReporteSeguimiento(req, res){
    consoleLog("generateReporteSeguimiento");
    const { shipmentId } = req.query;
    consoleLog("shipmentId:", shipmentId);
    consoleLog("shipmentId:", typeof(shipmentId));
    try{
        const result = await db_getShipmentInfo(parseInt(shipmentId));
        consoleLog("result:", result);
        const pdf = await generarReporteSeguimiento(result.results);
        return res.status(200).json({success: true, file: pdf});
    }catch(error){
        console.error("Error:", error);
        return res.status(500).json({ success: false, message: 'Ocurrió un error al generar el reporte' });
    }
}

export async function getShipments(req, res){
    consoleLog("getShipments");
    const { containerId } = req.query;
    consoleLog("containerId:", containerId);
    try{
        const result = await getContainerShipments(containerId);
        consoleLog("result:", result);
        if(!result.success){
            return res.status(400).json({success: false, message: result.error});
        }
        return res.status(200).json({success: true, results: result});
    }catch(error){
        console.error("Error:", error);
        return res.status(500).json({ success: false, message: 'Ocurrió un error al generar el reporte' });
    }
}

export async function endShipment(req, res) {
    consoleLog("endShipment", "", true);
    try{
        const { trackerId } = req.body;
        const authHeader = req.headers['authorization']; 
        if (authHeader) { 
            const token = authHeader.split(' ')[1]; // Assuming 'Bearer <token>' 
            const decodedToken = validateToken(token);
            if(decodedToken){
                let endDate = getCurrentTime();
                const result = await db_updateTracker(trackerId, endDate);
                consoleLog("result:", result);
                if(!result.success){
                    return res.status(400).json({success: false, message: result.error});
                }else{
                    return res.status(200).json({success: true, message: result.message});
                }
            }
        }
        return res.status(401).json({ success: false, message: 'No se proporcionó el token o no es válido' });
    }catch(error){
        console.error("Error:", error);
        return res.status(500).json({ success: false, message: 'Ocurrió un error al vincular' });

    }
    
}

function getCurrentTime(){
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