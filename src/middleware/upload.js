// src/middleware/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Usamos fs síncrono para mkdirSync
import { fileURLToPath } from 'url'; // Necesario para __dirname en ES Modules

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_BASE_DIR = path.join(__dirname, '../uploads');
const MANTENIMIENTOS_DIR = path.join(UPLOADS_BASE_DIR, 'mantenimientos');
const OBLIGACIONES_L_DIR = path.join(UPLOADS_BASE_DIR, 'obligaciones_l');

// Asegurarse de que las carpetas de uploads existan
fs.mkdirSync(MANTENIMIENTOS_DIR, { recursive: true });
fs.mkdirSync(OBLIGACIONES_L_DIR, { recursive: true });


// Configuración de Multer para Mantenimientos (Facturas) - Almacena en memoria
const storageMantenimientoFactura = multer.memoryStorage(); 

export const uploadMantenimientoFactura = multer({ 
    storage: storageMantenimientoFactura,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: (req, file, cb) => {
        console.log('Mantenimiento Factura - MIME Type recibido:', file.mimetype); // <--- ADD THIS LINE
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido para factura. Solo PDF o imágenes.'), false);
        }
    }
}).single('factura'); // 'factura' es el nombre del campo en el formulario


// Configuración de Multer para ObligacionesL - Almacena en memoria
const storageObligacionesL = multer.memoryStorage(); 
export const uploadObligacionesL = multer({
    storage: storageObligacionesL,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido para obligación legal. Solo PDF o imágenes.'), false);
        }
    }
}).single('archivo'); // 'archivo' es el nombre del campo en el formulario