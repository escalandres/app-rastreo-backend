import express from 'express';
import { dhlTracking, obtenerEmpresasPaqueteria, registrarNuevoEnvio, obtenerEnviosContenedor, 
    obtenerEnvioMasReciente, estafetaTracking, fedExTracking, processShipment, processShipmentManual,
    getCellTowerLocation } from '#controllers/shipment.js';

const router = express.Router();

router.post('/register-shipment', registrarNuevoEnvio);
router.get('/container-shipments', obtenerEnviosContenedor);
router.get('/current-container-shipment', obtenerEnvioMasReciente);

router.post('/process-shipment', processShipment);
router.post('/open-cell-id', getCellTowerLocation);
router.post('/process-shipment-manual', processShipmentManual);
router.get('/dhl-tracking', dhlTracking);
router.get('/estafeta-tracking', estafetaTracking);
router.get('/fedex-tracking', fedExTracking);
router.get('/empresas-paqueteria', obtenerEmpresasPaqueteria);


export default router;