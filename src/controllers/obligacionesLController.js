import db from '../models/index.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Multer para la carga de documentos de obligaciones legales
const storageObligaciones = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/obligaciones');
        // Asegúrate de que la carpeta existe o créala
        // import fs from 'fs';
        // if (!fs.existsSync(uploadPath)) {
        //     fs.mkdirSync(uploadPath, { recursive: true });
        // }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // El nombre de archivo que se guardará en el disco (ej. 1719876543210-mi_documento.pdf)
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

export const uploadObligacionesDocumento = multer({ storage: storageObligaciones });

// CREATE Obligación Legal
export const createObligacionL = async (req, res) => {
    try {
        const { vehiculoId, nombre, fechaEmision, fechaVencimiento } = req.body;
        // --- CAMBIO CLAVE AQUÍ: Guardar la ruta pública del archivo ---
        // req.file.filename es el nombre único que Multer le dio al archivo guardado
        const documentoPath = req.file ? `/uploads/obligaciones/${req.file.filename}` : null;

        const vehiculoExistente = await db.models.Vehiculo.findOne({
            where: { id: vehiculoId, propietarioId: req.user.id }
        });

        if (!vehiculoExistente) {
            return res.status(404).json({ message: "Vehículo no encontrado o no pertenece al propietario logueado." });
        }

        const newObligacionL = await db.models.ObligacionesL.create({
            vehiculoId,
            nombre,
            fechaEmision,
            fechaVencimiento,
            documentoPath // Se guarda la ruta pública
        });

        res.status(201).json({ message: "Obligación legal creada exitosamente", obligacionLegal: newObligacionL });

    } catch (error) {
        console.error("Error al crear obligación legal:", error);
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// GET Obligación Legal por ID
export const getObligacionLById = async (req, res) => {
    try {
        const { id } = req.params;
        const obligacionLegal = await db.models.ObligacionesL.findByPk(id, {
            include: [{
                model: db.models.Vehiculo,
                as: 'vehiculo',
                include: [{ model: db.models.Propietario, as: 'propietario' }],
                attributes: ['id', 'placa', 'marca', 'modelo']
            }]
        });

        if (!obligacionLegal || !obligacionLegal.vehiculo || obligacionLegal.vehiculo.propietario.id !== req.user.id) {
            return res.status(404).json({ message: "Obligación legal no encontrada o no autorizada." });
        }

        res.status(200).json(obligacionLegal);
    } catch (error) {
        console.error("Error al obtener obligación legal por ID:", error);
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// GET Todas las Obligaciones Legales del propietario logueado
export const getAllObligacionesL = async (req, res) => {
    try {
        const obligacionesLegales = await db.models.ObligacionesL.findAll({
            include: [{
                model: db.models.Vehiculo,
                as: 'vehiculo',
                where: { propietarioId: req.user.id },
                attributes: ['id', 'placa', 'marca', 'modelo']
            }],
            order: [['fechaVencimiento', 'ASC']]
        });

        res.status(200).json(obligacionesLegales);
    } catch (error) {
        console.error("Error al obtener todas las obligaciones legales:", error);
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// UPDATE Obligación Legal
export const updateObligacionL = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, fechaEmision, fechaVencimiento } = req.body;
        // --- CAMBIO CLAVE AQUÍ: Guardar la ruta pública del archivo si se sube uno nuevo ---
        const documentoPath = req.file ? `/uploads/obligaciones/${req.file.filename}` : undefined; // Use undefined para no sobrescribir si no se sube nuevo archivo

        const obligacionLegal = await db.models.ObligacionesL.findByPk(id, {
            include: [{ model: db.models.Vehiculo, as: 'vehiculo', where: { propietarioId: req.user.id } }]
        });

        if (!obligacionLegal) {
            return res.status(404).json({ message: "Obligación legal no encontrada o no autorizada." });
        }

        obligacionLegal.nombre = nombre || obligacionLegal.nombre;
        obligacionLegal.fechaEmision = fechaEmision || obligacionLegal.fechaEmision;
        obligacionLegal.fechaVencimiento = fechaVencimiento || obligacionLegal.fechaVencimiento;
        if (documentoPath !== undefined) { // Solo actualizar si se envió un nuevo archivo
            obligacionLegal.documentoPath = documentoPath;
        }

        await obligacionLegal.save();
        res.status(200).json({ message: "Obligación legal actualizada exitosamente", obligacionLegal });
    } catch (error) {
        console.error("Error al actualizar obligación legal:", error);
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};

// DELETE Obligación Legal
export const deleteObligacionL = async (req, res) => {
    try {
        const { id } = req.params;
        const obligacionLegal = await db.models.ObligacionesL.findByPk(id, {
            include: [{ model: db.models.Vehiculo, as: 'vehiculo', where: { propietarioId: req.user.id } }]
        });

        if (!obligacionLegal) {
            return res.status(404).json({ message: "Obligación legal no encontrada o no autorizada." });
        }

        await obligacionLegal.destroy();
        res.status(200).json({ message: "Obligación legal eliminada exitosamente." });
    } catch (error) {
        console.error("Error al eliminar obligación legal:", error);
        res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
};