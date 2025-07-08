// src/routes/mantenimiento.routes.js
import { Router } from 'express';
import { verifyToken } from '../middleware/authJwt.js'; // Necesario para rutas protegidas
// CAMBIO CLAVE: Importar uploadMantenimientoFactura desde el middleware centralizado
import { uploadMantenimientoFactura } from '../middleware/upload.js'; 
import {
    createMantenimiento, 
    createMantenimientoByWorkshop, 
    getAllMantenimientos, 
    getMantenimientoById, 
    updateMantenimiento, 
    deleteMantenimiento // Asegurarse de importar deleteMantenimiento
} from '../controllers/mantenimientoController.js'; 

const router = Router();


// Permite subir un archivo de factura (para el propietario)
router.post(
    '/',
    verifyToken, // Propietario debe estar autenticado
    uploadMantenimientoFactura, // Middleware de Multer para el archivo 'factura' (ya configurado con .single('factura') en upload.js)
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
    uploadMantenimientoFactura, // Middleware de Multer para el archivo 'factura' (ya configurado con .single('factura') en upload.js)
    updateMantenimiento
);

// Ruta para que el propietario (autenticado) elimine UN mantenimiento por su ID
router.delete(
    '/:id',
    verifyToken,
    deleteMantenimiento
);


//registro de mantenimiento por parte del taller (sin JWT, usa token QR)
router.post(
    '/workshop-submit',
    uploadMantenimientoFactura, // Multer también para taller si sube factura (ya configurado con .single('factura') en upload.js)
    createMantenimientoByWorkshop
);

export default router;