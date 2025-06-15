// src/routes/obligacionesL.routes.js
import { Router } from 'express';
import obligacionesLController from '../controllers/obligacionesLController.js';
import { verifyToken } from '../middleware/authJwt.js';

const router = Router();

// Rutas de Obligaciones Legales - Protegidas por JWT
router.get('/vehiculo/:vehiculoId', verifyToken, obligacionesLController.getAllObligacionesL);
router.get('/:id', verifyToken, obligacionesLController.getObligacionesLById);
router.post('/', verifyToken, obligacionesLController.createObligacionesL);
router.put('/:id', verifyToken, obligacionesLController.updateObligacionesL);
router.delete('/:id', verifyToken, obligacionesLController.deleteObligacionesL);

export default router;