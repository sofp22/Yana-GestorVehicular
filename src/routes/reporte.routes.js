import { Router } from 'express';
import { generarReporteManual, getReporteAutomatico } from '../controllers/reporteController.js';
import { verifyToken } from '../middleware/authJwt.js'; // Importa el middleware de autenticación

const router = Router();

// Ruta para generar reportes automáticos (puede ser accedida por GET para probar,
// pero su función principal es ser activada por el cron job)
router.get('/automaticos', getReporteAutomatico);

// Ruta para generar reportes manuales (PROTEGIDA - requiere que el propietario esté logueado)
router.get('/manuales', verifyToken, generarReporteManual);

export default router;