import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import db from './models/index.js'; // Importa el objeto db que incluye sequelize
import './controllers/reporteController.js'; // Importa el controlador de reportes para iniciar el cron job


const PORT = process.env.PORT || 3000;

// Sincronizar la base de datos y luego iniciar el servidor
db.sequelize.sync({ alter: true })
    .then(() => {
        console.log("Base de datos sincronizada.");
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
            console.log(`Accede a la API en: http://localhost:${PORT}/api`);
        });
    })
    .catch(err => {
        console.error("Error al sincronizar la base de datos:", err);
    });