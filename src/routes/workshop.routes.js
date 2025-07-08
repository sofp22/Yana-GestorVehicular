import { Router } from 'express';
import multer from 'multer';
import { showWorkshopForm, submitWorkshopForm } from '../controllers/workshopController.js';

const upload = multer(); // en memoria
const router = Router();

// SSR para talleres (no bajo /api)
router.get('/mantenimientos/workshop-submit', showWorkshopForm);
router.post('/mantenimientos/workshop-submit', upload.single('factura'), submitWorkshopForm);

export default router;
