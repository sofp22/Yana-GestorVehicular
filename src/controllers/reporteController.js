import db from '../models/index.js';
import cron from 'node-cron';
import { Op } from 'sequelize';
import { createCalendarEvent } from '../services/googleCalendarService.js'; // Importa el servicio de Google Calendar

// --- Función auxiliar para obtener y formatear datos de vehículos para los reportes ---
// Esta función es reutilizada por los reportes automáticos y manuales.
const getVehiclesReportData = async (filters = {}) => {
    try {
        const {
            propietarioId, // Para filtrar por un propietario específico (usado en reportes manuales)
            mantenimientoTipo,
            mantenimientoFechaInicio,
            mantenimientoFechaFin,
            obligacionVigente,
            vehiculoPlaca,
            vehiculoMarca
        } = filters;

        const vehiculoWhere = {};
        if (propietarioId) vehiculoWhere.propietarioId = propietarioId;
        if (vehiculoPlaca) vehiculoWhere.placa = { [Op.iLike]: `%${vehiculoPlaca}%` };
        if (vehiculoMarca) vehiculoWhere.marca = { [Op.iLike]: `%${vehiculoMarca}%` };

        const mantenimientoWhere = {};
        if (mantenimientoTipo) mantenimientoWhere.tipo = { [Op.iLike]: `%${mantenimientoTipo}%` };
        if (mantenimientoFechaInicio && mantenimientoFechaFin) {
            mantenimientoWhere.fecha = {
                [Op.between]: [new Date(mantenimientoFechaInicio), new Date(mantenimientoFechaFin)]
            };
        } else if (mantenimientoFechaInicio) {
            mantenimientoWhere.fecha = { [Op.gte]: new Date(mantenimientoFechaInicio) };
        } else if (mantenimientoFechaFin) {
            mantenimientoWhere.fecha = { [Op.lte]: new Date(mantenimientoFechaFin) };
        }

        const obligacionWhere = {};
        if (obligacionVigente !== undefined) {
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación
            if (obligacionVigente === 'true') {
                obligacionWhere.fechaVencimiento = { [Op.gte]: now }; // Vencimiento hoy o en el futuro
            } else if (obligacionVigente === 'false') {
                obligacionWhere.fechaVencimiento = { [Op.lt]: now }; // Vencimiento en el pasado
            }
        }

        // Consulta principal para obtener los vehículos con sus relaciones
        const vehiculosConTodo = await db.models.Vehiculo.findAll({
            where: Object.keys(vehiculoWhere).length > 0 ? vehiculoWhere : undefined,
            include: [
                {
                    model: db.models.Propietario,
                    as: 'propietario',
                    attributes: ['nombre', 'identificacion']
                },
                {
                    model: db.models.Mantenimiento,
                    as: 'mantenimientos',
                    where: Object.keys(mantenimientoWhere).length > 0 ? mantenimientoWhere : undefined,
                    required: Object.keys(mantenimientoWhere).length > 0, // Usar INNER JOIN si hay filtros de mantenimiento
                    // Se eliminó 'fechaProximoMantenimiento' de los atributos porque no existe en la DB.
                    attributes: ['id', 'tipo', 'costo', 'fecha']
                },
                {
                    model: db.models.ObligacionesL,
                    as: 'obligacionesLegales',
                    where: Object.keys(obligacionWhere).length > 0 ? obligacionWhere : undefined,
                    required: Object.keys(obligacionWhere).length > 0, // Usar INNER JOIN si hay filtros de obligación
                    attributes: ['id', 'nombre', 'fechaVencimiento']
                }
            ],
            attributes: ['id', 'marca', 'placa', 'modelo', 'color']
        });

        // Mapeo y formateo de los datos para el reporte
        const reporteData = vehiculosConTodo.map(vehiculo => {
            const propietario = vehiculo.propietario ? {
                nombre: vehiculo.propietario.nombre,
                cedula: vehiculo.propietario.identificacion
            } : null;

            const mantenimientos = vehiculo.mantenimientos.map(m => ({
                id: m.id,
                tipo: m.tipo,
                precio: m.costo,
                // Convierte 'm.fecha' a Date antes de llamar a toISOString()
                fecha: m.fecha ? new Date(m.fecha).toISOString().split('T')[0] : null
                // Se eliminó 'fechaProximoMantenimiento' del mapeo.
            }));

            const obligaciones = vehiculo.obligacionesLegales.map(o => {
                // Convierte 'o.fechaVencimiento' a Date antes de llamar a toISOString()
                const fechaVencimientoObj = o.fechaVencimiento ? new Date(o.fechaVencimiento) : null;
                return {
                    id: o.id,
                    nombreDocumento: o.nombre,
                    fechaVencimiento: fechaVencimientoObj ? fechaVencimientoObj.toISOString().split('T')[0] : null,
                    // Determina la vigencia como un booleano
                    vigente: fechaVencimientoObj ? fechaVencimientoObj >= new Date() : false
                };
            });

            return {
                infoVehiculo: {
                    id: vehiculo.id,
                    marca: vehiculo.marca,
                    placa: vehiculo.placa,
                    modelo: vehiculo.modelo,
                    color: vehiculo.color
                },
                infoPropietario: propietario,
                mantenimientos,
                obligacionesLegales: obligaciones
            };
        });

        return {
            fechaGeneracion: new Date().toISOString(),
            reporte: reporteData
        };

    } catch (error) {
        console.error("Error en getVehiclesReportData:", error);
        throw error; // Re-lanzar el error para que el controlador lo maneje
    }
};

// --- Lógica de Reporte Automático ---

export const getReporteAutomatico = async (req, res) => {
    try {
        // Llama a la función auxiliar sin filtros para obtener todos los datos
        const reporte = await getVehiclesReportData();
        res.status(200).json({
            message: "Reporte automático generado exitosamente.",
            data: reporte
        });
    } catch (error) {
        console.error("Error en getReporteAutomatico:", error);
        res.status(500).json({
            message: "Error al generar el reporte automático.",
            error: error.message
        });
    }
};

// Programación del Reporte Automático diario a la 1:00 AM
cron.schedule('0 1 * * *', async () => {
    console.log('Iniciando generación de reporte automático programado...');
    try {
        // Solo genera el reporte, no hay un consumidor directo en este cron job que espere la respuesta HTTP
        await getVehiclesReportData();
        console.log('Reporte automático programado generado y procesado.');
    } catch (error) {
        console.error('Error durante la generación programada del reporte automático:', error);
    }
}, {
    scheduled: true,
    timezone: "America/Bogota" // Asegura que se ejecuta en la zona horaria correcta
});
console.log('Tarea de generación de reporte automático programada para ejecutarse diariamente a la 1:00 AM.');


// --- Lógica de Recordatorios de Obligaciones Legales por Google Calendar ---

const checkAndSendObligationReminders = async () => {
    console.log('Iniciando verificación de recordatorios de obligaciones legales...');
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación

    try {
        const obligationsToRemind = await db.models.ObligacionesL.findAll({
            where: {
                fechaVencimiento: {
                    [Op.gte]: now // Busca obligaciones cuya fecha de vencimiento sea hoy o en el futuro
                }
            },
            include: [{
                model: db.models.Vehiculo,
                as: 'vehiculo',
                // Incluye el email del propietario, crucial para el servicio de Google Calendar
                include: [{ model: db.models.Propietario, as: 'propietario', attributes: ['id', 'nombre', 'email'] }]
            }]
        });

        for (const obligation of obligationsToRemind) {
            // Convierte la fecha de la base de datos a un objeto Date de JS.
            // Esto es vital si Sequelize no lo hace automáticamente o si el tipo en DB es STRING.
            const fechaVencimientoFromDB = obligation.fechaVencimiento;
            const fechaVencimiento = fechaVencimientoFromDB ? new Date(fechaVencimientoFromDB) : null;

            if (!fechaVencimiento || isNaN(fechaVencimiento.getTime())) { // Comprueba si es nula o inválida
                console.log(`DEBUG: Obligación ${obligation.id} tiene fechaVencimiento nula o inválida, saltando recordatorio.`);
                continue; // Salta esta iteración si la fecha no es válida
            }

            fechaVencimiento.setHours(0, 0, 0, 0); // Normalizar a medianoche

            // Solo crea el evento si la obligación no ha vencido aún (fechaVencimiento es hoy o en el futuro)
            if (fechaVencimiento >= now) {
                // Asegurarse de que tenemos un propietario y su email para enviar el recordatorio
                if (obligation.vehiculo && obligation.vehiculo.propietario && obligation.vehiculo.propietario.id && obligation.vehiculo.propietario.email) {
                    const summary = `Alarma Obligación: ${obligation.nombre} - ${obligation.vehiculo.placa}`;
                    const description = `¡Alarma! La obligación legal "${obligation.nombre}" para el vehículo ${obligation.vehiculo.placa} vence el ${fechaVencimiento.toISOString().split('T')[0]}. ¡No olvides renovarla!`;

                    // El evento se crea en la fecha de vencimiento a las 9 AM
                    const eventStart = new Date(fechaVencimiento.getFullYear(), fechaVencimiento.getMonth(), fechaVencimiento.getDate(), 9, 0, 0);
                    const eventEnd = new Date(fechaVencimiento.getFullYear(), fechaVencimiento.getMonth(), fechaVencimiento.getDate(), 10, 0, 0);

                    // Recordatorios: uno en el momento del evento, otro un día antes (en minutos)
                    const reminderMinutes = [0, 60 * 24]; // [mismo día, un día antes]

                    await createCalendarEvent(
                        summary,
                        description,
                        eventStart,
                        eventEnd,
                        reminderMinutes,
                        obligation.vehiculo.propietario.email // Pasa el email del propietario para el evento
                    );
                    console.log(`Evento de Google Calendar creado para recordatorio de obligación: "${summary}" para ${obligation.vehiculo.propietario.email}`);
                } else {
                    console.warn(`Advertencia: No se pudo crear evento de calendario para obligación ${obligation.id}. Falta información completa del propietario o su email.`);
                }
            } else {
                console.log(`DEBUG: No se creó evento de calendario para obligación ${obligation.id}. Fecha ${fechaVencimiento.toISOString().split('T')[0]} es anterior a hoy.`);
            }
        }
        console.log('Verificación de recordatorios de obligaciones legales completada.');

    } catch (error) {
        console.error("Error al verificar y enviar recordatorios de obligaciones legales:", error);
    }
};

// Programar la ejecución de los recordatorios diariamente a las 2:00 AM (después del reporte automático)
cron.schedule('0 2 * * *', checkAndSendObligationReminders, {
    scheduled: true,
    timezone: "America/Bogota"
});
console.log('Tarea de recordatorios de obligaciones legales programada para ejecutarse diariamente a las 2:00 AM.');


// --- Lógica de Reporte Manual con Filtros ---
export const generarReporteManual = async (req, res) => {
    try {
        const propietarioId = req.user.id; // Obtiene el ID del propietario desde el token de autenticación

        // Recopila los parámetros de consulta (filtros)
        const filters = {
            propietarioId: propietarioId, // Siempre filtra por el propietario logueado
            mantenimientoTipo: req.query.mantenimientoTipo,
            mantenimientoFechaInicio: req.query.mantenimientoFechaInicio,
            mantenimientoFechaFin: req.query.mantenimientoFechaFin,
            obligacionVigente: req.query.obligacionVigente,
            vehiculoPlaca: req.query.vehiculoPlaca,
            vehiculoMarca: req.query.vehiculoMarca
        };

        // Llama a la función auxiliar con los filtros específicos del usuario
        const reporte = await getVehiclesReportData(filters);

        res.status(200).json({
            message: "Reporte manual generado exitosamente.",
            filters: req.query, // Muestra los filtros que se aplicaron
            data: reporte
        });

    } catch (error) {
        console.error("Error al generar reporte manual:", error);
        res.status(500).json({
            message: "Error al generar el reporte manual.",
            error: error.message
        });
    }
};