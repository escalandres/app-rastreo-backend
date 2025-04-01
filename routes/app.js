import express from 'express';
import { obtenerContenedoresUsuario, vincularRastreador, obtenerEnvioMasReciente, 
    obtenerInfo, startShipment, updateTracker, generateReport } from '../controllers/app.js';

const router = express.Router();

router.get('/get-info', obtenerInfo);
router.get('/get-user-tracker', obtenerContenedoresUsuario);
router.get('/get-shipment-data', obtenerEnvioMasReciente);
router.post('/link-tracker', vincularRastreador);
router.post('/update-tracker', updateTracker);
router.post('/start-shipment', startShipment);
router.get('/generate-pdf', generateReport);

export default router;