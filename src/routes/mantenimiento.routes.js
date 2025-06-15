// src/routes/mantenimiento.routes.js
import { Router } from 'express';
import mantenimientoController from '../controllers/mantenimientoController.js';
import { verifyToken } from '../middleware/authJwt.js';

const router = Router();

// Rutas de Mantenimiento - Protegidas por JWT
router.get('/vehiculo/:vehiculoId', verifyToken, mantenimientoController.getAllMantenimientos);
router.get('/:id', verifyToken, mantenimientoController.getMantenimientoById);
router.post('/', verifyToken, mantenimientoController.createMantenimiento);
router.put('/:id', verifyToken, mantenimientoController.updateMantenimiento);
router.delete('/:id', verifyToken, mantenimientoController.deleteMantenimiento);

export default router;