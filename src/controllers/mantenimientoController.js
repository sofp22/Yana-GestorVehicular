// src/controllers/mantenimientoController.js
import MantenimientoService from '../services/mantenimiento.service.js'; // Importa el servicio
import { validateQrToken } from './qrController.js'; // Mantener si validateQrToken no se mueve al servicio de QR o un util

// La lógica de checkAndSendNextMaintenanceReminder se moverá al servicio o se invocará desde allí.
// Aquí solo definiremos las funciones del controlador que llaman al servicio.

// CREATE Mantenimiento por Propietario (protegida por JWT)
export const createMantenimiento = async (req, res) => {
    console.log("DEBUG: createMantenimiento - req.body:", req.body);
    console.log("DEBUG: createMantenimiento - req.file:", req.file);
    try {
        const { vehiculoId, tipo, fecha, kilometraje, descripcion, costo, fechaVencimiento } = req.body || {};
        
        // Validación básica para campos obligatorios
        if (!vehiculoId || !tipo || !fecha || !kilometraje || !costo) {
            return res.status(400).json({ message: "Faltan campos obligatorios (vehiculoId, tipo, fecha, kilometraje, costo)." });
        }

        const mantenimientoData = {
            vehiculoId,
            tipo,
            fecha: fecha ? new Date(fecha) : null,
            kilometraje: parseFloat(kilometraje),
            descripcion,
            costo: parseFloat(costo),
            fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null
        };

        const newMantenimiento = await MantenimientoService.createMantenimiento(
            mantenimientoData, 
            req.file ? req.file : null, // Pasar el objeto file completo (Multer MemoryStorage)
            req.user.id // Pasar el propietarioId del JWT
        );

        res.status(201).json({ message: "Mantenimiento creado exitosamente por propietario", mantenimiento: newMantenimiento });

    } catch (error) {
        console.error("Error al crear mantenimiento por propietario:", error);
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// CREATE Mantenimiento por Taller Mecánico (NO protegida por JWT)
export const createMantenimientoByWorkshop = async (req, res) => {
    console.log("DEBUG: createMantenimientoByWorkshop - req.body:", req.body);
    console.log("DEBUG: createMantenimientoByWorkshop - req.file:", req.file);
    try {
        const token = req.query.token; 
        let vehiculoIdFromToken = req.vehiculoIdFromToken; // Asumimos que un middleware ya procesó el token del header/body si no hay query token

        if (!token && !vehiculoIdFromToken) {
            return res.status(400).json({ message: "Token de QR o ID de vehículo no proporcionado." });
        }

        let vehiculoId;
        if (token) {
            const tokenInfo = validateQrToken(token); // Mantener aquí si qrController maneja la lógica del token QR
            if (!tokenInfo) {
                return res.status(401).json({ message: "Token de QR inválido o expirado." });
            }
            vehiculoId = tokenInfo.vehiculoId;
        } else {
            vehiculoId = vehiculoIdFromToken;
        }
        
        const { nitOCedulaTaller, tipo, fecha, kilometraje, descripcion, costo, fechaVencimiento } = req.body;
        
        if (!nitOCedulaTaller || !tipo || !fecha || !kilometraje || !costo) {
            return res.status(400).json({ message: "Faltan campos obligatorios (nitOCedulaTaller, tipo, fecha, kilometraje, costo)." });
        }

        const mantenimientoData = {
            vehiculoId,
            nitOCedulaTaller, // El servicio se encargará de buscar/crear el taller
            tipo,
            fecha: fecha ? new Date(fecha) : null,
            kilometraje: parseFloat(kilometraje),
            descripcion,
            costo: parseFloat(costo),
            fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null
        };

        const result = await MantenimientoService.createMantenimientoByWorkshop(
            mantenimientoData, 
            req.file ? req.file : null
        );

        res.status(201).json({
            message: "Mantenimiento registrado exitosamente por taller mecánico",
            mantenimiento: result.mantenimiento,
            tallerMecanico: result.tallerMecanico
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
        const { tipo, fecha, kilometraje, descripcion, costo, fechaVencimiento } = req.body;
        
        const mantenimientoData = {
            tipo,
            fecha: fecha ? new Date(fecha) : undefined, // undefined para no actualizar si no se envía
            kilometraje: kilometraje ? parseFloat(kilometraje) : undefined,
            descripcion,
            costo: costo ? parseFloat(costo) : undefined,
            fechaVencimiento: fechaVencimiento !== undefined ? (fechaVencimiento ? new Date(fechaVencimiento) : null) : undefined // undefined para no actualizar si no se envía
        };

        const updatedMantenimiento = await MantenimientoService.updateMantenimiento(
            id, 
            mantenimientoData, 
            req.file ? req.file : null, // Pasar el objeto file completo (Multer MemoryStorage)
            req.user.id
        );

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