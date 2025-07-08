import db from '../models/index.js';
import { validateQrToken } from './qrController.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import { createCalendarEvent } from '../services/googleCalendarService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Multer para la carga de facturas de mantenimiento
const storageMantenimiento = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/mantenimientos');
        // Asegúrate de que la carpeta existe o créala
        // import fs from 'fs';
        // if (!fs.existsSync(uploadPath)) {
        //     fs.mkdirSync(uploadPath, { recursive: true });
        // }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // El nombre de archivo que se guardará en el disco (ej. 1719876543210-mi_factura.pdf)
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

export const uploadMantenimientoFactura = multer({ storage: storageMantenimiento });

// --- Helper para crear evento de Google Calendar para recordatorio de próximo mantenimiento ---
const checkAndSendNextMaintenanceReminder = async (mantenimiento, vehiculoId) => {
    // Solo si hay una fecha de próximo mantenimiento definida
    if (mantenimiento.fechaVencimiento) {
        const nextMaintenanceDate = new Date(mantenimiento.fechaVencimiento);
        const today = new Date();

        // Ajustar fechas a medianoche para comparación solo de día, mes, año
        today.setHours(0, 0, 0, 0);
        nextMaintenanceDate.setHours(0, 0, 0, 0);

        // La condición ahora es que la fecha del próximo mantenimiento sea hoy o en el futuro.
        if (nextMaintenanceDate >= today) { // Solo si la fecha es hoy o en el futuro
            try {
                const vehiculo = await db.models.Vehiculo.findByPk(vehiculoId, {
                    include: [{ model: db.models.Propietario, as: 'propietario' }]
                });

                if (vehiculo && vehiculo.propietario) {
                    const summary = `Recordatorio Mantenimiento: ${mantenimiento.tipo} - ${vehiculo.placa}`;
                    const description = `El mantenimiento "${mantenimiento.tipo}" para su vehículo ${vehiculo.placa} (${vehiculo.marca} ${vehiculo.modelo}) está programado para el ${mantenimiento.fechaVencimiento.toISOString().split('T')[0]}. Kilometraje actual: ${mantenimiento.kilometraje}.`;

                    // El evento se crea en la fecha de vencimiento/próximo mantenimiento
                    const eventStart = new Date(nextMaintenanceDate.getFullYear(), nextMaintenanceDate.getMonth(), nextMaintenanceDate.getDate(), 9, 0, 0); // Evento a las 9 AM
                    const eventEnd = new Date(nextMaintenanceDate.getFullYear(), nextMaintenanceDate.getMonth(), nextMaintenanceDate.getDate(), 10, 0, 0); // Termina a las 10 AM

                    // Recordatorios:
                    // 0 minutos: alarma en el momento del evento (9 AM del día del mantenimiento)
                    // 60 * 24 minutos: alarma 24 horas antes del evento (9 AM del día anterior al mantenimiento)
                    const reminderMinutes = [0, 60 * 24]; // [mismo día, un día antes]

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
            }
        } else {
            console.log(`DEBUG: No se creó evento de calendario para mantenimiento ${mantenimiento.id}. Fecha ${mantenimiento.fechaVencimiento} es anterior a hoy.`);
        }
    }
};



// CREATE Mantenimiento por Propietario (protegida por JWT)
export const createMantenimiento = async (req, res) => {
    try {
        const { vehiculoId, tipo, fecha, kilometraje, descripcion, costo, fechaProximoMantenimiento } = req.body;
        
        // req.file.filename es el nombre único que Multer le dio al archivo guardado (ej. 1719876543210-original.pdf)
        const facturaPath = req.file ? `/uploads/mantenimientos/${req.file.filename}` : null;

        const vehiculoExistente = await db.models.Vehiculo.findOne({
            where: { id: vehiculoId, propietarioId: req.user.id }
        });

        if (!vehiculoExistente) {
            return res.status(404).json({ message: "Vehículo no encontrado o no pertenece al propietario logueado." });
        }

        const newMantenimiento = await db.models.Mantenimiento.create({
            vehiculoId,
            tipo,
            fecha,
            kilometraje,
            descripcion,
            costo,
            facturaPath, 
            fechaVencimiento: fechaVencimiento || null
        });

    
        await checkAndSendNextMaintenanceReminder(newMantenimiento, vehiculoId);

        res.status(201).json({ message: "Mantenimiento creado exitosamente por propietario", mantenimiento: newMantenimiento });

    } catch (error) {
        console.error("Error al crear mantenimiento por propietario:", error);
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// CREATE Mantenimiento por Taller Mecánico (NO protegida por JWT)
export const createMantenimientoByWorkshop = async (req, res) => {
    try {
        const { token } = req.query;
        const { nitOCedulaTaller, tipo, fecha, kilometraje, descripcion, costo, fechaVencimiento } = req.body;
    
        const facturaPath = req.file ? `/uploads/mantenimientos/${req.file.filename}` : null;

        const tokenInfo = validateQrToken(token);
        if (!tokenInfo) {
            return res.status(401).json({ message: "Token de QR inválido o expirado." });
        }
        const vehiculoId = tokenInfo.vehiculoId;

        const vehiculoExistente = await db.models.Vehiculo.findByPk(vehiculoId);
        if (!vehiculoExistente) {
            return res.status(404).json({ message: "Vehículo no encontrado para este token." });
        }

        let tallerMecanico = await db.models.TallerMecanico.findOne({
            where: { nitOCedula: nitOCedulaTaller }
        });

        if (!tallerMecanico) {
            
            tallerMecanico = await db.models.TallerMecanico.create({
                nitOCedula: nitOCedulaTaller,
                nombre: `Taller ${nitOCedulaTaller}`
            });
            console.log(`Nuevo taller mecánico registrado: ${tallerMecanico.nombre}`);
        }

        const newMantenimiento = await db.models.Mantenimiento.create({
            vehiculoId,
            tallerMecanicoId: tallerMecanico.id,
            tipo,
            fecha,
            kilometraje,
            descripcion,
            costo,
            facturaPath, 
            fechaVencimiento: fechaVencimiento || null
        });

        // Envía recordatorio si aplica al crear (por taller)
        await checkAndSendNextMaintenanceReminder(newMantenimiento, vehiculoId);

        res.status(201).json({
            message: "Mantenimiento registrado exitosamente por taller mecánico",
            mantenimiento: newMantenimiento,
            tallerMecanico: {
                id: tallerMecanico.id,
                nombre: tallerMecanico.nombre,
                nitOCedula: tallerMecanico.nitOCedula
            }
        });

    } catch (error) {
        console.error("Error al crear mantenimiento por taller mecánico:", error);
        res.status(500).json({ message: "Error interno del servidor al registrar mantenimiento por taller", error: error.message });
    }
};

// GET Mantenimiento por ID (Protegida)
export const getMantenimientoById = async (req, res) => {
    try {
        const { id } = req.params;
        const mantenimiento = await db.models.Mantenimiento.findByPk(id, {
            include: [
                {
                    model: db.models.Vehiculo,
                    as: 'vehiculo',
                    include: [{ model: db.models.Propietario, as: 'propietario' }], 
                    attributes: ['id', 'placa', 'marca', 'modelo']
                },
                {
                    model: db.models.TallerMecanico,
                    as: 'tallerMecanico',
                    attributes: ['id', 'nombre', 'nitOCedula']
                }
            ]
        });

        // Asegurarse de que el mantenimiento pertenece a uno de los vehículos del propietario logueado
        if (!mantenimiento || !mantenimiento.vehiculo || mantenimiento.vehiculo.propietario.id !== req.user.id) {
            return res.status(404).json({ message: "Mantenimiento no encontrado o no autorizado." });
        }

        res.status(200).json(mantenimiento);
    } catch (error) {
        console.error("Error al obtener mantenimiento por ID:", error);
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// GET Todos los mantenimientos del propietario logueado (Protegida)
export const getAllMantenimientos = async (req, res) => {
    try {
        const mantenimientos = await db.models.Mantenimiento.findAll({
            include: [
                {
                    model: db.models.Vehiculo,
                    as: 'vehiculo',
                    where: { propietarioId: req.user.id }, // Filtrar por los vehículos del propietario logueado
                    attributes: ['id', 'placa', 'marca', 'modelo'] // Incluir solo campos relevantes del vehículo
                },
                {
                    model: db.models.TallerMecanico,
                    as: 'tallerMecanico',
                    attributes: ['id', 'nombre', 'nitOCedula']
                }
            ],
            order: [['fecha', 'DESC']] 
        });

        res.status(200).json(mantenimientos);
    } catch (error) {
        console.error("Error al obtener todos los mantenimientos:", error);
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// UPDATE Mantenimiento (Protegida)
export const updateMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, fecha, kilometraje, descripcion, costo, fechaVencimiento } = req.body;
        // --- CAMBIO CLAVE AQUÍ: Guardar la ruta pública del archivo si se sube uno nuevo ---
        const facturaPath = req.file ? `/uploads/mantenimientos/${req.file.filename}` : undefined; // Use undefined para no sobrescribir si no se sube nuevo archivo

        const mantenimiento = await db.models.Mantenimiento.findByPk(id, {
            include: [{ model: db.models.Vehiculo, as: 'vehiculo', where: { propietarioId: req.user.id } }]
        });

        if (!mantenimiento) {
            return res.status(404).json({ message: "Mantenimiento no encontrado o no autorizado." });
        }

        // Actualizar campos si se proporcionan en el body
        mantenimiento.tipo = tipo || mantenimiento.tipo;
        mantenimiento.fecha = fecha || mantenimiento.fecha;
        mantenimiento.kilometraje = kilometraje || mantenimiento.kilometraje;
        mantenimiento.descripcion = descripcion || mantenimiento.descripcion;
        mantenimiento.costo = costo || mantenimiento.costo;
        if (facturaPath !== undefined) { // Solo actualizar si se envió un nuevo archivo
            mantenimiento.facturaPath = facturaPath;
        }
        // Permitir que fechaProximoMantenimiento sea null si se envía explícitamente null
        mantenimiento.fechaVencimiento = fechaVencimiento !== undefined ? fechaProximoMantenimiento : mantenimiento.fechaProximoMantenimiento;

        await mantenimiento.save();

        // Re-check y envía recordatorio si la fecha del próximo mantenimiento se actualizó o ya aplica
        await checkAndSendNextMaintenanceReminder(mantenimiento, mantenimiento.vehiculoId);

        res.status(200).json({ message: "Mantenimiento actualizado exitosamente", mantenimiento });
    } catch (error) {
        console.error("Error al actualizar mantenimiento:", error);
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};









