import express from 'express';

import { subirDatos, subirDatos1, notificarEncendido, notificarRastreoActivo } from '../controllers/tracker.js';
import { db_updateBatteryPercentage } from '../services/shipment.js';
import { consoleLog } from '../controllers/modules/utils.mjs';

const router = express.Router();

router.post('/', (req, res) => {
    consoleLog("----------------");
    if(req.body.datos !== "AT+CMGR=0ERROR" && req.body.datos !== "Enviando informacion de los rastreadores al servidor"){
        consoleLog("req.body.datos", req.body.datos);
        subirDatos(req,res);
    }else{
        consoleLog("Formato de mensaje no válido");
        consoleLog("-------req.body.datos", req.body.datos);
        res.status(400).send({success: false});
    }
});

router.post('/tracker-on', (req, res) => {
    consoleLog("Rastreador encendido");
    if(req.body.datos !== "AT+CMGR=0ERROR" && req.body.datos !== "Enviando informacion de los rastreadores al servidor"){
        consoleLog("req.body.datos", req.body.datos);
        notificarEncendido(req,res);
    }else{
        consoleLog("Formato de mensaje no válido");
        consoleLog("-------req.body.datos", req.body.datos);
        res.status(400).send({success: false});
    }
});

router.post('/rastreo-on', (req, res) => {
    consoleLog("Rastreador activado");
    if(req.body.datos !== "AT+CMGR=0ERROR" && req.body.datos !== "Enviando informacion de los rastreadores al servidor"){
        consoleLog("req.body.datos", req.body.datos);
        notificarRastreoActivo(req,res);
    }else{
        consoleLog("Formato de mensaje no válido");
        consoleLog("-------req.body.datos", req.body.datos);
        res.status(400).send({success: false});
    }
});

router.get('/despertar-servidor', (req, res) => {
    consoleLog("Hay conexion con el servidor");
    res.send('Hay conexion con el servidor');
});

// ---------------- Endpoints para pruebas ----------------

router.post('/post', subirDatos);

router.post('/test-json', (req, res) => {
    consoleLog(req.body.datos);
    consoleLog(JSON.stringify(req.body.datos));
    consoleLog(typeof(JSON.stringify(req.body.datos)));
    consoleLog(JSON.stringify(req.body.datos).toString());
    res.send({success: true});
});

router.post('/post-test', (req, res) => {
    consoleLog("----------------");
    consoleLog("auth", req.headers.authorization);
    consoleLog("Datlos del receptor", req.body.datos);
    if(req.body.datos !== "AT+CMGR=0ERROR" && req.body.datos !== "Enviando informacion de los rastreadores al servidor"){
        const mensaje = req.body.datos;
        consoleLog("req.body.datos", mensaje);
        subirDatos1(req,res);
    }else{
        consoleLog("Formato de mensaje no válido");
        consoleLog("-------req.body.datos", req.body.datos);
        res.status(400).send({success: false});
    }
});

router.post('/update-battery', async (req, res) => {
    consoleLog("update-battery");
    const { trackerId, batteryPercentage } = req.body;
    consoleLog("trackerId:", trackerId, "batteryPercentage:", batteryPercentage);
    await db_updateBatteryPercentage(trackerId, batteryPercentage)
    return res.status(200).json({ success: true, message: "Batería actualizada correctamente." });
});


export default router;