import express from 'express';
import { dhlTracking, obtenerEmpresasPaqueteria, registrarNuevoEnvio, obtenerEnviosContenedor, obtenerEnvioMasReciente } from '../controllers/shipment.js';

const router = express.Router();

router.get('/dhl-tracking', dhlTracking);
router.get('/empresas-paqueteria', obtenerEmpresasPaqueteria);
router.post('/register-shipment', registrarNuevoEnvio);
router.get('/container-shipments', obtenerEnviosContenedor);
router.get('/current-container-shipment', obtenerEnvioMasReciente);

export default router;