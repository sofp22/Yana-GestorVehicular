// src/routes/index.js
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import propietarioRoutes from './propietario.routes.js';
import vehiculoRoutes from './vehiculo.routes.js';
import mantenimientoRoutes from './mantenimiento.routes.js';
import obligacionesLRoutes from './obligacionesL.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/propietarios', propietarioRoutes);
router.use('/vehiculos', vehiculoRoutes);
router.use('/mantenimientos', mantenimientoRoutes);
router.use('/obligacionesL', obligacionesLRoutes);

export default router;