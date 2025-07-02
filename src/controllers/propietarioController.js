
import propietarioService from '../services/propietario.service.js';
import { handleHttpError } from '../middleware/errorHandler.js';

class PropietarioController {
    async registerPropietario(req, res) {
        try {
            const newPropietario = await propietarioService.registerPropietario(req.body);
            res.status(201).json(newPropietario);
        } catch (error) {
            handleHttpError(res, error, 'Error al registrar propietario.');
        }
    }

    async loginPropietario(req, res) {
        try {
            const { correo, password } = req.body;
            const propietario = await propietarioService.loginPropietario(correo, password);

            // Generar JWT (asegúrate de que este método exista en el servicio que uses, como authService)
            const accessToken = propietarioService.generateAccessToken(propietario); // Ajusta según donde esté generateAccessToken
            // Si generateAccessToken está en authService, sería:
            // import authService from '../services/auth.service.js';
            // const accessToken = authService.generateAccessToken(propietario);

            res.status(200).json({ propietario: propietario, accessToken: accessToken });
        } catch (error) {
            handleHttpError(res, error, 'Error de autenticación.');
        }
    }

    async getAllPropietarios(req, res) {
        try {
            const propietarios = await propietarioService.getAllPropietarios();
            res.status(200).json(propietarios);
        } catch (error) {
            handleHttpError(res, error, 'Error al obtener propietarios.');
        }
    }

    async getPropietarioByIdentificacion(req, res) {
        try {
            const identificacion = req.params.identificacion;
            const propietario = await propietarioService.getPropietarioByIdentificacion(identificacion);
            res.status(200).json(propietario);
        } catch (error) {
            handleHttpError(res, error, 'Error al obtener propietario.');
        }
    }

    async updatePropietarioByIdentificacion(req, res) {
        try {
            const identificacion = req.params.identificacion;
            const updatedPropietario = await propietarioService.updatePropietarioByIdentificacion(identificacion, req.body);
            res.status(200).json(updatedPropietario);
        } catch (error) {
            handleHttpError(res, error, 'Error al actualizar propietario.');
        }
    }

    async deletePropietarioByIdentificacion(req, res) {
        try {
            const identificacion = req.params.identificacion;
            const result = await propietarioService.deletePropietarioByIdentificacion(identificacion);
            res.status(200).json(result);
        } catch (error) {
            handleHttpError(res, error, 'Error al eliminar propietario.');
        }
    }
}

export default new PropietarioController();
