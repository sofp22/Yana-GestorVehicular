import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../models/index.js'; 

dotenv.config();

const { TokenExpiredError } = jwt;

const catchError = (err, res) => {
    if (err instanceof TokenExpiredError) {
        return res.status(401).send({ message: "No autorizado. ¡Acceso expirado! Por favor, inicie sesión de nuevo." });
    }
    return res.status(401).send({ message: "No autorizado." });
};

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).send({ message: "No se proporcionó un token." });
    }

    const token = authHeader.split(' ')[1]; // Espera "Bearer TOKEN"

    if (!token) {
        return res.status(403).send({ message: "No se proporcionó un token." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return catchError(err, res);
        }
        // decoded.id contendrá el id UUID del propietario
        req.user = { id: decoded.id }; // Añade el id del usuario decodificado a req.user
        next();
    });
};