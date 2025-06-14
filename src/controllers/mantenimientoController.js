// src/controllers/mantenimiento.controller.js
import mantenimientoService from '../services/mantenimiento.service.js';
import { handleHttpError } from '../middleware/errorHandler.js';
import { uploadMantenimiento } from '../middleware/upload.js'; // Importa el middleware de Multer

class MantenimientoController {
    async getAllMantenimientos(req, res) {
        try {
            const mantenimientos = await mantenimientoService.getMantenimientos(req.params.vehiculoId, req.user.id);
            res.status(200).json(mantenimientos);
        } catch (error) {
            handleHttpError(res, error, 'Error al obtener mantenimientos.');
        }
    }

    async getMantenimientoById(req, res) {
        try {
            const mantenimiento = await mantenimientoService.getMantenimientoById(req.params.id, req.user.id);
            res.status(200).json(mantenimiento);
        } catch (error) {
            handleHttpError(res, error, 'Error al obtener mantenimiento.');
        }
    }

    createMantenimiento(req, res) {
        uploadMantenimiento(req, res, async (err) => {
            if (err) {
                return handleHttpError(res, err, 'Error al subir el archivo de la factura.');
            }
            try {
                const newMantenimiento = await mantenimientoService.createMantenimiento(req.body, req.file, req.user.id);
                res.status(201).json(newMantenimiento);
            } catch (error) {
                handleHttpError(res, error, 'Error al crear mantenimiento.');
            }
        });
    }

    updateMantenimiento(req, res) {
        uploadMantenimiento(req, res, async (err) => {
            if (err) {
                return handleHttpError(res, err, 'Error al actualizar el archivo de la factura.');
            }
            try {
                // req.body puede contener facturaPath: null si se quiere eliminar el archivo existente sin reemplazarlo
                const updatedMantenimiento = await mantenimientoService.updateMantenimiento(req.params.id, req.body, req.file, req.user.id);
                res.status(200).json(updatedMantenimiento);
            } catch (error) {
                handleHttpError(res, error, 'Error al actualizar mantenimiento.');
            }
        });
    }

    async deleteMantenimiento(req, res) {
        try {
            const result = await mantenimientoService.deleteMantenimiento(req.params.id, req.user.id);
            res.status(200).json(result);
        } catch (error) {
            handleHttpError(res, error, 'Error al eliminar mantenimiento.');
        }
    }
}

export default new MantenimientoController();