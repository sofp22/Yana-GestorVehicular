// src/services/mantenimiento.service.js
import db from '../models/index.js';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const Mantenimiento = db.models.Mantenimiento;
const Vehiculo = db.models.Vehiculo;
const Propietario = db.models.Propietario; // Asegúrate de importar Propietario
const TallerMecanico = db.models.TallerMecanico; // Asegúrate de importar TallerMecanico

// Definir la ruta base para guardar los archivos en el servidor
const UPLOADS_DIR_SERVER = path.resolve('src/uploads/mantenimientos'); // Ruta absoluta en el servidor
const UPLOADS_DIR_PUBLIC = '/uploads/mantenimientos'; // Ruta pública para acceder desde el frontend

class MantenimientoService {
    // Obtener mantenimientos por vehiculoId (con verificación de propietario)
    async getMantenimientos(vehiculoId, propietarioId) {
        const vehiculo = await Vehiculo.findOne({ where: { id: vehiculoId, propietarioId: propietarioId } });
        if (!vehiculo) {
            throw { status: 404, message: 'Vehículo no encontrado o no pertenece a este propietario.' };
        }

        return await Mantenimiento.findAll({
            where: { vehiculoId: vehiculoId },
            include: [
                { model: Vehiculo, as: 'vehiculo', attributes: ['id', 'placa', 'marca', 'modelo'] },
                { model: TallerMecanico, as: 'tallerMecanico', attributes: ['id', 'nombre', 'nitOCedula'] }
            ],
            order: [['fecha', 'DESC']]
        });
    }

    // Nuevo método para obtener todos los mantenimientos de un propietario
    async getMantenimientosByPropietario(propietarioId) {
        return await Mantenimiento.findAll({
            include: [
                {
                    model: Vehiculo,
                    as: 'vehiculo',
                    where: { propietarioId: propietarioId },
                    attributes: ['id', 'placa', 'marca', 'modelo']
                },
                {
                    model: TallerMecanico,
                    as: 'tallerMecanico',
                    attributes: ['id', 'nombre', 'nitOCedula']
                }
            ],
            order: [['fecha', 'DESC']]
        });
    }

    async getMantenimientoById(id, propietarioId) {
        const mantenimiento = await Mantenimiento.findByPk(id, {
            include: [{
                model: Vehiculo,
                as: 'vehiculo',
                where: { propietarioId: propietarioId }, // Asegura que el vehículo pertenece al propietario
                attributes: ['id', 'placa', 'marca', 'modelo']
            },
            {
                model: TallerMecanico,
                as: 'tallerMecanico',
                attributes: ['id', 'nombre', 'nitOCedula']
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

        let publicFilePath = null;
        if (file) {
            await fs.mkdir(UPLOADS_DIR_SERVER, { recursive: true });
            const fileName = `${vehiculoId}-${uuidv4()}-${file.originalname}`;
            const serverFilePath = path.join(UPLOADS_DIR_SERVER, fileName);
            await fs.writeFile(serverFilePath, file.buffer); // Guarda el buffer del archivo
            publicFilePath = path.join(UPLOADS_DIR_PUBLIC, fileName); // Ruta pública
        }

        try {
            const newMantenimiento = await Mantenimiento.create({
                ...mantenimientoData,
                facturaPath: publicFilePath, // Guardar la ruta pública
                vehiculoId: vehiculoId
            });
            return newMantenimiento;
        } catch (error) {
            if (publicFilePath) { // Si se intentó guardar un archivo y falló la creación en DB
                await fs.unlink(path.resolve('src', publicFilePath)).catch(err => console.error('Error al eliminar archivo residual:', err));
            }
            throw error;
        }
    }

    async updateMantenimiento(id, mantenimientoData, file, propietarioId) {
        const mantenimiento = await this.getMantenimientoById(id, propietarioId);

        let oldFacturaPath = mantenimiento.facturaPath;
        let newPublicFilePath = null;
        let newServerFilePath = null;

        if (file) {
            await fs.mkdir(UPLOADS_DIR_SERVER, { recursive: true });
            const fileName = `${mantenimiento.vehiculoId}-${uuidv4()}-${file.originalname}`;
            newServerFilePath = path.join(UPLOADS_DIR_SERVER, fileName);
            await fs.writeFile(newServerFilePath, file.buffer);
            newPublicFilePath = path.join(UPLOADS_DIR_PUBLIC, fileName);

            mantenimientoData.facturaPath = newPublicFilePath;
        } else if (mantenimientoData.facturaPath === null) { // Si se envía 'facturaPath: null' explícitamente para borrarlo
            mantenimientoData.facturaPath = null;
        }

        try {
            await mantenimiento.update(mantenimientoData);

            // Eliminar archivo antiguo si se subió uno nuevo o si se pidió borrar
            if (oldFacturaPath && (newPublicFilePath || mantenimientoData.facturaPath === null)) {
                // Convertir la ruta pública a ruta del servidor para eliminar
                const oldServerFilePath = path.join(path.resolve('src', 'uploads'), oldFacturaPath.replace('/uploads/', ''));
                await fs.unlink(oldServerFilePath).catch(err => console.warn('No se pudo eliminar el archivo de factura antiguo:', err));
            }
            return mantenimiento;
        } catch (error) {
            if (newServerFilePath) { // Si se intentó guardar un nuevo archivo y falló la actualización en DB
                await fs.unlink(newServerFilePath).catch(err => console.error('Error al eliminar nuevo archivo residual:', err));
            }
            throw error;
        }
    }

    async deleteMantenimiento(id, propietarioId) {
        const mantenimiento = await this.getMantenimientoById(id, propietarioId);
        const publicFilePath = mantenimiento.facturaPath;

        await mantenimiento.destroy();

        if (publicFilePath) {
            // Convertir la ruta pública a ruta del servidor para eliminar
            const serverFilePath = path.join(path.resolve('src', 'uploads'), publicFilePath.replace('/uploads/', ''));
            await fs.unlink(serverFilePath).catch(err => console.warn('No se pudo eliminar el archivo de mantenimiento:', err));
        }
        return { message: 'Mantenimiento y archivo asociado eliminados exitosamente.' };
    }
}

export default new MantenimientoService();