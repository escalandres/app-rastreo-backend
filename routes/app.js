import express from 'express';
import { obtenerContenedoresUsuario, vincularRastreador, obtenerEnvioMasReciente, 
    obtenerInfo, startShipment, updateTracker, generateReport, generateCurrentReporteSeguimiento,
    generateReporteSeguimiento, getShipments, endShipment, changeTrackingCode
} from '../controllers/app.js';

const router = express.Router();

router.get('/get-info', obtenerInfo);
router.get('/get-user-tracker', obtenerContenedoresUsuario);
router.get('/get-shipment-data', obtenerEnvioMasReciente);
router.post('/link-tracker', vincularRastreador);
router.patch('/update-tracker', updateTracker);
router.post('/start-shipment', startShipment);
router.get('/generate-pdf', generateReport);
router.get('/generate-current-reporte-seguimiento', generateCurrentReporteSeguimiento);
router.get('/generate-reporte-seguimiento', generateReporteSeguimiento);
router.get('/shipments', getShipments);
router.patch('/end-shipment', endShipment);
router.patch('/update-shipment', changeTrackingCode);

export default router;