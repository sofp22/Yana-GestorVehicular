// src/controllers/mantenimientoController.js
import db from '../models/index.js';
import { validateQrToken } from './qrController.js';
// REMOVIDO: No importamos Multer aquí, se usa en las rutas.
// import multer from 'multer'; 
// import path from 'path'; // No es necesario si no se usa path directamente para Multer aquí
// import { fileURLToPath } from 'url'; // No es necesario si no se usa __dirname directamente aquí
import { Op } from 'sequelize';
import { createCalendarEvent } from '../services/googleCalendarService.js';
import MantenimientoService from '../services/mantenimiento.service.js'; // Importa el servicio

// REMOVIDO: La configuración de Multer ya no está aquí. Se importa desde middleware/upload.js y se usa en las rutas.
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const storageMantenimiento = multer.diskStorage({ ... });
// export const uploadMantenimientoFactura = multer({ storage: storageMantenimiento });


// --- Helper para crear evento de Google Calendar para recordatorio de próximo mantenimiento ---
const checkAndSendNextMaintenanceReminder = async (mantenimiento, vehiculoId) => {
    // Usa mantenimiento.fechaVencimiento que es el nombre del campo en el modelo.
    if (mantenimiento.fechaVencimiento) {
        const nextMaintenanceDate = new Date(mantenimiento.fechaVencimiento);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        nextMaintenanceDate.setHours(0, 0, 0, 0);

        if (nextMaintenanceDate >= today) {
            try {
                const vehiculo = await db.models.Vehiculo.findByPk(vehiculoId, {
                    include: [{ model: db.models.Propietario, as: 'propietario' }]
                });

                if (vehiculo && vehiculo.propietario) {
                    const summary = `Recordatorio Mantenimiento: ${mantenimiento.tipo} - ${vehiculo.placa}`;
                    const description = `El mantenimiento "${mantenimiento.tipo}" para su vehículo ${vehiculo.placa} (${vehiculo.marca} ${vehiculo.modelo}) está programado para el ${mantenimiento.fechaVencimiento.toISOString().split('T')[0]}. Kilometraje actual: ${mantenimiento.kilometraje}.`;

                    const eventStart = new Date(nextMaintenanceDate.getFullYear(), nextMaintenanceDate.getMonth(), nextMaintenanceDate.getDate(), 9, 0, 0);
                    const eventEnd = new Date(nextMaintenanceDate.getFullYear(), nextMaintenanceDate.getMonth(), nextMaintenanceDate.getDate(), 10, 0, 0);

                    const reminderMinutes = [0, 60 * 24];

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

// --- Funciones del Controlador de Mantenimiento (CRUD + QR) ---

// CREATE Mantenimiento por Propietario (protegida por JWT)
export const createMantenimiento = async (req, res) => {
    console.log("DEBUG: createMantenimiento - req.body:", req.body);
    console.log("DEBUG: createMantenimiento - req.file:", req.file);
    try {
        // CAMBIO CLAVE: Desestructurar 'fechaVencimiento' para la ruta de propietario
        const { vehiculoId, tipo, fecha, kilometraje, descripcion, costo, fechaVencimiento } = req.body || {};
        
        // Validación básica para campos obligatorios
        if (!vehiculoId || !tipo || !fecha || !kilometraje || !costo) {
            return res.status(400).json({ message: "Faltan campos obligatorios (vehiculoId, tipo, fecha, kilometraje, costo)." });
        }

        // El servicio espera los datos del mantenimiento y el buffer del archivo
        const mantenimientoData = {
            vehiculoId,
            tipo,
            fecha: fecha ? new Date(fecha) : null,
            kilometraje: parseFloat(kilometraje),
            descripcion,
            costo: parseFloat(costo),
            fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null
        };

        // CAMBIO CLAVE: Usar el servicio para crear el mantenimiento
        const newMantenimiento = await MantenimientoService.createMantenimiento(
            mantenimientoData, 
            req.file ? req.file : null, // Pasar el objeto file completo (Multer MemoryStorage)
            req.user.id // Pasar el propietarioId del JWT
        );

        await checkAndSendNextMaintenanceReminder(newMantenimiento, vehiculoId);

        res.status(201).json({ message: "Mantenimiento creado exitosamente por propietario", mantenimiento: newMantenimiento });

    } catch (error) {
        console.error("Error al crear mantenimiento por propietario:", error);
        // Manejo de errores del servicio
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// CREATE Mantenimiento por Taller Mecánico (NO protegida por JWT)
export const createMantenimientoByWorkshop = async (req, res) => {
    // --- CONSOLE.LOGS PARA DEPURAR req.body y req.file ---
    console.log("DEBUG: createMantenimientoByWorkshop - req.body:", req.body);
    console.log("DEBUG: createMantenimientoByWorkshop - req.file:", req.file);
    // ---------------------------------------------------
    try {
        const token = req.query.token; 
        let tokenInfo = null;

        if (!token) {
            if (req.vehiculoIdFromToken) {
                tokenInfo = { vehiculoId: req.vehiculoIdFromToken };
            } else {
                return res.status(400).json({ message: "Token de QR o ID de vehículo no proporcionado." });
            }
        } else {
            tokenInfo = validateQrToken(token);
            if (!tokenInfo) {
                return res.status(401).json({ message: "Token de QR inválido o expirado." });
            }
        }
        
        const vehiculoId = tokenInfo.vehiculoId;

        // CAMBIO CLAVE: Esperar 'fechaVencimiento' del body para el taller
        const { nitOCedulaTaller, tipo, fecha, kilometraje, descripcion, costo, fechaVencimiento } = req.body;
        
        if (!nitOCedulaTaller || !tipo || !fecha || !kilometraje || !costo) {
            return res.status(400).json({ message: "Faltan campos obligatorios (nitOCedulaTaller, tipo, fecha, kilometraje, costo)." });
        }

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

        const mantenimientoData = {
            vehiculoId,
            tallerMecanicoId: tallerMecanico.id,
            tipo,
            fecha: fecha ? new Date(fecha) : null,
            kilometraje: parseFloat(kilometraje),
            descripcion,
            costo: parseFloat(costo),
            fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null // Usar fechaVencimiento
        };

        // CAMBIO CLAVE: Usar el servicio para crear el mantenimiento
        const newMantenimiento = await MantenimientoService.createMantenimiento(
            mantenimientoData, 
            req.file ? req.file : null, // Pasar el objeto file completo (Multer MemoryStorage)
            vehiculoExistente.propietarioId // Pasar el propietarioId del vehículo
        );

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
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        res.status(500).json({ message: "Error interno del servidor al registrar mantenimiento por taller", error: error.message });
    }
};

// GET Mantenimiento por ID (Protegida)
export const getMantenimientoById = async (req, res) => {
    try {
        const { id } = req.params;
        // CAMBIO CLAVE: Usar el servicio para obtener el mantenimiento
        const mantenimiento = await MantenimientoService.getMantenimientoById(id, req.user.id);

        res.status(200).json(mantenimiento);
    } catch (error) {
        console.error("Error al obtener mantenimiento por ID:", error);
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// GET Todos los mantenimientos del propietario logueado (Protegida)
export const getAllMantenimientos = async (req, res) => {
    try {
        // CAMBIO CLAVE: Usar el servicio para obtener todos los mantenimientos del propietario
        const mantenimientos = await MantenimientoService.getMantenimientosByPropietario(req.user.id);

        res.status(200).json(mantenimientos);
    } catch (error) {
        console.error("Error al obtener todos los mantenimientos:", error);
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// UPDATE Mantenimiento (Protegida)
export const updateMantenimiento = async (req, res) => {
    console.log("DEBUG: updateMantenimiento - req.body:", req.body);
    console.log("DEBUG: updateMantenimiento - req.file:", req.file);
    try {
        const { id } = req.params;
        // CAMBIO CLAVE: Desestructurar 'fechaVencimiento' para la ruta de propietario
        const { tipo, fecha, kilometraje, descripcion, costo, fechaVencimiento } = req.body;
        
        const mantenimientoData = {
            tipo,
            fecha: fecha ? new Date(fecha) : undefined, // undefined para no actualizar si no se envía
            kilometraje: kilometraje ? parseFloat(kilometraje) : undefined,
            descripcion,
            costo: costo ? parseFloat(costo) : undefined,
            fechaVencimiento: fechaVencimiento !== undefined ? (fechaVencimiento ? new Date(fechaVencimiento) : null) : undefined // undefined para no actualizar si no se envía
        };

        // CAMBIO CLAVE: Usar el servicio para actualizar el mantenimiento
        const updatedMantenimiento = await MantenimientoService.updateMantenimiento(
            id, 
            mantenimientoData, 
            req.file ? req.file : null, // Pasar el objeto file completo (Multer MemoryStorage)
            req.user.id
        );

        await checkAndSendNextMaintenanceReminder(updatedMantenimiento, updatedMantenimiento.vehiculoId);

        res.status(200).json({ message: "Mantenimiento actualizado exitosamente", mantenimiento: updatedMantenimiento });
    } catch (error) {
        console.error("Error al actualizar mantenimiento:", error);
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// DELETE Mantenimiento (Protegida)
export const deleteMantenimiento = async (req, res) => {
    try {
        const { id } = req.params;
        // CAMBIO CLAVE: Usar el servicio para eliminar el mantenimiento
        const result = await MantenimientoService.deleteMantenimiento(id, req.user.id);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error al eliminar mantenimiento:", error);
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};