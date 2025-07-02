
import propietarioService from '../services/propietario.service.js';
import authService from '../services/auth.service.js';
import { handleHttpError } from '../middleware/errorHandler.js';

class AuthController {
    async register(req, res) {
        try {
            console.log('BODY RECIBIDO:', req.body);
            const newPropietario = await propietarioService.registerPropietario(req.body);
            res.status(201).json({ message: 'Propietario registrado exitosamente.', propietario: newPropietario });
        } catch (error) {
            handleHttpError(res, error, 'Error al registrar propietario.');
        }
    }

    async login(req, res) {
        try {
            const { correo, password } = req.body;
            const propietario = await propietarioService.loginPropietario(correo, password);
            const accessToken = authService.generateAccessToken(propietario); // Usa authService para generar el token
            res.status(200).json({ propietario: propietario, accessToken: accessToken });
        } catch (error) {
            handleHttpError(res, error, 'Error de autenticación.');
        }
    }
}

export default new AuthController();