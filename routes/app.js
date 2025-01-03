import express from 'express';
import { obtenerContenedoresUsuario, vincularRastreador, obtenerEnvioMasReciente } from '../controllers/app.js';

const router = express.Router();

router.get('/get-user-tracker', obtenerContenedoresUsuario);
router.get('/get-shipment-data', obtenerEnvioMasReciente);
router.post('/link-tracker', vincularRastreador);
// router.get('/empresas-paqueteria', obtenerEmpresasPaqueteria);

export default router;