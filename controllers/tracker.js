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



async function queryEstafeta(trackingCode) {
    let serviceInfo = {};

    const url = `https://rastreositecorecms.azurewebsites.net/Tracking/searchByGet/?wayBillType=1&wayBill=${trackingCode}`;
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

            // console.log('Estatus del servicio:', content);
        
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
        
            response = data;
        } catch (error) {
            console.error('Ocurrió un error:', error);
        } finally {
            // Cerrar el navegador
            await browser.close();
        }
        return serviceInfo;
    })();
}

function processEstafetaResponse(dhlResponse, shipmentStatus){
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



async function queryFedEx(trackingCode) {
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
        serviceInfo = tableData;
        
        console.log(tableData);
        console.log('tableData',tableData.length);
        } catch (error) {
            console.error('Ocurrió un error:', error);
        } finally {
            // Cerrar el navegador
            await browser.close();
        }
        serviceInfo.forEach(row => {
            row.date = row.fecha ? convertToISO(row.fecha, row.hora || '12:00 AM') : null;
        });
        console.log('serviceInfo', serviceInfo);
        return serviceInfo;
    })();
    
}

function processFedExResponse(dhlResponse, shipmentStatus){
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

function convertToISO(fecha, hora) {
    if(!fecha || !hora) {
        return '';
    }
    // Mapeo de nombres de días a números de mes y día
    const meses = {
        '1': '01', '2': '02', '3': '03', '4': '04', '5': '05', '6': '06', '7': '07',
        '8': '08', '9': '09', '10': '10', '11': '11', '12': '12'
    };
    
    // Extraer el mes, día y año de la fecha
    const [, datePart] = fecha.split(', ');
    const [mes, dia, año] = datePart.split('/');
    const formattedDate = `20${año}-${meses[mes]}-${dia.padStart(2, '0')}`;
    
    // Convertir la hora al formato 24 horas
    const [time, period] = hora.split(' ');
    let [horas, minutos] = time.split(':');
    horas = parseInt(horas, 10);
    if (period === 'PM' && horas !== 12) {
        horas += 12;
    } else if (period === 'AM' && horas === 12) {
        horas = 0;
    }
    
    // Formatear la hora correctamente
    const formattedTime = `${horas.toString().padStart(2, '0')}:${minutos.padStart(2, '0')}:00`;
    
    return `${formattedDate}T${formattedTime}`;
}