// src/services/mantenimiento.service.js
import db from '../models/index.js';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const Mantenimiento = db.Mantenimiento;
const Vehiculo = db.Vehiculo;
const UPLOADS_DIR = 'src/uploads/mantenimientos';

class MantenimientoService {
    async getMantenimientos(vehiculoId, propietarioId) {
        // Verificar que el vehículo pertenezca al propietario usando el ID UUID del vehículo
        const vehiculo = await Vehiculo.findOne({ where: { id: vehiculoId, propietarioId: propietarioId } });
        if (!vehiculo) {
            throw { status: 404, message: 'Vehículo no encontrado o no pertenece a este propietario.' };
        }

        return await Mantenimiento.findAll({
            where: { vehiculoId: vehiculoId },
            order: [['fecha', 'DESC']]
        });
    }

    async getMantenimientoById(id, propietarioId) {
        const mantenimiento = await Mantenimiento.findByPk(id, {
            include: [{
                model: Vehiculo,
                as: 'vehiculo',
                where: { propietarioId: propietarioId }, // Asegura que el vehículo pertenece al propietario
                attributes: ['id', 'placa']
            }]
        });

        if (!mantenimiento) {
            throw { status: 404, message: 'Mantenimiento no encontrado o no accesible para este propietario.' };
        }
        return mantenimiento;
    }

    async createMantenimiento(mantenimientoData, file, propietarioId) {
        const { vehiculoId } = mantenimientoData;

        // 1. Verificar que el vehículo pertenezca al propietario autenticado usando el ID UUID del vehículo
        const vehiculo = await Vehiculo.findOne({ where: { id: vehiculoId, propietarioId: propietarioId } });
        if (!vehiculo) {
            throw { status: 403, message: 'No tiene permiso para agregar mantenimientos a este vehículo.' };
        }

        let filePath = null;
        if (file) {
            await fs.mkdir(UPLOADS_DIR, { recursive: true });
            const fileName = `${vehiculoId}-${uuidv4()}-${file.originalname}`;
            filePath = path.join(UPLOADS_DIR, fileName);
            await fs.writeFile(filePath, file.buffer);
        }

        try {
            const newMantenimiento = await Mantenimiento.create({
                ...mantenimientoData,
                facturaPath: filePath,
                vehiculoId: vehiculoId
            });
            return newMantenimiento;
        } catch (error) {
            if (filePath) {
                await fs.unlink(path.resolve(filePath)).catch(err => console.error('Error al eliminar archivo residual:', err));
            }
            throw error;
        }
    }

    async updateMantenimiento(id, mantenimientoData, file, propietarioId) {
        const mantenimiento = await this.getMantenimientoById(id, propietarioId);

        let oldFacturaPath = mantenimiento.facturaPath;
        let newFacturaPath = null;

        if (file) {
            await fs.mkdir(UPLOADS_DIR, { recursive: true });
            const fileName = `${mantenimiento.vehiculoId}-${uuidv4()}-${file.originalname}`;
            newFacturaPath = path.join(UPLOADS_DIR, fileName);
            await fs.writeFile(newFacturaPath, file.buffer);

            mantenimientoData.facturaPath = newFacturaPath;
        } else if (mantenimientoData.facturaPath === null) { // Si se envía 'facturaPath: null' explícitamente para borrarlo
             mantenimientoData.facturaPath = null;
        }

        try {
            await mantenimiento.update(mantenimientoData);

            // Eliminar archivo antiguo si se subió uno nuevo o si se pidió borrar
            if (oldFacturaPath && (newFacturaPath || mantenimientoData.facturaPath === null)) {
                await fs.unlink(path.resolve(oldFacturaPath)).catch(err => console.warn('No se pudo eliminar el archivo de factura antiguo:', err));
            }
            return mantenimiento;
        } catch (error) {
            if (newFacturaPath) {
                await fs.unlink(path.resolve(newFacturaPath)).catch(err => console.error('Error al eliminar nuevo archivo residual:', err));
            }
            throw error;
        }
    }

    async deleteMantenimiento(id, propietarioId) {
        const mantenimiento = await this.getMantenimientoById(id, propietarioId);
        const filePath = mantenimiento.facturaPath;

        await mantenimiento.destroy();

        if (filePath) {
            await fs.unlink(path.resolve(filePath)).catch(err => console.warn('No se pudo eliminar el archivo de mantenimiento:', err));
        }
        return { message: 'Mantenimiento y archivo asociado eliminados exitosamente.' };
    }
}

export default new MantenimientoService();