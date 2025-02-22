import { json } from "express";
import { load } from 'cheerio';
import puppeteer from 'puppeteer';
import { consultaEmpresasPaqueteria, registerNewShipment, getContainerShipments, getCurrentContainerShipment } from "./modules/database.mjs";

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

export async function queryDHL(trackingCode, service) {
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

// export async function FedExTracking(req, res){


//     let trackingCode = "778600719309";


//     const url = `https://www.fedex.com/fedextrack/?trknbr=${trackingCode}&trkqual=2460569000~${trackingCode}~FX`;
//     console.log('url', url);
//     try{
//         let response = await fetch(url);
//         let body = await response.text();
//         console.log('body', body);
//         // Cargar el HTML con cheerio
//         const $ = load(body);

//         // Seleccionar la tabla con el id "tableCoverage"
//         // const rows = $('#tableCoverage tbody tr');
//         // console.log('rows', rows.length);
//         // // Crear un array para almacenar los datos extraídos
//         // const data = [];

//         // // Iterar sobre cada fila y extraer los datos de los elementos <td>
//         // rows.each((index, element) => {
//         // const cells = $(element).find('td');
//         // const rowData = {
//         //     fechaHora: $(cells[0]).text().trim(),
//         //     lugarMovimiento: $(cells[1]).text().trim(),
//         //     comentarios: $(cells[2]).text().trim()
//         // };
//         // data.push(rowData);
//         // });

//         console.log(data);
//         return res.status(200).json({ message: "Shipment tracked successfully", result: data, url: url });
//     }
//     catch(error){
//         console.error('error', error);
//         return res.status(400).json({ message: "Error", result: error });
//     }

// }

export async function estafetaTracking(req, res){
    // let trackingCode = "905871797990E70R008TGF";
    let trackingCode = "6055903016701706196130";


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
            console.log('Página cargada:', page.url());
         // Esperar explícitamente un tiempo adicional para permitir la carga del contenido dinámico
    await new Promise(resolve => setTimeout(resolve, 6000)); // Esperar 6 segundos

            // Extraer el contenido de la etiqueta <b> dentro del div con clase "estatus"
    const content = await page.evaluate(() => {
        const element = document.querySelector('.estatus h5 b');
        return element ? element.innerText.trim() : 'No se encontró el contenido';
    });

    console.log('Estatus del servicio:', content);
        
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

        return res.status(200).json({ message: "Shipment tracked successfully", result: response, url: url });
      })();


}


export async function fedExTracking(req, res){
    let trackingCode = "778600719309";
    let response;

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
            console.log('Página cargada:', page.url());
         // Esperar explícitamente un tiempo adicional para permitir la carga del contenido dinámico
        await new Promise(resolve => setTimeout(resolve, 6000)); // Esperar 6 segundos
            
                // Extraer el contenido de la tabla con los registros por día
        const tableData = await page.evaluate(() => {
            const rows = document.querySelectorAll('#detail-view-sections-desktop .fdx-c-table__tbody__tr.travel-history-table__row');
            console.log('rows', rows.length);
            console.log('rows', rows);
            const extractedData = [];
            rows.forEach(row => {
                const dateElement = row.querySelector('.travel-history-table__scan-event-date span');

                const _rows = row.querySelectorAll('.fdx-o-grid__row.fdx-u-mb--3.fdx-u-fontsize--extra-small.travel-history__scan-event');
                _rows.forEach(_row => {
                    const timeElement = _row.querySelector('.travel-history__scan-event span');
                    const statusElement = _row.querySelector('#status');
                    const locationElement = _row.querySelector('.fdx-o-grid__item--4.fdx-u-fontweight--regular');
            
                    const rowData = {
                        fecha: dateElement ? dateElement.innerText.trim() : 'N/A',
                        hora: timeElement ? timeElement.innerText.trim() : 'N/A',
                        estado: statusElement ? statusElement.innerText.trim() : 'N/A',
                        ubicacion: locationElement ? locationElement.innerText.trim() : 'N/A'
                    };
                    extractedData.push(rowData);
                });
            });
            return extractedData;
        });
        response = tableData;
        
        console.log(tableData);
        console.log('tableData',tableData.length);
    } catch (error) {
        console.error('Ocurrió un error:', error);
    } finally {
        // Cerrar el navegador
        await browser.close();
    }

        return res.status(200).json({ message: "Shipment tracked successfully", result: response, url: url });
    })();


}