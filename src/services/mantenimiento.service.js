// src/services/mantenimiento.service.js
import db from '../models/index.js';
import path from 'path';
import fs from 'fs/promises'; // Usa la versión de promesas para async/await
import { v4 as uuidv4 } from 'uuid';
import { createCalendarEvent } from '../services/googleCalendarService.js'; 

const Mantenimiento = db.models.Mantenimiento;
const Vehiculo = db.models.Vehiculo;
const Propietario = db.models.Propietario;
const TallerMecanico = db.models.TallerMecanico;

// Definir la ruta base para guardar los archivos en el servidor
const UPLOADS_DIR_SERVER = path.resolve('src/uploads/mantenimientos'); 
const UPLOADS_DIR_PUBLIC = '/uploads/mantenimientos'; 

// --- Helper para verificar si un archivo existe y eliminarlo ---
const unlinkFileIfExists = async (filePath) => {
    if (!filePath) return; // No hacer nada si no hay ruta
    try {
        // filePath aquí es la ruta pública, necesitamos la ruta de servidor para fs
        const serverFilePath = path.join(UPLOADS_DIR_SERVER, path.basename(filePath));
        await fs.access(serverFilePath); // Verifica si el archivo existe
        await fs.unlink(serverFilePath); // Si existe, elimínalo
        console.log(`Archivo eliminado correctamente: ${serverFilePath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`Advertencia: Intento de eliminar archivo no existente: ${filePath}`);
        } else {
            console.error(`Error al eliminar archivo ${filePath}:`, error);
        }
    }
};

// --- Helper para crear evento de Google Calendar para recordatorio de próximo mantenimiento ---
const checkAndSendNextMaintenanceReminder = async (mantenimiento, vehiculoId) => {
    // Usa mantenimiento.fechaVencimiento que es el nombre del campo en el modelo.
    if (mantenimiento.fechaVencimiento) {
        const nextMaintenanceDate = new Date(mantenimiento.fechaVencimiento);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación de fecha
        nextMaintenanceDate.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación de fecha

        // Solo crea el evento si la fecha de vencimiento es hoy o en el futuro
        if (nextMaintenanceDate >= today) {
            try {
                const vehiculo = await Vehiculo.findByPk(vehiculoId, {
                    include: [{ model: Propietario, as: 'propietario' }]
                });

                if (vehiculo && vehiculo.propietario) {
                    const summary = `Recordatorio Mantenimiento: ${mantenimiento.tipo} - ${vehiculo.placa}`;
                    const description = `El mantenimiento "${mantenimiento.tipo}" para su vehículo ${vehiculo.placa} (${vehiculo.marca} ${vehiculo.modelo}) está programado para el ${mantenimiento.fechaVencimiento.toISOString().split('T')[0]}. Kilometraje actual: ${mantenimiento.kilometraje}.`;

                    // Establecer horas predeterminadas para el evento (ej: 9 AM)
                    const eventStart = new Date(nextMaintenanceDate.getFullYear(), nextMaintenanceDate.getMonth(), nextMaintenanceDate.getDate(), 9, 0, 0);
                    const eventEnd = new Date(nextMaintenanceDate.getFullYear(), nextMaintenanceDate.getMonth(), nextMaintenanceDate.getDate(), 10, 0, 0);

                    const reminderMinutes = [0, 60 * 24]; // 0 minutos (al inicio del evento) y 24 horas antes

                    await createCalendarEvent(
                        summary,
                        description,
                        eventStart,
                        eventEnd,
                        reminderMinutes
                    );
                    console.log(`Evento de Google Calendar creado para recordatorio de próximo mantenimiento: ${summary}`);
                }
            } catch (error) {
                console.error("Error al crear evento de Google Calendar para recordatorio de próximo mantenimiento:", error);
                // No lanzamos el error para no detener el flujo principal del mantenimiento
            }
        } else {
            console.log(`DEBUG: No se creó evento de calendario para mantenimiento ${mantenimiento.id}. Fecha ${mantenimiento.fechaVencimiento} es anterior a hoy.`);
        }
    }
};

class MantenimientoService {
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
                where: { propietarioId: propietarioId }, 
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

        const vehiculo = await Vehiculo.findOne({ where: { id: vehiculoId, propietarioId: propietarioId } });
        if (!vehiculo) {
            throw { status: 403, message: 'No tiene permiso para agregar mantenimientos a este vehículo.' };
        }

        let publicFilePath = null;
        let serverFilePath = null; 
        if (file) {
            await fs.mkdir(UPLOADS_DIR_SERVER, { recursive: true });
            const fileName = `${vehiculoId}-${uuidv4()}-${file.originalname}`;
            serverFilePath = path.join(UPLOADS_DIR_SERVER, fileName);
            await fs.writeFile(serverFilePath, file.buffer); 
            publicFilePath = path.join(UPLOADS_DIR_PUBLIC, fileName); 
        }

        try {
            // Aquí, el controlador ya debería haber mapeado fechaProximoMantenimiento a fechaVencimiento
            // en mantenimientoData. Sin embargo, para ser súper seguro, si aún esperas
            // fechaProximoMantenimiento, asegúrate de que se asigne a fechaVencimiento.
            // Si fechaVencimiento no se envía o es null, la base de datos lo rechazará
            // si tiene la restricción NOT NULL.
            const dataToCreate = { ...mantenimientoData, facturaPath: publicFilePath, vehiculoId: vehiculoId };

            // Si tu DB NO PERMITE NULOS para fechaVencimiento y a veces llega nulo/undefined,
            // DEBES asignar un valor por defecto aquí para evitar el error de DB.
            // Si tu DB SÍ PERMITE NULOS, puedes eliminar esta parte o mantenerla con 'null' si viene null.
            if (dataToCreate.fechaVencimiento === undefined || dataToCreate.fechaVencimiento === null) {
                // Si la columna `fechaVencimiento` en tu DB es NOT NULL, debes darle un valor.
                // Si tu modelo Sequelize tiene `allowNull: true` pero la DB no se ha actualizado,
                // ESTO es lo que te salvará del error 23502 sin migrar la DB.
                dataToCreate.fechaVencimiento = new Date('9999-12-31'); // Un valor por defecto "seguro"
            }

            const newMantenimiento = await Mantenimiento.create(dataToCreate);

            await checkAndSendNextMaintenanceReminder(newMantenimiento, vehiculoId);

            return newMantenimiento;
        } catch (error) {
            if (serverFilePath) { 
                await unlinkFileIfExists(publicFilePath); 
            }
            throw error;
        }
    }

    async createMantenimientoByWorkshop(mantenimientoData, file) {
        const { vehiculoId, nitOCedulaTaller } = mantenimientoData;

        const vehiculoExistente = await Vehiculo.findByPk(vehiculoId);
        if (!vehiculoExistente) {
            throw { status: 404, message: "Vehículo no encontrado para este token." };
        }

        let tallerMecanico = await TallerMecanico.findOne({
            where: { nitOCedula: nitOCedulaTaller }
        });

        if (!tallerMecanico) {
            tallerMecanico = await TallerMecanico.create({
                nitOCedula: nitOCedulaTaller,
                nombre: `Taller ${nitOCedulaTaller}` 
            });
            console.log(`Nuevo taller mecánico registrado: ${tallerMecanico.nombre}`);
        }

        let publicFilePath = null;
        let serverFilePath = null; 
        if (file) {
            await fs.mkdir(UPLOADS_DIR_SERVER, { recursive: true });
            const fileName = `${vehiculoId}-${uuidv4()}-${file.originalname}`;
            serverFilePath = path.join(UPLOADS_DIR_SERVER, fileName);
            await fs.writeFile(serverFilePath, file.buffer);
            publicFilePath = path.join(UPLOADS_DIR_PUBLIC, fileName);
        }

        try {
            // Aquí, el controlador ya ha mapeado 'fechaProximoMantenimiento' del body a 'fechaVencimiento'
            // en el objeto `mantenimientoData`.
            // Nos aseguramos de que `fechaVencimiento` tenga un valor si la DB no permite nulos.
            const dataToCreate = {
                ...mantenimientoData,
                facturaPath: publicFilePath,
                vehiculoId: vehiculoId,
                tallerMecanicoId: tallerMecanico.id 
            };

            // Eliminar campos que no son parte del modelo Mantenimiento si los pasaste accidentalmente
            delete dataToCreate.nitOCedulaTaller; 
            // Si el controlador pasa 'fechaProximoMantenimiento' en lugar de 'fechaVencimiento'
            // y no lo mapea, podrías necesitar una línea como:
            // dataToCreate.fechaVencimiento = dataToCreate.fechaProximoMantenimiento || null;
            // delete dataToCreate.fechaProximoMantenimiento;

            // --- CLAVE PARA EVITAR EL ERROR `NOT NULL` SIN MIGRAR LA DB ---
            // Si la columna `fechaVencimiento` en tu DB es NOT NULL, debes darle un valor
            // si el formulario no lo envía o lo envía nulo.
            // Si tu modelo Sequelize tiene `allowNull: true` pero la DB no se ha actualizado,
            // ESTO es lo que te salvará del error 23502.
            if (dataToCreate.fechaVencimiento === undefined || dataToCreate.fechaVencimiento === null) {
                dataToCreate.fechaVencimiento = new Date('9999-12-31'); // Un valor por defecto "seguro"
                // Considera una fecha más apropiada para tu lógica si '9999-12-31' no es adecuada.
                // Por ejemplo, `new Date(dataToCreate.fecha.getFullYear() + 1, dataToCreate.fecha.getMonth(), dataToCreate.fecha.getDate())`
                // si el próximo mantenimiento es un año después por defecto.
            }
            // --- FIN CLAVE ---


            const newMantenimiento = await Mantenimiento.create(dataToCreate);

            await checkAndSendNextMaintenanceReminder(newMantenimiento, vehiculoId);

            return {
                mantenimiento: newMantenimiento,
                tallerMecanico: {
                    id: tallerMecanico.id,
                    nombre: tallerMecanico.nombre,
                    nitOCedula: tallerMecanico.nitOCedula
                }
            };
        } catch (error) {
            if (serverFilePath) { 
                await unlinkFileIfExists(publicFilePath); 
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
        } else if (mantenimientoData.facturaPath === null) { 
            mantenimientoData.facturaPath = null;
        }

        try {
             // --- CLAVE PARA EVITAR EL ERROR `NOT NULL` SIN MIGRAR LA DB EN UPDATES ---
            // Si la columna `fechaVencimiento` en tu DB es NOT NULL y se intenta actualizar a NULL,
            // pero no quieres migrar, debes darle un valor por defecto si llega null/undefined.
            if (mantenimientoData.fechaVencimiento === undefined || mantenimientoData.fechaVencimiento === null) {
                // Si se está actualizando y se manda null, y la DB no permite null,
                // aquí deberías decidir qué hacer:
                // 1. Omitir la actualización de fechaVencimiento: delete mantenimientoData.fechaVencimiento;
                //    Esto mantendrá el valor existente en la DB.
                // 2. Establecer un valor por defecto: mantenimientoData.fechaVencimiento = new Date('9999-12-31');
                //    Esto cambiará el valor a la fecha por defecto.
                // Elijo la opción 1 (omitir) para actualizaciones si no se provee un valor.
                delete mantenimientoData.fechaVencimiento; 
            }
            // --- FIN CLAVE ---

            await mantenimiento.update(mantenimientoData);

            if (oldFacturaPath && (newPublicFilePath || mantenimientoData.facturaPath === null)) {
                await unlinkFileIfExists(oldFacturaPath); 
            }

            await checkAndSendNextMaintenanceReminder(mantenimiento, mantenimiento.vehiculoId);

            return mantenimiento;
        } catch (error) {
            if (newServerFilePath) { 
                await unlinkFileIfExists(newPublicFilePath); 
            }
            throw error;
        }
    }

    async deleteMantenimiento(id, propietarioId) {
        const mantenimiento = await this.getMantenimientoById(id, propietarioId);
        const publicFilePathToDelete = mantenimiento.facturaPath;

        await mantenimiento.destroy();

        if (publicFilePathToDelete) {
            await unlinkFileIfExists(publicFilePathToDelete); 
        }
        return { message: 'Mantenimiento y archivo asociado eliminados exitosamente.' };
    }
}

export default new MantenimientoService();