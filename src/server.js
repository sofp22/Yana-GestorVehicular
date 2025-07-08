// src/server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import morgan from 'morgan'; // Para logging de peticiones

import allRoutes from './routes/index.js';          // Tus rutas API principales (/api/...)
import workshopRoutes from './routes/workshop.routes.js'; // Tus rutas SSR para el taller

// Configuración para __dirname en módulos ES (necesario para path.join)
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// Middlewares globales
app.use(cors()); // Habilitar CORS para permitir solicitudes desde otros dominios
app.use(express.json()); // Habilitar el parseo de JSON en el cuerpo de las solicitudes
app.use(express.urlencoded({ extended: true })); // Habilitar el parseo de datos de formularios URL-encoded
app.use(morgan('dev')); // Para ver logs de las peticiones en la consola (ej. GET /api/mantenimientos 200)

// --- SERVIR ARCHIVOS ESTÁTICOS ---
// 1) Sirve la carpeta 'web' para archivos HTML/CSS/JS SSR (ej. workshop_form.html)
// Un archivo en src/web/workshop_form.html será accesible directamente en /workshop_form.html
app.use(express.static(path.join(__dirname, '../web')));

// 2) Sirve la carpeta 'uploads' para archivos subidos (facturas, documentos)
// Un archivo en src/uploads/mantenimientos/factura.pdf será accesible en /uploads/mantenimientos/factura.pdf
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- MONTAJE DE RUTAS ---
// ¡CAMBIO CRUCIAL AQUÍ: Monta workshopRoutes bajo el prefijo correcto!
// Esto asegura que la URL /api/mantenimientos/workshop-submit sea manejada por workshopRoutes.
app.use('/api/mantenimientos', workshopRoutes); 

// Monta tus rutas de API principales bajo `/api`
app.use('/api', allRoutes);

// Ruta raíz de sanity check
app.get('/', (req, res) => res.send('API de Gestión de Vehículos está activa!'));

// --- CONEXIÓN A LA BASE DE DATOS E INICIO DEL SERVIDOR ---
// Asegúrate de importar 'db' desde tu models/index.js en este archivo si aún no lo haces
import db from './models/index.js'; // Asegúrate de que esta línea esté aquí

db.sequelize.authenticate()
    .then(() => {
        console.log('Conexión a la base de datos establecida correctamente.');
        return db.sequelize.sync({ force: false }); // Sincroniza modelos con la base de datos
    })
    .then(() => {
        console.log('Base de datos sincronizada.');
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
            console.log(`Accede a la API en: http://localhost:${PORT}/api`);
        });
    })
    .catch(err => {
        console.error('No se pudo conectar a la base de datos:', err);
    });