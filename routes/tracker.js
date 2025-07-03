import express from 'express';

import { subirDatos, subirDatos1 } from '../controllers/tracker.js';
import { db_updateBatteryPercentage } from '../controllers/modules/database.mjs';
import { consoleLog } from '../controllers/modules/utils.mjs';
const router = express.Router();

router.post('/post', subirDatos);

router.get('/test', (req, res) => {
    consoleLog("Hay conexion con el servidor");
    res.send('Hay conexion con el servidor');
});

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
        // const regex = /\+(CMT|CMGR):\s'REC UNREAD','(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);/;

        // const resultado = regex.exec(mensaje);
        // consoleLog("resultado", resultado);

        // subirDatos(req,res);
        subirDatos1(req,res);
    }else{
        consoleLog("Formato de mensaje no válido");
        consoleLog("-------req.body.datos", req.body.datos);
        res.status(400).send({success: false});
    }
});
router.post('/upload-data', (req, res) => {
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

router.post('/update-battery', async (req, res) => {
    consoleLog("update-battery");
    const { trackerId, batteryPercentage } = req.body;
    consoleLog("trackerId:", trackerId, "batteryPercentage:", batteryPercentage);
    await db_updateBatteryPercentage(trackerId, batteryPercentage)
    return res.status(200).json({ success: true, message: "Batería actualizada correctamente." });
});


export default router;