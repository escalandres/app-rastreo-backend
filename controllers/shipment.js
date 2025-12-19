import puppeteer, { executablePath } from 'puppeteer';
import { consultaEmpresasPaqueteria, registerNewShipment, getContainerShipments, getCurrentContainerShipment, updateShipment, db_updateBatteryPercentage } from "../services/shipment.js";
import { translateStatus, translateStatusCode, convertToISO, createStatusCodeFromDescription, convertToISOFromDDMMYYYY, extractDetailsFromEstafeta,
    getMostRecentEntry, isEmptyObj, generarCoordenadasCiudadMexico, getOldestEntry, processLocation
} from "./modules/utils.mjs";
import { sendNotifyEmail } from "./modules/email.mjs";
import { consoleLog } from './modules/utils.mjs';

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
    consoleLog("req.query:", req.query);
    const { containerID } = req.query;
    consoleLog("containerID:", containerID);
    const result = await getCurrentContainerShipment(containerID);
    if(!result.success){
        return res.status(400).json({success: false, message: result.error});
    }else{
        return res.status(200).json({success: true, message: result.results});
    }
}

export async function processTracker(trackerData) {
    try {
        consoleLog.log("processTracker");
        // Obtener numero de rastreo del envío actual del rastreador provista por la paquetería
        const dbResult = await getCurrentShipment(trackerData.id);
        consoleLog('dbResult', dbResult);
        if(dbResult.success){
            //Envio en curso
            // Obtener información envío actual del rastreador provista por la paquetería
            consoleLog('dbResult.result.delivery_date', dbResult.result.delivery_date);
            //if(!dbResult.result.delivery_date){
                let statusInfo = {};
                if(dbResult.result.shipment_data.company !== ''){
                    consoleLog('Company', dbResult.result.shipment_data.company, true);
                    switch(dbResult.result.shipment_data.company){
                        case "DHL":
                            consoleLog('DHL');
                            statusInfo = await DHL(dbResult.result);
                            break;

                        case "Estafeta":
                            statusInfo = await Estafeta(dbResult.result);
                            break;

                        case "FedEx":
                            statusInfo = await FedEx(dbResult.result);
                            break;
                    }
                }
                consoleLog('statusInfo', statusInfo, true);
                let locationData = {};

                //Verificar si hay datos del GPS del rastreador
                if(trackerData.lat != 0  || trackerData.lng != 0){
                    locationData = {
                        date: trackerData.time,
                        lat: trackerData.lat,
                        lng: trackerData.lng,
                        isCellTower: false,
                        radius: 0,
                        batteryLevel: trackerData.batteryLevel
                    };
                }
                else{
                    let openCellIdData = await getCellTowerLocation(trackerData);
                    consoleLog('openCellIdData', openCellIdData);
                    if(openCellIdData.status === "error") return {success: false, message:  "Ocurrió un error al obtener la ubicación de la torre celular"}; 

                    locationData = {
                        date: trackerData.time,
                        lat: openCellIdData.lat,
                        lng: openCellIdData.lon,
                        isCellTower: true,
                        radius: openCellIdData.accuracy,
                        batteryLevel: trackerData.batteryLevel
                    };
                }
                const dbResponse = await updateShipment(dbResult.result.id, locationData, statusInfo);
                consoleLog(dbResponse);
                if(!dbResponse.success){
                    await db_updateBatteryPercentage(dbResult.result.container_id, trackerData.batteryLevel);
                    return {success: false, message: "Error al guardar coordenadas"};
                }else{
                    locationData.tracker = trackerData.id;
                    locationData.network = trackerData.network;
                    locationData.mcc = trackerData.mcc;
                    locationData.mnc = trackerData.mnc;
                    locationData.lac = trackerData.lac;
                    locationData.cid = trackerData.cid;
                    locationData.company = dbResult.result.shipment_data.company;
                    locationData.tracking_number = dbResult.result.shipment_data.tracking_number;
                    locationData.location = processLocation(locationData.isCellTower, locationData.radius)
                    await sendNotifyEmail(locationData,statusInfo);
                    await db_updateBatteryPercentage(dbResult.result.container_id, trackerData.batteryLevel);
                    return {success: true, message: "Coordenadas guardadas correctamente"};
                }
            // }
            // return {success: false, message: "El envío seleccionado ya terminó"};
        }
    } catch (error) {
        return {success: false, message: "Error al guardar coordenadas"};
    }

}

async function getCurrentShipment(trackerID) {
    return await getCurrentContainerShipment(trackerID);
}

// ----------------- Empresas Paqueteria -----------------

// ------ DHL --------

async function DHL(dbResult) {
    consoleLog('dbResult',dbResult);
    const trackingCode = dbResult.shipment_data.tracking_number;
    const service = dbResult.shipment_data.service_id;
    let response = await queryDHL(trackingCode, service);
    consoleLog('response',response);
    return processDHLResponse(response, dbResult.shipment_status);
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
    consoleLog(`service: ${service}, language: ${language}, limit: ${limit}`);
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
    if(dhlResponse.status === 404) return {};
    consoleLog('processDHLResponse');
    consoleLog('dhlResponse',dhlResponse);
    consoleLog('shipmentStatus',shipmentStatus);
    consoleLog('dhlResponse.shipments.status',dhlResponse.shipments[0].status);
    //Verificar si el estatus ya existe en la DB
    const existe = shipmentStatus.some(item => item.timestamp === dhlResponse.shipments[0].status.timestamp);
    // Si no existe, extraer información a guardar
    if(!existe){
        let lastStatus = { 
            timestamp: dhlResponse.shipments[0].status.timestamp, 
            status_code: dhlResponse.shipments[0].status.statusCode,
            description: `${translateStatus(dhlResponse.shipments[0].status.statusCode)} | ${dhlResponse.shipments[0].status.description}`,
            location: dhlResponse.shipments[0].status.location.address.addressLocality 
        };
        return lastStatus
    } 
    consoleLog('Estatus ya existe en la DB');
    return {};
}

// ------ Estafeta y FedEx ------

async function Estafeta(dbResult) {
    const trackingCode = dbResult.shipment_data.tracking_number;
    let response = await queryEstafeta(trackingCode);
    return processEstafetaFedexResponse(response, dbResult.shipment_status);
}

async function queryEstafeta(trackingCode) {
    consoleLog('queryEstafeta',"", true);
    let serviceInfo = [];
    let shipmentStatus = "";
    const url = `https://rastreositecorecms.azurewebsites.net/Tracking/searchByGet/?wayBillType=1&wayBill=${trackingCode}`;

    // Iniciar el navegador
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        headless: 'new',
        timeout: 60000,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-dev-tools',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    });
    const page = await browser.newPage();

    // Añadir una función para capturar errores de navegación
    page.on('error', error => {
        console.error('Error en la página:', error);
    });

    try {
        // Navegar a la URL
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Esperar explícitamente un tiempo adicional para permitir la carga del contenido dinámico
        await new Promise(resolve => setTimeout(resolve, 6000)); // Esperar 6 segundos

        // Extraer el contenido de la etiqueta <b> dentro del div con clase "estatus"
        const content = await page.evaluate(() => {
            const element = document.querySelector('.estatus h5 b');
            return element ? element.innerText.trim() : 'No se encontró el contenido';
        });
        shipmentStatus = content;

        // Extraer el contenido del div
        const data = await page.evaluate(() => {
            const rows = document.querySelectorAll('#tableCoverage tbody tr');
            const extractedData = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                const rowData = {
                    fechaHora: cells[0].innerText.trim(),
                    lugarMovimiento: cells[1].innerText.trim(),
                    comentarios: cells[2].innerText.trim()
                };
                extractedData.push(rowData);
            });
            return extractedData;
        });

        data.forEach(row => {
            let details = extractDetailsFromEstafeta(row.lugarMovimiento);
            row.location = `${details.place} (${details.code})`;
            row.description = details.movement;
            row.timestamp = row.fechaHora ? convertToISOFromDDMMYYYY(row.fechaHora) : null;
            row.statusCode = translateStatusCode(shipmentStatus);
        });

        serviceInfo = data;
    } catch (error) {
        console.error('Ocurrió un error:', error);
    } finally {
        // Cerrar el navegador
        await browser.close();
    }

    return serviceInfo;
}

async function FedEx(dbResult) {
    const trackingCode = dbResult.shipment_data.tracking_number;
    let response = await queryFedEx(trackingCode);
    return processEstafetaFedexResponse(response, dbResult.shipment_status);
}


async function queryFedEx(trackingCode) {
    let serviceInfo = [];
    const url = `https://www.fedex.com/fedextrack/?trknbr=${trackingCode}&~${trackingCode}~FX`;
    consoleLog('url', url);
    
    // Iniciar el navegador
    const launchOptions = {
        executablePath: puppeteer.executablePath(),
        headless: true,
        timeout: 60000,
        args: [
            '--disable-infobars',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
        ]
    };

    if (process.env.IS_DOCKER === 'true') {
        consoleLog('Running in Docker, setting executablePath for Chromium');
        launchOptions.executablePath = '/usr/bin/chromium';
    }

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Establecer un agente de usuario que imite un navegador real
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Habilitar la interceptación de solicitudes
    await page.setRequestInterception(true);

    // Desactivar la detección de automatización
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });

    // Interceptar las solicitudes de red
    page.on('request', (request) => {
        // Bloquear las solicitudes a logx.optimizely.com
        if (request.url().includes('logx.optimizely.com')) {
            request.abort();
        } else {
            request.continue();
        }
    });

    // Añadir una función para capturar errores de navegación
    page.on('error', error => {
        console.error('Error en la página:', error);
    });

    try {
        // Navegar a la URL
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Esperar explícitamente un tiempo adicional para permitir la carga del contenido dinámico
        await new Promise(resolve => setTimeout(resolve, 6000)); // Esperar 6 segundos

        // Extraer el contenido de la tabla con los registros por día
        const tableData = await page.evaluate(() => {
            const rows = document.querySelectorAll('#detail-view-sections-desktop .fdx-c-table__tbody__tr.travel-history-table__row');
            const extractedData = [];
            rows.forEach(row => {
                const dateElement = row.querySelector('.travel-history-table__scan-event-date span');

                const _rows = row.querySelectorAll('.fdx-o-grid__row.fdx-u-mb--3.fdx-u-fontsize--extra-small.travel-history__scan-event');
                _rows.forEach(_row => {
                    const timeElement = _row.querySelector('.travel-history__scan-event span');
                    const statusElement = _row.querySelector('#status');
                    const locationElement = _row.querySelector('.fdx-o-grid__item--4.fdx-u-fontweight--regular');

                    const rowData = {
                        date: dateElement ? dateElement.innerText.trim() : 'N/A',
                        time: timeElement ? timeElement.innerText.trim() : 'N/A',
                        status: statusElement ? statusElement.innerText.trim() : 'N/A',
                        location: locationElement ? locationElement.innerText.trim() : 'N/A'
                    };
                    extractedData.push(rowData);
                });
            });
            return extractedData;
        });

        serviceInfo = tableData;

        serviceInfo.forEach(row => {
            row.timestamp = row.date ? convertToISO(row.date, row.time || '12:00 AM') : null;
        });

        consoleLog('serviceInfo', serviceInfo);
    } catch (error) {
        console.error('Ocurrió un error:', error);
    } finally {
        // Cerrar el navegador
        await browser.close();
    }

    return serviceInfo;
}

function processEstafetaFedexResponse(response, shipmentStatus){
    consoleLog('processEstafetaFedexResponse');
    consoleLog('EstafetaFedexResponse',response);
    consoleLog('shipmentStatus',shipmentStatus);
    const latestStatus = getMostRecentEntry(response);
    consoleLog('latestStatus',latestStatus);
    //Verificar si el estatus ya existe en la DB
    const existe = shipmentStatus.some(item => item.timestamp === latestStatus.timestamp);
    // Si no existe, extraer información a guardar
    if(!existe){
        let lastStatus = { 
            timestamp: latestStatus.timestamp, 
            status_code: latestStatus.statusCode,
            description: `${translateStatus(latestStatus.statusCode)} | ${latestStatus.description}`,
            location: latestStatus.location
        };
        consoleLog('lastStatus', lastStatus, true);
        return lastStatus
    } 
    consoleLog('Estatus ya existe en la DB', "", true);
    return {};
}

// ---------------------- OpenCellId ----------------------
export async function getCellTowerLocation(params) {
    const { mcc, mnc, lac, cid, network } = params;
    consoleLog('url', params);
    consoleLog(`mcc: ${mcc}, mnc: ${mnc}, lac: ${lac}, cid: ${cid}, network: ${network}`);
    let location = {};
    try {
        const response = await fetch('https://us1.unwiredlabs.com/v2/process.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: process.env.OPENCELLID_API_KEY,
                radio: network,
                mcc: mcc,
                mnc: mnc,
                cells: [
                    {
                        lac: lac,
                        cid: cid
                    }
                ],
                address: 1
            })
        });
        
        let data = await response.json();
        consoleLog('data',data);
        location = data;
    } catch (error) {
        consoleLog('error', error);
    }
    return location;
}

// --------------------- Pruebas -------------------------------------------------------------

export async function processShipmentManual(req, res) {
    try {
        consoleLog("---------------------processShipmentManual---------------------");
        let trackerData = req.body.trackerData;
        let shipmentData = req.body.shipmentData; 
        // Obtener información envío actual del rastreador provista por la paquetería
        const dbResult = await getCurrentShipment(trackerData.id);
        if(dbResult.success){
            //Envio en curso
            consoleLog('dbResult.result.delivery_date',dbResult.result.delivery_date);
            // if(!dbResult.result.delivery_date){
            if(!dbResult.result.delivery_date){
                let statusInfo = {};
                consoleLog('dbResult.result.shipment_data.company',dbResult.result.shipment_data.company);
                statusInfo = processResponse(shipmentData, dbResult.result.shipment_status);

                if(isEmptyObj(statusInfo)){
                    const a = generarCoordenadasCiudadMexico();
                    consoleLog('a',a);
                    statusInfo = { message: "No hay cambios en el estatus del envío" };
                    return res.status(200).json({success: true, db: dbResult.result, tracker: trackerData, status: statusInfo});
                }
                trackerData = generarCoordenadasCiudadMexico();
                consoleLog('trackerData',trackerData);
                const dbResponse = await updateShipment(dbResult.result.id, trackerData, statusInfo);
                consoleLog(dbResponse);
                if(!dbResponse.success){
                    return res.status(200).json({success: false, message: "Error al actualizar el envío"});
                }else{
                    return res.status(200).json({success: true, message: "El envio se ha actualizado correctamente"});
                }
            }
            return res.status(200).json({success: true, message: "El envío seleccionado ya terminó"});
        }
        return res.status(400).json({success: false, message: dbResult.error});
    } catch (error) {
        return res.status(500).json({success: false, message: "Error al guardar coordenadas"});
    }

}

export async function processShipmentManual1(req, res) {
    try {
        consoleLog("---------------------processShipmentManual---------------------");
        let trackerData = req.body.trackerData;
        let shipmentData = req.body.shipmentData; 
        // Obtener información envío actual del rastreador provista por la paquetería
        const dbResult = await getCurrentShipment(trackerData.id);
        if(dbResult.success){
            //Envio en curso
            consoleLog('dbResult.result.delivery_date',dbResult.result.delivery_date);
            // if(!dbResult.result.delivery_date){
            if(!dbResult.result.delivery_date){
                let statusInfo = {};
                consoleLog('dbResult.result.shipment_data.company',dbResult.result.shipment_data.company);
                statusInfo = processResponse(shipmentData, dbResult.result.shipment_status);

                if(isEmptyObj(statusInfo)){
                    const a = generarCoordenadasCiudadMexico();
                    consoleLog('a',a);
                    statusInfo = { message: "No hay cambios en el estatus del envío" };
                    return res.status(200).json({success: true, db: dbResult.result, tracker: trackerData, status: statusInfo});
                }
                trackerData = generarCoordenadasCiudadMexico();
                consoleLog('trackerData',trackerData);
                const dbResponse = await updateShipment(dbResult.result.id, trackerData, statusInfo);
                consoleLog(dbResponse);
                if(!dbResponse.success){
                    return res.status(200).json({success: false, message: "Error al actualizar el envío"});
                }else{
                    return res.status(200).json({success: true, message: "El envio se ha actualizado correctamente"});
                }
            }
            return res.status(200).json({success: true, message: "El envío seleccionado ya terminó"});
        }
        return res.status(400).json({success: false, message: dbResult.error});
    } catch (error) {
        return res.status(500).json({success: false, message: "Error al guardar coordenadas"});
    }

}

function processResponse(response, shipmentStatus){
    const latestStatus = getOldestEntry(response);
    consoleLog('latestStatus',latestStatus);
    consoleLog('shipmentStatus',shipmentStatus);
    //Verificar si el estatus ya existe en la DB
    const existe = shipmentStatus.some(item => item.timestamp === latestStatus.timestamp);
    // Si no existe, extraer información a guardar
    if(!existe){
        consoleLog('existen cambios');
        let lastStatus = { 
            timestamp: latestStatus.timestamp, 
            status_code: latestStatus.statusCode,
            description: `${translateStatus(latestStatus.statusCode)} | ${latestStatus.description}`,
            location: latestStatus.location
        };
        return lastStatus
    } 
    consoleLog('Estatus ya existe en la DB');
    return {};
}

export async function processShipment(req, res) {
    try {
        consoleLog("req.body:", req.body);
        let trackerData = req.body.trackerData; 
        // Obtener información envío actual del rastreador provista por la paquetería
        const dbResult = await getCurrentShipment(trackerData.id);
        if(dbResult.success){
            //Envio en curso
            if(!dbResult.result.delivery_date){
            // if(dbResult.result.delivery_date){
                let statusInfo = {};
                // switch(dbResult.result.shipment_data.company){
                //     case "DHL":
                //         consoleLog('DHL');
                //         statusInfo = await DHL(dbResult.result);
                //         break;

                //     case "Estafeta":
                //         consoleLog('Estafeta');
                //         statusInfo = await Estafeta(dbResult.result);
                //         break;

                //     case "FedEx":
                //         consoleLog('FedEx');
                //         statusInfo = await FedEx(dbResult.result);
                //         break;
                // }
                if(isEmptyObj(statusInfo)){
                    statusInfo = { message: "No hay cambios en el estatus del envío" };
                }
                return res.status(200).json({success: true, db: dbResult.result, tracker: trackerData, status: statusInfo});
            }
            return res.status(200).json({success: true, message: "El envío seleccionado ya terminó"});
        }
        return res.status(400).json({success: false, message: dbResult.error});
    } catch (error) {
        return res.status(500).json({success: false, message: "Error al guardar coordenadas"});
    }

}

export async function obtenerContenedoresUsuario(req, res) {
    consoleLog("req.query:", req.query);
    const { userID } = req.query;
    consoleLog("containerID:", containerID);
    const result = await getContainerShipments(containerID);
    if(!result.success){
        return res.status(400).json({success: false, message: result.error});
    }else{
        return res.status(200).json({success: true, message: result.results});
    }
}

export async function dhlTracking(req, res) {
    const { trackingCode } = req.query;
    const myHeaders = new Headers();
    myHeaders.append("DHL-API-Key", process.env.DHL_API_KEY);
    let serviceInfo = {};
    
    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };
    
    const service = "express";
    const language = "es";
    const limit = 2;
    consoleLog(`service: ${service}, language: ${language}, limit: ${limit}`);
    try{
        let response = await fetch(`https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingCode}&service=${service}&language=${language}&limit=${limit}`, requestOptions);
        let data = await response.text();
        serviceInfo = JSON.parse(data);
    }
    catch(error){
        console.error('error', error);
    }

    consoleLog('serviceInfo',serviceInfo);
    return res.status(200).json({ message: "Shipment tracked successfully", result: serviceInfo });
}

export async function estafetaTracking(req, res){
    const { trackingCode } = req.query;
    let shipmentStatus = "";
    const url = `https://rastreositecorecms.azurewebsites.net/Tracking/searchByGet/?wayBillType=1&wayBill=${trackingCode}`;
    consoleLog('url', url);

    (async () => {
        /// Iniciar el navegador
        const browser = await puppeteer.launch({ headless: false }); // Cambia a true para ejecutar en modo sin cabeza
        const page = await browser.newPage();

        // Añadir una función para capturar errores de navegación
        page.on('error', error => {
            console.error('Error en la página:', error);
        });
        let response;
        try {
            // Navegar a la URL
            await page.goto(url, { waitUntil: 'networkidle2' });
        
            // Confirmar que se ha cargado la página
            // consoleLog('Página cargada:', page.url());
            // Esperar explícitamente un tiempo adicional para permitir la carga del contenido dinámico
            await new Promise(resolve => setTimeout(resolve, 6000)); // Esperar 6 segundos

            // Extraer el contenido de la etiqueta <b> dentro del div con clase "estatus"
            const content = await page.evaluate(() => {
                const element = document.querySelector('.estatus h5 b');
                return element ? element.innerText.trim() : 'No se encontró el contenido';
            });
            shipmentStatus = content;
            consoleLog('Estatus del servicio:', shipmentStatus);
        
            // Extraer el contenido del div
            const data = await page.evaluate(() => {
                const rows = document.querySelectorAll('#tableCoverage tbody tr');
                const extractedData = [];
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    const rowData = {
                        fechaHora: cells[0].innerText.trim(),
                        lugarMovimiento: cells[1].innerText.trim(),
                        comentarios: cells[2].innerText.trim()
                    };
                    extractedData.push(rowData);
                });
                return extractedData;
            });
        
            consoleLog(data);
            response = data;
        } catch (error) {
            console.error('Ocurrió un error:', error);
        } finally {
            // Cerrar el navegador
            await browser.close();
        }
        response.forEach(row => {
            let details = extractDetailsFromEstafeta(row.lugarMovimiento);
            row.location = `${details.place} (${details.code})`
            row.description = details.movement;
            row.timestamp = row.fechaHora ? convertToISOFromDDMMYYYY(row.fechaHora) : null;
            row.statusCode = translateStatusCode(shipmentStatus);
        });
        return res.status(200).json({ message: "Shipment tracked successfully", result: response, url: url });
    })();
}

export async function fedExTracking(req, res) {
    consoleLog('fedExTracking', "", true);
    const { trackingCode } = req.query;

    const url = `https://www.fedex.com/fedextrack/?trknbr=${trackingCode}&~${trackingCode}~FX`;
    consoleLog('url', url);

    let browser;
    let serviceInfo = [];

    try {
        console.log('executablePath:', puppeteer.executablePath());
        
        // Configuración del navegador
        const launchOptions = {
            executablePath: puppeteer.executablePath(),
            headless: true,
            timeout: 60000,
            args: [
                '--disable-infobars',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled'
            ]
        };

        if (process.env.IS_DOCKER === 'true') {
            consoleLog('Running in Docker, setting executablePath for Chromium');
            launchOptions.executablePath = '/usr/bin/chromium';
        }

        consoleLog('launchOptions', launchOptions);

        // Iniciar navegador
        browser = await puppeteer.launch(launchOptions);
       const page = await browser.newPage();

    // Establecer un agente de usuario que imite un navegador real
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Habilitar la interceptación de solicitudes
    await page.setRequestInterception(true);

    // Desactivar la detección de automatización
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });

    // Interceptar las solicitudes de red
    page.on('request', (request) => {
        // Bloquear las solicitudes a logx.optimizely.com
        if (request.url().includes('logx.optimizely.com')) {
            request.abort();
        } else {
            request.continue();
        }
    });

    // Añadir una función para capturar errores de navegación
    page.on('error', error => {
        console.error('Error en la página:', error);
    });

    try {
        // Navegar a la URL
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Esperar explícitamente un tiempo adicional para permitir la carga del contenido dinámico
        await new Promise(resolve => setTimeout(resolve, 6000)); // Esperar 6 segundos

        // Extraer el contenido de la tabla con los registros por día
        const tableData = await page.evaluate(() => {
            const rows = document.querySelectorAll('#detail-view-sections-desktop .fdx-c-table__tbody__tr.travel-history-table__row');
            const extractedData = [];
            rows.forEach(row => {
                const dateElement = row.querySelector('.travel-history-table__scan-event-date span');

                const _rows = row.querySelectorAll('.fdx-o-grid__row.fdx-u-mb--3.fdx-u-fontsize--extra-small.travel-history__scan-event');
                _rows.forEach(_row => {
                    const timeElement = _row.querySelector('.travel-history__scan-event span');
                    const statusElement = _row.querySelector('#status');
                    const locationElement = _row.querySelector('.fdx-o-grid__item--4.fdx-u-fontweight--regular');

                    const rowData = {
                        date: dateElement ? dateElement.innerText.trim() : 'N/A',
                        time: timeElement ? timeElement.innerText.trim() : 'N/A',
                        status: statusElement ? statusElement.innerText.trim() : 'N/A',
                        location: locationElement ? locationElement.innerText.trim() : 'N/A'
                    };
                    extractedData.push(rowData);
                });
            });
            return extractedData;
        });

        serviceInfo = tableData;

        serviceInfo.forEach(row => {
            row.timestamp = row.date ? convertToISO(row.date, row.time || '12:00 AM') : null;
        });

        consoleLog('serviceInfo', serviceInfo);
    } catch (error) {
        console.error('Ocurrió un error:', error);
    } finally {
        // Cerrar el navegador
        await browser.close();
    }

    return res.status(200).json({ message: "Shipment tracked successfully", result: serviceInfo, url: url });
} catch (error) {
    console.error('Ocurrió un error al iniciar el navegador o procesar la página:', error);
    if (browser) {
        await browser.close();
    }
    return res.status(500).json({ message: "Error al rastrear el envío", error: error.message });
}
}