import express from 'express';
import { obtenerContenedoresUsuario, vincularRastreador, obtenerEnvioMasReciente, obtenerInfo, startShipment } from '../controllers/app.js';

const router = express.Router();

router.get('/get-info', obtenerInfo);
router.get('/get-user-tracker', obtenerContenedoresUsuario);
router.get('/get-shipment-data', obtenerEnvioMasReciente);
router.post('/link-tracker', vincularRastreador);
router.post('/start-shipment', startShipment);

export default router;