import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Usamos fs síncrono para mkdirSync

const UPLOADS_BASE_DIR = 'src/uploads';
const MANTENIMIENTOS_DIR = path.join(UPLOADS_BASE_DIR, 'mantenimientos');
const OBLIGACIONES_L_DIR = path.join(UPLOADS_BASE_DIR, 'obligaciones_l');


fs.mkdirSync(MANTENIMIENTOS_DIR, { recursive: true });
fs.mkdirSync(OBLIGACIONES_L_DIR, { recursive: true });


// Configuración de Multer para Mantenimientos
const storageMantenimiento = multer.memoryStorage(); // Almacena el archivo en memoria como un Buffer
export const uploadMantenimiento = multer({
    storage: storageMantenimiento,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido para factura. Solo PDF o imágenes.'), false);
        }
    }
}).single('factura'); // 'factura' es el nombre del campo en el formulario

// Configuración de Multer para ObligacionesL
const storageObligacionesL = multer.memoryStorage(); // Almacena el archivo en memoria como un Buffer
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