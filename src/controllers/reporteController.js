import db from '../models/index.js';
import cron from 'node-cron';
import { Op } from 'sequelize';
import { createCalendarEvent } from '../services/googleCalendarService.js'; // Importa el servicio de Google Calendar

// --- Lógica de Reporte Automático (código existente) ---

const generarContenidoReporteAutomatico = async () => {
    try {
        const vehiculosConTodo = await db.models.Vehiculo.findAll({
            include: [
                {
                    model: db.models.Propietario,
                    as: 'propietario',
                    attributes: ['nombre', 'identificacion']
                },
                {
                    model: db.models.Mantenimiento,
                    as: 'mantenimientos',
                    attributes: ['tipo', 'costo', 'fecha', 'fechaProximoMantenimiento']
                },
                {
                    model: db.models.ObligacionesL,
                    as: 'obligacionesLegales',
                    attributes: ['nombre', 'fechaVencimiento']
                }
            ],
            attributes: ['marca', 'placa', 'modelo', 'color']
        });

        const reporteData = vehiculosConTodo.map(vehiculo => {
            const propietario = vehiculo.propietario ? {
                nombre: vehiculo.propietario.nombre,
                cedula: vehiculo.propietario.identificacion
            } : null;

            const mantenimientos = vehiculo.mantenimientos.map(m => ({
                tipo: m.tipo,
                precio: m.costo,
                fecha: m.fecha.toISOString().split('T')[0],
                fechaProximoMantenimiento: m.fechaProximoMantenimiento ? m.fechaProximoMantenimiento.toISOString().split('T')[0] : null
            }));

            const obligaciones = vehiculo.obligacionesLegales.map(o => ({
                nombreDocumento: o.nombre,
                vigente: o.fechaVencimiento ? new Date(o.fechaVencimiento) >= new Date() : 'N/A'
            }));

            return {
                infoVehiculo: {
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
        console.error("Error al generar contenido del reporte automático:", error);
        throw new Error("No se pudo generar el contenido del reporte automático.");
    }
};

export const getReporteAutomatico = async (req, res) => {
    try {
        const reporte = await generarContenidoReporteAutomatico();
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

// Programación del Reporte Automático
cron.schedule('0 1 * * *', async () => { // Cada día a la 1:00 AM (America/Bogota)
    console.log('Iniciando generación de reporte automático programado...');
    try {
        const reporte = await generarContenidoReporteAutomatico();
        console.log('Reporte automático programado generado y procesado.');
    } catch (error) {
        console.error('Error durante la generación programada del reporte automático:', error);
    }
}, {
    scheduled: true,
    timezone: "America/Bogota"
});
console.log('Tarea de generación de reporte automático programada para ejecutarse diariamente a la 1:00 AM.');


// --- Lógica de Recordatorios de Obligaciones Legales por Google Calendar ---

const checkAndSendObligationReminders = async () => {
    console.log('Iniciando verificación de recordatorios de obligaciones legales...');
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Ahora busca todas las obligaciones cuya fecha de vencimiento sea hoy o en el futuro.
    try {
        const obligationsToRemind = await db.models.ObligacionesL.findAll({
            where: {
                fechaVencimiento: {
                    [Op.gte]: now // Mayor o igual que hoy (incluye futuras)
                }
            },
            include: [{
                model: db.models.Vehiculo,
                as: 'vehiculo',
                include: [{ model: db.models.Propietario, as: 'propietario', attributes: ['id', 'nombre'] }]
            }]
        });

        for (const obligation of obligationsToRemind) {
            // La condición para crear el evento es que la fecha de vencimiento sea hoy o en el futuro
            const fechaVencimiento = new Date(obligation.fechaVencimiento);
            fechaVencimiento.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación

            if (fechaVencimiento >= now) { // Solo si la fecha es hoy o en el futuro
                if (obligation.vehiculo && obligation.vehiculo.propietario && obligation.vehiculo.propietario.id) {
                    const summary = `Alarma Obligación: ${obligation.nombre} - ${obligation.vehiculo.placa}`;
                    const description = `¡Alarma! La obligación legal "${obligation.nombre}" para el vehículo ${obligation.vehiculo.placa} vence el ${obligation.fechaVencimiento.toISOString().split('T')[0]}. ¡No olvides renovarla!`;

                    // El evento se crea en la fecha de vencimiento
                    const eventStart = new Date(fechaVencimiento.getFullYear(), fechaVencimiento.getMonth(), fechaVencimiento.getDate(), 9, 0, 0); // Evento a las 9 AM
                    const eventEnd = new Date(fechaVencimiento.getFullYear(), fechaVencimiento.getMonth(), fechaVencimiento.getDate(), 10, 0, 0); // Termina a las 10 AM

                    // Recordatorios:
                    // 0 minutos: alarma en el momento del evento (9 AM del día de vencimiento)
                    // 60 * 24 minutos: alarma 24 horas antes del evento (9 AM del día anterior al vencimiento)
                    const reminderMinutes = [0, 60 * 24]; // [mismo día, un día antes]

                    await createCalendarEvent(
                        summary,
                        description,
                        eventStart,
                        eventEnd,
                        reminderMinutes
                    );
                    console.log(`Evento de Google Calendar creado para recordatorio de obligación: ${summary}`);
                }
            } else {
                console.log(`DEBUG: No se creó evento de calendario para obligación ${obligation.id}. Fecha ${obligation.fechaVencimiento} es anterior a hoy.`);
            }
        }
        console.log('Verificación de recordatorios de obligaciones legales completada.');

    } catch (error) {
        console.error("Error al verificar y enviar recordatorios de obligaciones legales:", error);
    }
};

// Programar la ejecución de los recordatorios (ejemplo: cada día a las 2:00 AM - después del reporte automático)
cron.schedule('0 2 * * *', checkAndSendObligationReminders, {
    scheduled: true,
    timezone: "America/Bogota"
});
console.log('Tarea de recordatorios de obligaciones legales programada para ejecutarse diariamente a las 2:00 AM.');


// --- Lógica de Reporte Manual con Filtros (código actualizado) ---
export const generarReporteManual = async (req, res) => { // Eliminado 'const' duplicado
    try {
        const propietarioId = req.user.id;

        const {
            mantenimientoTipo,
            mantenimientoFechaInicio,
            mantenimientoFechaFin,
            obligacionVigente,
            vehiculoPlaca,
            vehiculoMarca
        } = req.query;

        const vehiculoWhere = { propietarioId };
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
            now.setHours(0, 0, 0, 0);
            if (obligacionVigente === 'true') {
                obligacionWhere.fechaVencimiento = { [Op.gte]: now };
            } else if (obligacionVigente === 'false') {
                obligacionWhere.fechaVencimiento = { [Op.lt]: now };
            }
        }

        const vehiculosFiltrados = await db.models.Vehiculo.findAll({
            where: vehiculoWhere,
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
                    attributes: ['tipo', 'costo', 'fecha', 'fechaProximoMantenimiento']
                },
                {
                    model: db.models.ObligacionesL,
                    as: 'obligacionesLegales',
                    where: Object.keys(obligacionWhere).length > 0 ? obligacionWhere : undefined,
                    attributes: ['nombre', 'fechaVencimiento']
                }
            ]
        });

        const reporteData = vehiculosFiltrados.map(vehiculo => {
            const propietario = vehiculo.propietario ? {
                nombre: vehiculo.propietario.nombre,
                cedula: vehiculo.propietario.identificacion
            } : null;

            const mantenimientos = vehiculo.mantenimientos.map(m => ({
                tipo: m.tipo,
                precio: m.costo,
                fecha: m.fecha.toISOString().split('T')[0],
                fechaProximoMantenimiento: m.fechaProximoMantenimiento ? m.fechaProximoMantenimiento.toISOString().split('T')[0] : null
            }));

            const obligaciones = vehiculo.obligacionesLegales.map(o => ({
                nombreDocumento: o.nombre,
                vigente: o.fechaVencimiento ? new Date(o.fechaVencimiento) >= new Date() : 'N/A'
            }));

            return {
                infoVehiculo: {
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

        res.status(200).json({
            message: "Reporte manual generado exitosamente.",
            filters: req.query,
            data: {
                fechaGeneracion: new Date().toISOString(),
                reporte: reporteData
            }
        });

    } catch (error) {
        console.error("Error al generar reporte manual:", error);
        res.status(500).json({
            message: "Error al generar el reporte manual.",
            error: error.message
        });
    }
};