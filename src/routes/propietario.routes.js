// src/routes/propietario.routes.js
import { Router } from 'express';
import propietarioController from '../controllers/propietarioController.js';
import { verifyToken } from '../middleware/authJwt.js';

const router = Router();

// Rutas de Propietario - Protegidas por JWT
// Ahora las operaciones GET, PUT, DELETE para un solo propietario usan la identificacion
router.get('/:identificacion', verifyToken, propietarioController.getPropietarioByIdentificacion);
router.put('/:identificacion', verifyToken, propietarioController.updatePropietarioByIdentificacion);
router.delete('/:identificacion', verifyToken, propietarioController.deletePropietarioByIdentificacion);

// Ruta para obtener todos los propietarios (considera si esta ruta es apropiada sin más control de roles)
router.get('/', verifyToken, propietarioController.getAllPropietarios);

export default router;