import { Router } from 'express';
import { verifyToken } from '../middleware/authJwt.js'; // Necesario para rutas protegidas
import {
    createMantenimiento, 
    createMantenimientoByWorkshop, 
    getAllMantenimientos, 
    getMantenimientoById, 
    updateMantenimiento, 
    uploadMantenimientoFactura // Middleware para Multer
} from '../controllers/mantenimientoController.js'; 

const router = Router();


// Permite subir un archivo de factura
router.post(
    '/',
    verifyToken, // Propietario debe estar autenticado
    uploadMantenimientoFactura.single('factura'), // Middleware de Multer para el archivo 'factura'
    createMantenimiento
);

// Ruta para que el propietario (autenticado) obtenga TODOS los mantenimientos
// de SUS vehículos
router.get(
    '/',
    verifyToken, // Propietario debe estar autenticado
    getAllMantenimientos
);

// Ruta para que el propietario (autenticado) obtenga UN mantenimiento por su ID
router.get(
    '/:id',
    verifyToken, // Propietario debe estar autenticado
    getMantenimientoById
);

// Ruta para que el propietario (autenticado) actualice UN mantenimiento por su ID
// Permite actualizar campos y/o subir una nueva factura
router.put(
    '/:id',
    verifyToken, 
    uploadMantenimientoFactura.single('factura'), // Middleware de Multer para el archivo 'factura' (puede ser opcional)
    updateMantenimiento
);

//registro de mantenimiento por parte del taller
router.post(
    '/workshop-submit',
    uploadMantenimientoFactura.single('factura'), // Multer también para taller si sube factura
    createMantenimientoByWorkshop
);

export default router;