
import { Router } from 'express';
import { verifyToken } from '../middleware/authJwt.js';
import { uploadObligacionesDocumento } from '../controllers/obligacionesLController.js'; // Importa Multer middleware
// --- CAMBIO CLAVE AQUÍ: Importar las funciones específicas con named exports ---
import {
    createObligacionL,
    getObligacionLById,
    getAllObligacionesL,
    updateObligacionL,
    deleteObligacionL
} from '../controllers/obligacionesLController.js'; // Importa las funciones con llaves

const router = Router();

// Rutas para Obligaciones Legales
router.post('/', verifyToken, uploadObligacionesDocumento.single('documento'), createObligacionL);
router.get('/:id', verifyToken, getObligacionLById);
router.get('/', verifyToken, getAllObligacionesL);
router.put('/:id', verifyToken, uploadObligacionesDocumento.single('documento'), updateObligacionL); // Permite actualizar el documento
router.delete('/:id', verifyToken, deleteObligacionL);

export default router;