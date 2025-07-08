// src/routes/workshop.routes.js
import { Router } from 'express';
import { uploadMantenimientoFactura } from '../middleware/upload.js'; // Importar Multer centralizado
import { showWorkshopForm, submitWorkshopForm } from '../controllers/workshopController.js';

const router = Router();

// Ruta GET para mostrar el formulario HTML del taller.
router.get('/workshop-submit', showWorkshopForm);

// Ruta POST para recibir los datos del formulario (incluyendo el archivo)
router.post('/workshop-submit', uploadMantenimientoFactura, submitWorkshopForm);

export default router;