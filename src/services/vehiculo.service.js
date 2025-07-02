// src/services/vehiculo.service.js
import db from '../models/index.js';
import fs from 'fs/promises';
import path from 'path';

const Vehiculo = db.models.Vehiculo;
const Mantenimiento = db.models.Mantenimiento;
const ObligacionesL = db.models.ObligacionesL;


class VehiculoService {
    async getAllVehiculos(propietarioId) {
        return await Vehiculo.findAll({
            where: { propietarioId: propietarioId }
        });
    }

    async getVehiculoByPlaca(placa, propietarioId) {
        const vehiculo = await Vehiculo.findOne({
            where: { placa: placa, propietarioId: propietarioId }
        });
        if (!vehiculo) {
            throw { status: 404, message: 'Vehículo no encontrado o no pertenece a este propietario.' };
        }
        return vehiculo;
    }

    async createVehiculo(vehiculoData, propietarioId) {
        const { placa } = vehiculoData;

        // Verificar si la placa ya existe globalmente
        const existingVehiculo = await Vehiculo.findOne({ where: { placa: placa } });
        if (existingVehiculo) {
            throw { status: 409, message: 'La placa ya está registrada en el sistema.' };
        }

        const newVehiculo = await Vehiculo.create({
            ...vehiculoData,
            propietarioId: propietarioId
        });
        return newVehiculo;
    }

    async updateVehiculoByPlaca(placa, vehiculoData, propietarioId) {
        const vehiculo = await this.getVehiculoByPlaca(placa, propietarioId); // Reusa el método de búsqueda por placa

        // Si se intenta cambiar la placa a una ya existente para otro vehículo
        if (vehiculoData.placa && vehiculoData.placa !== placa) {
            const existingByNewPlaca = await Vehiculo.findOne({ where: { placa: vehiculoData.placa } });
            if (existingByNewPlulo) { // Cambio aquí: si se encuentra el vehículo con la nueva placa
                throw { status: 409, message: 'La nueva placa ya está registrada para otro vehículo.' };
            }
        }

        await vehiculo.update(vehiculoData);
        return vehiculo;
    }

    async deleteVehiculoByPlaca(placa, propietarioId) {
        const vehiculo = await this.getVehiculoByPlaca(placa, propietarioId); // Reusa el método de búsqueda por placa

        // Lógica para eliminar archivos asociados a mantenimientos y obligacionesL antes de eliminar el vehículo.
        // Esto es crucial porque onDelete: 'CASCADE' solo elimina los registros de la DB, no los archivos locales.
        const mantenimientos = await Mantenimiento.findAll({ where: { vehiculoId: vehiculo.id } });
        for (const mant of mantenimientos) {
            if (mant.facturaPath) {
                await fs.unlink(path.resolve(mant.facturaPath)).catch(err => console.warn(`Error al eliminar factura de mantenimiento ${mant.id}: ${err.message}`));
            }
        }

        const obligacionesL = await ObligacionesL.findAll({ where: { vehiculoId: vehiculo.id } });
        for (const obl of obligacionesL) {
            if (obl.archivoPath) {
                await fs.unlink(path.resolve(obl.archivoPath)).catch(err => console.warn(`Error al eliminar archivo de obligación legal ${obl.id}: ${err.message}`));
            }
        }

        await vehiculo.destroy();
        return { message: 'Vehículo y todos sus mantenimientos y obligaciones legales asociados (incluyendo archivos) eliminados exitosamente.' };
    }
}

export default new VehiculoService();