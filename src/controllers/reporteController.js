import db from '../models/index.js';
import cron from 'node-cron'; // Para los reportes automáticos
import { Op } from 'sequelize'; // Para operadores de Sequelize en filtros

// --- Lógica de Reporte Automático ---

const generarContenidoReporteAutomatico = async () => {
    try {
        // Incluye las asociaciones para obtener todos los datos necesarios en una sola consulta
        const vehiculosConTodo = await db.models.Vehiculo.findAll({
            include: [
                {
                    model: db.models.Propietario,
                    attributes: ['nombre', 'identificacion'] 
                },
                {
                    model: db.models.Mantenimiento,
                    attributes: ['tipo', 'costo', 'fecha'] 
                },
                {
                    model: db.models.ObligacionesL,
                    attributes: ['nombre', 'fechaVencimiento'] 
                }
            ],
            attributes: ['marca', 'placa', 'modelo', 'color'] 
        });

        // Formatear la información para el reporte
        const reporteData = vehiculosConTodo.map(vehiculo => {
            const propietario = vehiculo.Propietario ? {
                nombre: vehiculo.Propietario.nombre,
                cedula: vehiculo.Propietario.identificacion
            } : null;

            const mantenimientos = vehiculo.Mantenimientos.map(m => ({
                tipo: m.tipo,
                precio: m.costo,
                fecha: m.fecha.toISOString().split('T')[0] // Formato YYYY-MM-DD
            }));

            const obligaciones = vehiculo.ObligacionesLs.map(o => ({
                nombreDocumento: o.nombre,
                vigente: o.fechaVencimiento ? new Date(o.fechaVencimiento) >= new Date() : 'N/A' // Valida vigencia
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

// --- Endpoint para Reporte Automático (suele ser interno o activado por un cron job externo) ---
// Aunque el usuario pidió un GET /automaticos, en un entorno real, la generación automática
// no se activa por una llamada HTTP GET, sino por un scheduler.
// Dejo el endpoint para la demostración si se quiere activar manualmente.
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

// --- Programación del Reporte Automático (usando node-cron) ---
// Por ejemplo: cada día a la 1:00 AM
cron.schedule('0 1 * * *', async () => {
    console.log('Iniciando generación de reporte automático programado...');
    try {
        const reporte = await generarContenidoReporteAutomatico();
        // Aquí puedes añadir lógica para guardar el reporte en un archivo,
        // enviarlo por email, subirlo a un servicio de almacenamiento, etc.
        console.log('Reporte automático programado generado y procesado.');
        // Puedes loguear el reporte o su destino para depuración
        // console.log(JSON.stringify(reporte, null, 2));
    } catch (error) {
        console.error('Error durante la generación programada del reporte automático:', error);
    }
}, {
    scheduled: true,
    timezone: "America/Bogota" 
});
console.log('Tarea de generación de reporte automático programada para ejecutarse diariamente');

// --- Lógica de Reporte Manual con Filtros ---
export const generarReporteManual = async (req, res) => {
    try {
        // El ID del propietario se obtiene del token JWT, ya que la ruta estará protegida
        const propietarioId = req.user.id;

        // Parámetros de filtro desde la query string (ej. /reportes/manuales?mantenimientoTipo=...)
        const {
            mantenimientoTipo,
            mantenimientoFechaInicio,
            mantenimientoFechaFin,
            obligacionVigente, // 'true' o 'false'
            vehiculoPlaca,
            vehiculoMarca,
            propietarioNombre // Aunque el reporte es para el propietario logueado, se puede mantener para consistencia si se extendiera
        } = req.query;

        // Construir condiciones de consulta dinámicamente
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
            if (obligacionVigente === 'true') {
                obligacionWhere.fechaVencimiento = { [Op.gte]: now };
            } else if (obligacionVigente === 'false') {
                obligacionWhere.fechaVencimiento = { [Op.lt]: now };
            }
        }


        // Consulta los vehículos del propietario logueado con sus asociaciones y filtros
        const vehiculosFiltrados = await db.models.Vehiculo.findAll({
            where: vehiculoWhere,
            include: [
                {
                    model: db.models.Propietario,
                    attributes: ['nombre', 'identificacion'],
                    // Si se permitiera filtrar por nombre de propietario, aquí iría la condición
                    // where: propietarioNombre ? { nombre: { [Op.iLike]: `%${propietarioNombre}%` } } : {}
                },
                {
                    model: db.models.Mantenimiento,
                    where: mantenimientoWhere,
                    attributes: ['tipo', 'costo', 'fecha']
                },
                {
                    model: db.models.ObligacionesL,
                    where: obligacionWhere,
                    attributes: ['nombre', 'fechaVencimiento']
                }
            ]
        });

        // Formatear la información del reporte manual
        const reporteData = vehiculosFiltrados.map(vehiculo => {
            const propietario = vehiculo.Propietario ? {
                nombre: vehiculo.Propietario.nombre,
                cedula: vehiculo.Propietario.identificacion
            } : null;

            const mantenimientos = vehiculo.Mantenimientos.map(m => ({
                tipo: m.tipo,
                precio: m.costo,
                fecha: m.fecha.toISOString().split('T')[0]
            }));

            const obligaciones = vehiculo.ObligacionesLs.map(o => ({
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