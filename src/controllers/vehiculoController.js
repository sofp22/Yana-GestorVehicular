// src/controllers/vehiculo.controller.js
import vehiculoService from '../services/vehiculo.service.js';
import { handleHttpError } from '../middleware/errorHandler.js';

class VehiculoController {
    async getAllVehiculos(req, res) {
        try {
            const vehiculos = await vehiculoService.getAllVehiculos(req.user.id);
            res.status(200).json(vehiculos);
        } catch (error) {
            handleHttpError(res, error, 'Error al obtener vehículos.');
        }
    }

    // CAMBIO: Usa placa de req.params para todas las operaciones con un solo vehículo
    async getVehiculoByPlaca(req, res) {
        try {
            const placa = req.params.placa;
            const vehiculo = await vehiculoService.getVehiculoByPlaca(placa, req.user.id);
            res.status(200).json(vehiculo);
        } catch (error) {
            handleHttpError(res, error, 'Error al obtener vehículo.');
        }
    }

    async createVehiculo(req, res) {
        try {
            const newVehiculo = await vehiculoService.createVehiculo(req.body, req.user.id);
            res.status(201).json(newVehiculo);
        } catch (error) {
            handleHttpError(res, error, 'Error al crear vehículo.');
        }
    }

    async updateVehiculoByPlaca(req, res) {
        try {
            const placa = req.params.placa;
            const updatedVehiculo = await vehiculoService.updateVehiculoByPlaca(placa, req.body, req.user.id);
            res.status(200).json(updatedVehiculo);
        } catch (error) {
            handleHttpError(res, error, 'Error al actualizar vehículo.');
        }
    }

    async deleteVehiculoByPlaca(req, res) {
        try {
            const placa = req.params.placa;
            const result = await vehiculoService.deleteVehiculoByPlaca(placa, req.user.id);
            res.status(200).json(result);
        } catch (error) {
            handleHttpError(res, error, 'Error al eliminar vehículo.');
        }
    }
}

export default new VehiculoController();