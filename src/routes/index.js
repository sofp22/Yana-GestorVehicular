import { Router } from 'express';
import authRoutes from './auth.routes.js';
import propietarioRoutes from './propietario.routes.js';
import vehiculoRoutes from './vehiculo.routes.js';
import mantenimientoRoutes from './mantenimiento.routes.js';
import obligacionesLRoutes from './obligacionesL.routes.js';
import reporteRoutes from './reporte.routes.js';
import qrRoutes from './qr.routes.js'; // Importa las rutas de QR

const router = Router();

// Rutas de Autenticación
router.use('/auth', authRoutes);

// Rutas de Propietarios
router.use('/propietarios', propietarioRoutes);

// Rutas de Vehículos
router.use('/vehiculos', vehiculoRoutes);

// Rutas de Mantenimientos (incluye la nueva ruta para talleres)
router.use('/mantenimientos', mantenimientoRoutes);

// Rutas de Obligaciones Legales
router.use('/obligacionesL', obligacionesLRoutes);

// Rutas de Reportes
router.use('/reportes', reporteRoutes);

// Nuevas Rutas de QR
router.use('/qr', qrRoutes); // Añade las rutas de QR

export default router;