import express from 'express';

import { subirDatos } from '../controllers/tracker.js';

const router = express.Router();

router.post('/post', subirDatos);

router.get('/test', (req, res) => {
    let json = {
        "fecha_hora_utc": "2024-10-08T01:04:00Z",
        "id": "12345678",
        "coordenadas": {
            "latitud": 40.7128,
            "longitud": -74.0060
        }
    };
    console.log(json);
    let js = JSON.stringify(json);
    console.log(js);
    res.send('Hay conexion con el servidor');
});

router.post('/test-json', (req, res) => {
    console.log(req.body.datos);
    console.log(JSON.stringify(req.body.datos));
    console.log(typeof(JSON.stringify(req.body.datos)));
    console.log(JSON.stringify(req.body.datos).toString());
    res.send({success: true});
});

router.post('/post-test', (req, res) => {
    console.log("----------------");
    if(req.body.datos !== "AT+CMGR=0ERROR" && req.body.datos !== "Enviando informacion de los rastreadores al servidor"){
        const mensaje = req.body.datos;
        console.log("req.body.datos", mensaje);
        // const regex = /\+(CMT|CMGR):\s'REC UNREAD','(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);/;

        // const resultado = regex.exec(mensaje);
        // console.log("resultado", resultado);

        // subirDatos(req,res);
    }else{
        console.log("Formato de mensaje no válido");
        console.log("-------req.body.datos", req.body.datos);
        res.status(400).send({success: false});
    }
});
router.post('/upload-data', (req, res) => {
    console.log("----------------");
    if(req.body.datos !== "AT+CMGR=0ERROR" && req.body.datos !== "Enviando informacion de los rastreadores al servidor"){
        console.log("req.body.datos", req.body.datos);
        subirDatos(req,res);
    }else{
        console.log("Formato de mensaje no válido");
        console.log("-------req.body.datos", req.body.datos);
        res.status(400).send({success: false});
    }
});



export default router;