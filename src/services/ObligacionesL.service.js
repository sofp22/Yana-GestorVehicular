import db from '../models/index.js'; //
import path from 'path'; //
import fs from 'fs/promises'; //
import { v4 as uuidv4 } from 'uuid'; //

const ObligacionesL = db.models.ObligacionesL; //
const Vehiculo = db.models.Vehiculo; //
const UPLOADS_DIR = 'src/uploads/obligaciones_l'; //

class ObligacionesLService {
    async getObligacionesL(vehiculoId, propietarioId) {
        // Verificar que el vehículo pertenezca al propietario usando el ID UUID del vehículo
        const vehiculo = await Vehiculo.findOne({ where: { id: vehiculoId, propietarioId: propietarioId } }); //
        if (!vehiculo) { //
            throw { status: 404, message: 'Vehículo no encontrado o no pertenece a este propietario.' }; //
        }

        return await ObligacionesL.findAll({
            where: { vehiculoId: vehiculoId }, //
            order: [['fechaRenovacion', 'ASC']] //
        });
    }

    async getObligacionesLById(id, propietarioId) {
        const obligacion = await ObligacionesL.findByPk(id, {
            include: [{
                model: Vehiculo,
                as: 'vehiculo',
                where: { propietarioId: propietarioId }, // Asegura que el vehículo pertenece al propietario
                attributes: ['id', 'placa']
            }]
        });

        if (!obligacion) {
            throw { status: 404, message: 'Obligación legal no encontrada o no accesible para este propietario.' };
        }
        return obligacion;
    }

    // Nuevo método para obtener todas las obligaciones legales de un propietario
    async getAllObligacionesLByPropietario(propietarioId) {
        try {
            const obligacionesLegales = await ObligacionesL.findAll({
                include: [{
                    model: Vehiculo,
                    as: 'vehiculo',
                    where: { propietarioId: propietarioId }, // Filtra por el propietario logueado
                    attributes: ['id', 'placa', 'marca', 'modelo']
                }],
                order: [['fechaVencimiento', 'ASC']] // Ordena por fecha de vencimiento
            });
            return obligacionesLegales;
        } catch (error) {
            console.error("Error en servicio getAllObligacionesLByPropietario:", error);
            throw { status: 500, message: "Error al obtener todas las obligaciones legales del propietario." };
        }
    }


    async createObligacionesL(obligacionData, file, propietarioId) {
        const { vehiculoId } = obligacionData; //

        // 1. Verificar que el vehículo pertenezca al propietario autenticado usando el ID UUID del vehículo
        const vehiculo = await Vehiculo.findOne({ where: { id: vehiculoId, propietarioId: propietarioId } }); //
        if (!vehiculo) { //
            throw { status: 403, message: 'No tiene permiso para agregar obligaciones legales a este vehículo.' }; //
        }

        if (!file) { //
            throw { status: 400, message: 'Se requiere un archivo para la obligación legal.' }; //
        }

        await fs.mkdir(UPLOADS_DIR, { recursive: true }); //
        const fileName = `${vehiculoId}-${uuidv4()}-${file.originalname}`; //
        const filePath = path.join(UPLOADS_DIR, fileName); //
        await fs.writeFile(filePath, file.buffer); //

        try {
            const newObligacionL = await ObligacionesL.create({
                ...obligacionData,
                archivoPath: filePath, //
                vehiculoId: vehiculoId //
            });
            return newObligacionL; //
        } catch (error) {
            await fs.unlink(path.resolve(filePath)).catch(err => console.error('Error al eliminar archivo residual:', err)); //
            throw error; //
        }
    }

    async updateObligacionesL(id, obligacionData, file, propietarioId) {
        const obligacion = await this.getObligacionesLById(id, propietarioId); //

        let oldArchivoPath = obligacion.archivoPath; //
        let newArchivoPath = null; //

        if (file) { //
            await fs.mkdir(UPLOADS_DIR, { recursive: true }); //
            const fileName = `${obligacion.vehiculoId}-${uuidv4()}-${file.originalname}`; //
            newArchivoPath = path.join(UPLOADS_DIR, fileName); //
            await fs.writeFile(newArchivoPath, file.buffer); //

            obligacionData.archivoPath = newArchivoPath; //
        } else if (obligacionData.archivoPath === null) { // Si se envía 'archivoPath: null' explícitamente para borrarlo //
            obligacionData.archivoPath = null; //
        }

        try {
            await obligacion.update(obligacionData); //

            // Eliminar archivo antiguo si se subió uno nuevo o si se pidió borrar
            if (oldArchivoPath && (newArchivoPath || obligacionData.archivoPath === null)) { //
                await fs.unlink(path.resolve(oldArchivoPath)).catch(err => console.warn('No se pudo eliminar el archivo de obligación legal antiguo:', err)); //
            }
            return obligacion; //
        } catch (error) {
            if (newArchivoPath) { //
                await fs.unlink(path.resolve(newArchivoPath)).catch(err => console.error('Error al eliminar nuevo archivo residual:', err)); //
            }
            throw error; //
        }
    }

    async deleteObligacionesL(id, propietarioId) {
        const obligacion = await this.getObligacionesLById(id, propietarioId); //
        const filePath = obligacion.archivoPath; //

        await obligacion.destroy(); //

        if (filePath) { //
            await fs.unlink(path.resolve(filePath)).catch(err => console.warn('No se pudo eliminar el archivo de la obligación legal:', err)); //
        }
        return { message: 'Obligación legal y archivo asociados eliminados exitosamente.' }; //
    }
}

export default new ObligacionesLService(); //