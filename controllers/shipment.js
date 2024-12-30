import { consultaEmpresasPaqueteria } from "./modules/database.mjs";

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