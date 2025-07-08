import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import morgan from 'morgan';

import allRoutes from './routes/index.js';            // tus rutas API (/api/...)
import workshopRoutes from './routes/workshop.routes.js'; // tus GET/POST SSR

const app = express();

// para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 1) Sirve tu carpeta public (CSS/JS/HTML SSR)
app.use(express.static(path.join(__dirname, '../public')));

// 2) Monta tus rutas SSR **antes** de las API, y **sin** prefijo `/api`:
//    - GET  /mantenimientos/workshop-submit → muestra el formulario
//    - POST /mantenimientos/workshop-submit → procesa el envío
app.use('/', workshopRoutes);

// 3) Monta tus rutas de API bajo `/api`
app.use('/api', allRoutes);

// Ruta raíz de sanity check
app.get('/', (req, res) => res.send('API de Gestión de Vehículos está activa!'));

export default app;
