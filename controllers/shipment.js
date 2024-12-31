import { consultaEmpresasPaqueteria, registerNewShipment, getContainerShipments, getCurrentContainerShipment } from "./modules/database.mjs";

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
    // const { id } = req.params;
    const { containerID, startDate, deliveryDate, shipmentData, locations, shipmentStatus } = req.body;

    // console.log(`containerID: ${containerID}, startDate: ${startDate}, deliveryDate: ${deliveryDate}, shipmentData: ${shipmentData}, locations: ${locations}, shipmentStatus: ${shipmentStatus}`);
    // console.log("locations", locations);
    // console.log("shipmentStatus:",shipmentStatus);

    const shipment = {
        "container_id": containerID,
        "start_date": startDate,
        "delivery_date": deliveryDate,
        "shipment_data": shipmentData,
        "locations": locations,
        "shipment_status": shipmentStatus
    };

    console.log("shipment:", shipment);
    const result = await registerNewShipment(shipment);
    console.log("result:", result);
    if(!result.success){
        return res.status(400).json({success: false, message: result.error});
    }else{
        return res.status(200).json({success: true, message: result.result});
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
