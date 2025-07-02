import { Router } from 'express';
import { generateMaintenanceQr } from '../controllers/qrController.js';
import { verifyToken } from '../middleware/authJwt.js';

const router = Router();

// Ruta para que un propietario genere un QR para un vehículo específico
// Protegida por verifyToken
router.get('/mantenimiento/:vehiculoId', verifyToken, generateMaintenanceQr);

export default router;