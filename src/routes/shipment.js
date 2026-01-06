import express from 'express';
import { dhlTracking, obtenerEmpresasPaqueteria, registrarNuevoEnvio, obtenerEnviosContenedor, 
    obtenerEnvioMasReciente, estafetaTracking, fedExTracking, processShipment, processShipmentManual,
    getCellTowerLocation } from '#controllers/shipment.js';

import { db_bulkLocationInsert } from '#src/services/shipment.js';

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

// POST /api/shipments/:shipmentID/coordinates
router.post("/:shipmentID/locations/bulk", async (req, res) => {
    const { shipmentID } = req.params;
    const { locations } = req.body;
    // console.log("Received locations for bulk insert:", locations);
    console.log("Shipment ID:", typeof shipmentID);

    const shipmentIDNum = Number(shipmentID);

    // return res.status(200).json({ success: true, message: 'Bulk insert endpoint is under construction.' });
    let response;
    try {
        response = await db_bulkLocationInsert(shipmentIDNum, locations);
        if(response.success) {
            console.log(`Bulk insert successful for shipmentID: ${shipmentID}, inserted ${locations.length} locations.`);
            return res.status(200).json(response);
        }
        
        return res.status(400).json({ error: 'Bulk insert failed', details: response });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});


export default router;