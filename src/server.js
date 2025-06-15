// src/server.js
import app from './app.js';
import db from './models/index.js'; 
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT ||  5432;


db.sequelize.sync({ alter: true })
    .then(() => {
        console.log("Base de datos sincronizada.");
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
            console.log(`Accede a la API en: http://127.0.0.1:${PORT}`);
        });
    })
    .catch(err => {
        console.error("Error al sincronizar la base de datos:", err);
    });