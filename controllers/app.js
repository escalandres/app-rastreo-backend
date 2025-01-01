import { consultaEmpresasPaqueteria, registerNewShipment, getContainerShipments, getCurrentContainerShipment, getUserContainers } from "./modules/database.mjs";

export async function dhlTracking(req, res) {
    const myHeaders = new Headers();
    myHeaders.append("DHL-API-Key", process.env.DHL_API_KEY);

    // console.log(process.env.DHL_API_KEY);
    
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
    console.log(`service: ${service}, language: ${language}, limit: ${limit}`);
    fetch(`https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingCode}&service=${service}&language=${language}&limit=${limit}`, requestOptions)
        .then((response) => response.text())
        .then((result) => console.log(result))
        .catch((error) => console.error(error));
    return res.status(200).json({ message: "Shipment tracked successfully" });
}

export async function obtenerEmpresasPaqueteria(req, res) {
    const empresas = await consultaEmpresasPaqueteria();
    return res.status(200).json(empresas);
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
    const authHeader = req.headers['authorization']; 
    if (authHeader) { 
        const token = authHeader.split(' ')[1]; // Assuming 'Bearer <token>' 
        const decodedToken = jwt.verify(token, process.env.key); 
        console.log("Decoded token:", decodedToken);
        const result = await getUserContainers(decodedToken.user.id);
        if(!result.success){
            return res.status(400).json({success: false, message: result.error});
        }else{
            return res.status(200).json({success: true, message: result.results});
        }
    } else { 
        res.status(401).json({ success: false, message: 'No se proporcionó el token o no es válido' });
    }
}

export async function obtenerEnviosContenedor(req, res) {
    console.log("req.query:", req.query);
    const { containerID } = req.query;
    console.log("containerID:", containerID);
    const result = await getContainerShipments(containerID);
    if(!result.success){
        return res.status(400).json({success: false, message: result.error});
    }else{
        return res.status(200).json({success: true, message: result.results});
    }
}

export async function obtenerEnvioMasReciente(req, res) {
    console.log("req.query:", req.query);
    const { containerID } = req.query;
    console.log("containerID:", containerID);
    const result = await getCurrentContainerShipment(containerID);
    if(!result.success){
        return res.status(400).json({success: false, message: result.error});
    }else{
        return res.status(200).json({success: true, message: result.results});
    }
}

export async function vincularRastreador(req, res) {
    const { trackerID } = req.body;
    const authHeader = req.headers['authorization']; 
    if (authHeader) { 
        const token = authHeader.split(' ')[1]; // Assuming 'Bearer <token>' 
        const decodedToken = jwt.verify(token, process.env.key); 
        console.log("Decoded token:", decodedToken);
        const tracker = {
            id: parseInt(trackerID),
            user_id: decodedToken.user.id,
            nickname: `Rastreador ${id}`,
            linking_date: new Date(),
            shipments: []
        }
        const result = await linkTracker(tracker);
        if(!result.success){
            return res.status(400).json({success: false, message: result.error});
        }else{
            return res.status(200).json({success: true, message: result.message});
        }
    } else { 
        res.status(401).json({ success: false, message: 'No se proporcionó el token o no es válido' });
    }
}