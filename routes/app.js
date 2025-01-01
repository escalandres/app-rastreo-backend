import express from 'express';
import { obtenerContenedoresUsuario, vincularRastreador } from '../controllers/app.js';

const router = express.Router();

router.get('/get-user-containers', obtenerContenedoresUsuario);
router.post('/link-tracker', vincularRastreador);
// router.get('/empresas-paqueteria', obtenerEmpresasPaqueteria);

export default router;