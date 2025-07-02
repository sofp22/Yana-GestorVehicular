// src/services/auth.service.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

class AuthService {
    generateAccessToken(propietario) {
        
        return jwt.sign({ id: propietario.id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRATION_TIME
        });
    }

    
}

export default new AuthService();