// src/server.js
import express from 'express';
import cors from 'cors';
import db from './models/index.js'; // Importar la configuración de la base de datos
import allRoutes from './routes/index.js'; // Importar todas las rutas
import path from 'path'; // Importar path para manejar rutas de archivos
import { fileURLToPath } from 'url'; // Para __dirname en ES Modules

// Configuración para __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors()); // Habilitar CORS para permitir solicitudes desde otros dominios
app.use(express.json()); // Habilitar el parseo de JSON en el cuerpo de las solicitudes

// --- CAMBIO CLAVE AQUÍ: Servir archivos estáticos desde la carpeta 'uploads' ---
// Esto permite que los archivos en 'src/uploads' sean accesibles públicamente a través de la URL /uploads
// Por ejemplo, un archivo guardado en src/uploads/mantenimientos/factura.pdf
// será accesible en http://localhost:3000/uploads/mantenimientos/factura.pdf
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// --- FIN CAMBIO ---


// Rutas de la API
app.use('/api', allRoutes); // Todas las rutas de la API bajo el prefijo /api

// Sincronizar la base de datos y luego iniciar el servidor
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
