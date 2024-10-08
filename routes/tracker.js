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
      // Serializar a cadena JSON (esto convierte el objeto en una cadena JSON)
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

export default router;