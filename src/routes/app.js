import express from 'express';
import { obtenerContenedoresUsuario, vincularRastreador, obtenerEnvioMasReciente, 
    obtenerInfo, startShipment, updateTracker, generateReport, generateCurrentReporteSeguimiento,
    generateReporteSeguimiento, getShipments, endShipment, changeTrackingCode
} from '#controllers/app.js';

import { queryShipmentTracking } from '#controllers/shipment.js';

const router = express.Router();
// ---------------- Endpoints info app ----------------
router.get('/get-info', obtenerInfo);
router.get('/get-user-tracker', obtenerContenedoresUsuario);
// ---------------- Endpoints rastreadores ----------------
router.post('/link-tracker', vincularRastreador);
router.patch('/update-tracker', updateTracker);
// ---------------- Endpoints reportes ----------------
router.get('/reports/generate-pdf', generateReport);
router.get('/reports/generate-current-reporte-seguimiento', generateCurrentReporteSeguimiento);
router.get('/reports/reporte-seguimiento', generateReporteSeguimiento);
// ---------------- Endpoints envíos ----------------
router.get('/shipments', getShipments);
router.get('/shipments/:id', obtenerEnvioMasReciente);
router.post('/start-shipment', startShipment);
router.patch('/shipments/end/:id', endShipment);
router.patch('/shipments/change-tracking-code/:id', changeTrackingCode);

router.post('/shipments/query-tracking', queryShipmentTracking);

export default router;