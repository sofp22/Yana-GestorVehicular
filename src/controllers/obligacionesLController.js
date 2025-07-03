import obligacionesLService from '../services/ObligacionesL.service.js';
import { handleHttpError } from '../middleware/errorHandler.js';
import { uploadObligacionesL } from '../middleware/upload.js'; 

class ObligacionesLController {
    async getAllObligacionesL(req, res) {
        try {
            const obligaciones = await obligacionesLService.getObligacionesL(req.params.vehiculoId, req.user.id);
            res.status(200).json(obligaciones);
        } catch (error) {
            handleHttpError(res, error, 'Error al obtener obligaciones legales.');
        }
    }

    async getObligacionesLById(req, res) {
        try {
            const obligacion = await obligacionesLService.getObligacionesLById(req.params.id, req.user.id);
            res.status(200).json(obligacion);
        } catch (error) {
            handleHttpError(res, error, 'Error al obtener obligación legal.');
        }
    }

    createObligacionesL(req, res) {
        uploadObligacionesL(req, res, async (err) => {
            if (err) {
                return handleHttpError(res, err, 'Error al subir el archivo de la obligación legal.');
            }
            try {
                const newObligacionL = await obligacionesLService.createObligacionesL(req.body, req.file, req.user.id);
                res.status(201).json(newObligacionL);
            } catch (error) {
                handleHttpError(res, error, 'Error al crear obligación legal.');
            }
        });
    }

    updateObligacionesL(req, res) {
        uploadObligacionesL(req, res, async (err) => {
            if (err) {
                return handleHttpError(res, err, 'Error al actualizar el archivo de la obligación legal.');
            }
            try {
                // req.body puede contener archivoPath: null si se quiere eliminar el archivo existente sin reemplazarlo
                const updatedObligacionL = await obligacionesLService.updateObligacionesL(req.params.id, req.body, req.file, req.user.id);
                res.status(200).json(updatedObligacionL);
            } catch (error) {
                handleHttpError(res, error, 'Error al actualizar obligación legal.');
            }
        });
    }

}

export default new ObligacionesLController();