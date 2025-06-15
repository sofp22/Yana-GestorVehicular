// src/services/auth.service.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

class AuthService {
    generateAccessToken(propietario) {
        // El token contendrá el ID interno (UUID) del propietario, no la identificación
        // Esto es porque el ID UUID es la clave primaria y es la que usamos para las relaciones internas.
        return jwt.sign({ id: propietario.id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRATION_TIME
        });
    }

    // Puedes añadir aquí lógica para refrescar tokens, invalidar, etc.
}

export default new AuthService();