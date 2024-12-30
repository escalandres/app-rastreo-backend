import express from 'express';
import { dhlTracking, obtenerEmpresasPaqueteria } from '../controllers/shipment.js';

const router = express.Router();

router.get('/dhl-tracking', dhlTracking);
router.get('/empresas-paqueteria', obtenerEmpresasPaqueteria);

export default router;