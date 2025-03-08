import puppeteer from 'puppeteer';
import { consultaEmpresasPaqueteria, registerNewShipment, getContainerShipments, getCurrentContainerShipment, updateShipment } from "./modules/database.mjs";
import { translateStatus, translateStatusCode, convertToISO, createStatusCodeFromDescription, convertToISOFromDDMMYYYY, extractDetailsFromEstafeta,
    getMostRecentEntry, isEmptyObj, generarCoordenadasCiudadMexico, getOldestEntry
} from "./modules/utils.mjs";

/*
const trackingCode = 2989923510; DHL
const trackingCode = 1466833546; DHL
1087250391 Estafeta
Número de guía: 6055903016701706196130 Código de rastreo: 1087250391 Estafeta
Número de guía: 905871797990E70R008TGF Código de rastreo: 3151344340 Estafeta
FedEx: 778600719309
*/

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
    console.log("req.query:", req.query);
    const { userID } = req.query;
    console.log("containerID:", containerID);
    const result = await getContainerShipments(containerID);
    if(!result.success){
        return res.status(400).json({success: false, message: result.error});
    }else{
        return res.status(200).json({success: true, message: result.results});
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

export async function processTracker(trackerData) {
    try {
        // Obtener información envío actual del rastreador provista por la paquetería
        const dbResult = await getCurrentShipment(trackerData.id);
        if(dbResult.success){
            //Envio en curso
            if(!dbResult.result.delivery_date){
                let statusInfo = {};
                switch(dbResult.result.shipment_data.company){
                    case "DHL":
                        statusInfo = await DHL(dbResult.result.shipment_data.tracking_number, dbResult.result.shipment_data.service_id);
                        break;

                    case "Estafeta":
                        statusInfo = await Estafeta(dbResult.result.shipment_data.tracking_number);
                        break;

                    case "FedEx":
                        statusInfo = await FedEx(dbResult.result.shipment_data.tracking_number);
                        break;
                }

                const dbResponse = await updateShipment(dbResult.result.id, trackerData, statusInfo);
                console.log(dbResponse);
                if(!dbResponse.success){
                    return {success: false, message: "Error al guardar coordenadas"};
                }else{
                    return {success: true, message: "Coordenadas guardadas correctamente"};
                }
            }
        }
    } catch (error) {
        return {success: false, message: "Error al guardar coordenadas"};
    }

}

export async function processShipment(req, res) {
    try {
        console.log("req.body:", req.body);
        let trackerData = req.body.trackerData; 
        // Obtener información envío actual del rastreador provista por la paquetería
        const dbResult = await getCurrentShipment(trackerData.id);
        if(dbResult.success){
            //Envio en curso
            if(!dbResult.result.delivery_date){
            // if(dbResult.result.delivery_date){
                let statusInfo = {};
                switch(dbResult.result.shipment_data.company){
                    case "DHL":
                        console.log('DHL');
                        statusInfo = await DHL(dbResult.result);
                        break;

                    case "Estafeta":
                        console.log('Estafeta');
                        statusInfo = await Estafeta(dbResult.result);
                        break;

                    case "FedEx":
                        console.log('FedEx');
                        statusInfo = await FedEx(dbResult.result);
                        break;
                }
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

// --------------------------------------

async function getCurrentShipment(trackerID) {
    return await getCurrentContainerShipment(trackerID);
}

async function DHL(dbResult) {
    console.log('dbResult',dbResult);
    const trackingCode = dbResult.shipment_data.tracking_number;
    const service = dbResult.shipment_data.service_id;
    let response = await queryDHL(trackingCode, service);
    console.log('response',response);
    return processDHLResponse(response, dbResult.shipment_status);
}

async function Estafeta(dbResult) {
    const trackingCode = dbResult.shipment_data.tracking_number;
    let response = await queryEstafeta(trackingCode);
    return processEstafetaFedexResponse(response, dbResult.shipment_status);
}

async function FedEx(dbResult) {
    const trackingCode = dbResult.shipment_data.tracking_number;
    let response = await queryFedEx(trackingCode);
    return processEstafetaFedexResponse(response, dbResult.shipment_status);
}

// ---------------------- DHL ----------------------

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
            description: `${translateStatus(dhlResponse.shipments[0].status.statusCode)} | ${dhlResponse.shipments[0].status.description}`,
            location: dhlResponse.shipments[0].status.location.address.addressLocality 
        };
        return lastStatus
    } 
    console.log('Estatus ya existe en la DB');
    return {};
}

// ---------------------- Estafeta y FedEx ----------------------

async function queryEstafeta(trackingCode) {
    let serviceInfo = [];
    let shipmentStatus = "";
    const url = `https://rastreositecorecms.azurewebsites.net/Tracking/searchByGet/?wayBillType=1&wayBill=${trackingCode}`;

    // Iniciar el navegador
    const browser = await puppeteer.launch({ headless: false }); // Cambia a true para ejecutar en modo sin cabeza
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

function processEstafetaFedexResponse(response, shipmentStatus){
    console.log('processEstafetaFedexResponse');
    console.log('EstafetaFedexResponse',response);
    console.log('shipmentStatus',shipmentStatus);
    const latestStatus = getMostRecentEntry(response);
    console.log('latestStatus',latestStatus);
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
        return lastStatus
    } 
    console.log('Estatus ya existe en la DB');
    return {};
}

async function queryFedEx(trackingCode) {
    let serviceInfo = [];
    const url = `https://www.fedex.com/fedextrack/?trknbr=${trackingCode}&trkqual=2460569000~${trackingCode}~FX`;
    console.log('url', url);

    // Iniciar el navegador
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--disable-infobars',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled'
        ]
    });
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

        console.log('serviceInfo', serviceInfo);
    } catch (error) {
        console.error('Ocurrió un error:', error);
    } finally {
        // Cerrar el navegador
        await browser.close();
    }

    return serviceInfo;
}



export async function dhlTracking(req, res) {
    const myHeaders = new Headers();
    myHeaders.append("DHL-API-Key", process.env.DHL_API_KEY);
    let serviceInfo = {};
    // console.log(process.env.DHL_API_KEY);
    
    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };
    const trackingCode = 2989923510;
    // const trackingCode = 1466833546;
    //1087250391 Estafeta
    //Número de guía: 905871797990E70R008TGF Código de rastreo: 3151344340 Estafeta
    //FedEx: 778600719309
    const service = "express";
    const language = "es";
    const limit = 2;
    console.log(`service: ${service}, language: ${language}, limit: ${limit}`);
    try{
        let response = await fetch(`https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingCode}&service=${service}&language=${language}&limit=${limit}`, requestOptions);
        let data = await response.text();
        serviceInfo = JSON.parse(data);
    }
    catch(error){
        console.error('error', error);
    }

    console.log('serviceInfo',serviceInfo);
    return res.status(200).json({ message: "Shipment tracked successfully", result: serviceInfo });
}

export async function estafetaTracking(req, res){
    // let trackingCode = "905871797990E70R008TGF";
    let trackingCode = "6055903016701706196130";
    let shipmentStatus = "";
    const url = `https://rastreositecorecms.azurewebsites.net/Tracking/searchByGet/?wayBillType=1&wayBill=${trackingCode}`;
    console.log('url', url);

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
            // console.log('Página cargada:', page.url());
            // Esperar explícitamente un tiempo adicional para permitir la carga del contenido dinámico
            await new Promise(resolve => setTimeout(resolve, 6000)); // Esperar 6 segundos

            // Extraer el contenido de la etiqueta <b> dentro del div con clase "estatus"
            const content = await page.evaluate(() => {
                const element = document.querySelector('.estatus h5 b');
                return element ? element.innerText.trim() : 'No se encontró el contenido';
            });
            shipmentStatus = content;
            console.log('Estatus del servicio:', shipmentStatus);
        
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
        
            console.log(data);
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

export async function fedExTracking(req, res){
    let trackingCode = "778600719309";
    let serviceInfo = {};

    const url = `https://www.fedex.com/fedextrack/?trknbr=${trackingCode}&trkqual=2460569000~${trackingCode}~FX`;
    console.log('url', url);

    (async () => {
        /// Iniciar el navegador
        const browser = await puppeteer.launch({
            headless: false,
            args: [
                '--disable-infobars',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });
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
        let response;
        try {
            // Navegar a la URL
            await page.goto(url, { waitUntil: 'networkidle2' });
        
            // Confirmar que se ha cargado la página
            // console.log('Página cargada:', page.url());
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
        
        // console.log(tableData);
        // console.log('tableData',tableData.length);
        } catch (error) {
            console.error('Ocurrió un error:', error);
        } finally {
            // Cerrar el navegador
            await browser.close();
        }
        serviceInfo.forEach(row => {
            row.timestamp = row.date ? convertToISO(row.date, row.time || '12:00 AM') : null;
        });
        console.log('response', serviceInfo);

        return res.status(200).json({ message: "Shipment tracked successfully", result: serviceInfo, url: url });
    })();
}





// ------------------------- Puerbaasa -------------------------------------------------------------

export async function processShipmentManual(req, res) {
    try {
        console.log("---------------------processShipmentManual---------------------");
        let trackerData = req.body.trackerData;
        let shipmentData = req.body.shipmentData; 
        // Obtener información envío actual del rastreador provista por la paquetería
        const dbResult = await getCurrentShipment(trackerData.id);
        if(dbResult.success){
            //Envio en curso
            console.log('dbResult.result.delivery_date',dbResult.result.delivery_date);
            // if(!dbResult.result.delivery_date){
            if(!dbResult.result.delivery_date){
                let statusInfo = {};
                console.log('dbResult.result.shipment_data.company',dbResult.result.shipment_data.company);
                statusInfo = processResponse(shipmentData, dbResult.result.shipment_status);

                if(isEmptyObj(statusInfo)){
                    const a = generarCoordenadasCiudadMexico();
                    console.log('a',a);
                    statusInfo = { message: "No hay cambios en el estatus del envío" };
                    return res.status(200).json({success: true, db: dbResult.result, tracker: trackerData, status: statusInfo});
                }
                trackerData = generarCoordenadasCiudadMexico();
                console.log('trackerData',trackerData);
                const dbResponse = await updateShipment(dbResult.result.id, trackerData, statusInfo);
                console.log(dbResponse);
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
    console.log('latestStatus',latestStatus);
    console.log('shipmentStatus',shipmentStatus);
    //Verificar si el estatus ya existe en la DB
    const existe = shipmentStatus.some(item => item.timestamp === latestStatus.timestamp);
    // Si no existe, extraer información a guardar
    if(!existe){
        console.log('existen cambios');
        let lastStatus = { 
            timestamp: latestStatus.timestamp, 
            status_code: latestStatus.statusCode,
            description: `${translateStatus(latestStatus.statusCode)} | ${latestStatus.description}`,
            location: latestStatus.location
        };
        return lastStatus
    } 
    console.log('Estatus ya existe en la DB');
    return {};
}










