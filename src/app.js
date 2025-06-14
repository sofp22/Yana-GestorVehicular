// src/app.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import allRoutes from './routes/index.js';
import path from 'path'; // Importa path para servir archivos estáticos
import { fileURLToPath } from 'url'; // Para __dirname en módulos ES

const app = express();

// Para resolver __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors()); // Permite solicitudes desde otros dominios (frontend)
app.use(express.json()); // Habilita el parsing de JSON en el body de las solicitudes
app.use(express.urlencoded({ extended: true })); // Habilita el parsing de URL-encoded data
app.use(morgan('dev')); // Logger de solicitudes HTTP para desarrollo

// Servir archivos estáticos (uploads)
// Asegúrate de que esta ruta coincida con los directorios de guardado de Multer
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas de la API
app.use('/api', allRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API de Gestión de Vehículos está activa!');
});

// Manejador de errores global (si tienes uno más complejo)
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).send('Algo salió mal!');
// });

export default app;