// src/routes/vehiculo.routes.js
import { Router } from 'express';
import vehiculoController from '../controllers/vehiculoController.js';
import { verifyToken } from '../middleware/authJwt.js';

const router = Router();

// Rutas de Vehiculo - Protegidas por JWT
router.get('/getVehiculos', verifyToken, vehiculoController.getAllVehiculos);
router.post('/registrarVehiculo', verifyToken, vehiculoController.createVehiculo);

// Ahora las operaciones GET, PUT, DELETE para un solo vehículo usan la placa
router.get('/:placa', verifyToken, vehiculoController.getVehiculoByPlaca);
router.put('/:placa', verifyToken, vehiculoController.updateVehiculoByPlaca);
router.delete('/:placa', verifyToken, vehiculoController.deleteVehiculoByPlaca);

export default router;