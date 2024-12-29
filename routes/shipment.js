import express from 'express';
import { dhlTracking } from '../controllers/shipment.js';

const router = express.Router();

router.get('/dhl-tracking', dhlTracking);

export default router;