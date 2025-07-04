import db from '../models/index.js';
import { validateQrToken } from './qrController.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
//import { sendSms } from '../utils/smsService.js'; // Importamos el servicio de SMS

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
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

export const uploadMantenimientoFactura = multer({ storage: storageMantenimiento });

// --- Helper para enviar recordatorio de próximo mantenimiento ---
const checkAndSendNextMaintenanceReminder = async (mantenimiento, vehiculoId) => {
    // Solo si hay una fecha de próximo mantenimiento definida
    if (mantenimiento.fechaVencimiento) {
        const nextMaintenanceDate = new Date(mantenimiento.fechaVencimiento);
        const today = new Date();
        const twentyDaysFromNow = new Date();
        twentyDaysFromNow.setDate(today.getDate() + 20);

        // Ajustar fechas para comparación solo de día, mes, año
        today.setHours(0, 0, 0, 0);
        nextMaintenanceDate.setHours(0, 0, 0, 0);
        twentyDaysFromNow.setHours(0, 0, 0, 0);

        // Comprueba si la fecha del próximo mantenimiento está en el rango de hoy hasta dentro de 20 días
        if (nextMaintenanceDate >= today && nextMaintenanceDate <= twentyDaysFromNow) {
            try {
                // Obtener detalles del vehículo y el propietario para enviar el SMS
                const vehiculo = await db.models.Vehiculo.findByPk(vehiculoId, {
                    include: [{ model: db.models.Propietario, as: 'propietario' }]
                });

                if (vehiculo && vehiculo.propietario && vehiculo.propietario.celular) {
                    const message = `¡Recordatorio! El mantenimiento "${mantenimiento.tipo}" para su vehículo ${vehiculo.placa} (${vehiculo.marca} ${vehiculo.modelo}) está programado para el ${mantenimiento.fechaVencimiento.toISOString().split('T')[0]}.`;
                    await sendSms(vehiculo.propietario.celular, message);
                    console.log(`SMS de recordatorio de próximo mantenimiento enviado a ${vehiculo.propietario.celular}`);
                }
            } catch (error) {
                console.error("Error al enviar SMS de recordatorio de próximo mantenimiento:", error);
            }
        }
    }
};

// --- Funciones del Controlador de Mantenimiento (CRUD + QR) ---

// CREATE Mantenimiento por Propietario (protegida por JWT)
export const createMantenimiento = async (req, res) => {
    try {
        const { vehiculoId, tipo, fecha, kilometraje, descripcion, costo, fechaVencimiento } = req.body;
        const facturaPath = req.file ? req.file.path : null;

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
            fechaVencimiento: fechaVencimiento || null // Puede ser nulo
        });

        // Envía recordatorio si aplica al crear
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
        const facturaPath = req.file ? req.file.path : null;

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
            // Si el taller no existe, créalo con un nombre genérico. Puedes expandir esto para pedir más datos.
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
            fechaVencimiento: fechaVencimiento|| null
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
                    include: [{ model: db.models.Propietario, as: 'propietario' }], // Incluye propietario para el filtro de seguridad
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
            order: [['fecha', 'DESC']] // Ordenar por fecha del más reciente
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
        const { tipo, fecha, kilometraje, descripcion, costo, fechaVencimiento} = req.body;
        const facturaPath = req.file ? req.file.path : undefined; // Use undefined para no sobrescribir si no se sube nuevo archivo

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
        mantenimiento.fechaVencimiento= fechaVencimiento !== undefined ? fechaVencimiento : mantenimiento.fechaVencimiento;

        await mantenimiento.save();

        // Re-check y envía recordatorio si la fecha del próximo mantenimiento se actualizó o ya aplica
        await checkAndSendNextMaintenanceReminder(mantenimiento, mantenimiento.vehiculoId);

        res.status(200).json({ message: "Mantenimiento actualizado exitosamente", mantenimiento });
    } catch (error) {
        console.error("Error al actualizar mantenimiento:", error);
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

