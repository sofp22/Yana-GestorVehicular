import { Router } from 'express';
import { verifyToken } from '../middleware/authJwt.js';
import { uploadObligacionesL } from '../middleware/upload.js'; // <-- Importa de 'upload.js'
// --- Importa las funciones específicas con named exports ---
import {
    createObligacionL,
    getObligacionLById,
    getAllObligacionesL,
    updateObligacionL,
    deleteObligacionL
} from '../controllers/obligacionesLController.js'; // Importa las funciones con llaves

const router = Router();

// Rutas para Obligaciones Legales
// Usa 'uploadObligacionesL' y el campo es 'archivo'
router.post('/', verifyToken, uploadObligacionesL, createObligacionL);
router.get('/:id', verifyToken, getObligacionLById);
router.get('/', verifyToken, getAllObligacionesL);
router.put('/:id', verifyToken, uploadObligacionesL, updateObligacionL); // Permite actualizar el documento
router.delete('/:id', verifyToken, deleteObligacionL);

export default router;