import db from '../models/index.js';
import ObligacionesLService from '../services/ObligacionesL.service.js'; // Importa el servicio

// No necesitas multer, path, fileURLToPath ni __dirname aquí,
// ya que la subida de archivos y sus rutas son gestionadas por el servicio
// y el middleware 'upload.js'

// CREATE Obligación Legal
export const createObligacionL = async (req, res) => {
    try {
        // Asegúrate de que estos campos existan en tu request body de Postman
        const { vehiculoId, nombre, tipo, descripcion, fechaEmision, fechaVencimiento } = req.body; //
        const file = req.file; // El archivo subido por el middleware 'uploadObligacionesL'

        // Validación básica de campos obligatorios
        if (!vehiculoId || !nombre || !tipo || !fechaEmision || !fechaVencimiento) {
            return res.status(400).json({ message: 'Faltan campos obligatorios para la obligación legal.' }); //
        }
        
        // El servicio maneja la verificación del vehículo y la subida/guardado del archivo
        const newObligacionL = await ObligacionesLService.createObligacionesL({
            vehiculoId,
            nombre,
            tipo,
            descripcion,
            fechaEmision,
            fechaVencimiento
        }, file, req.user.id); // Pasa el archivo y el propietarioId del usuario autenticado

        res.status(201).json({ message: "Obligación legal creada exitosamente", obligacionLegal: newObligacionL }); //

    } catch (error) {
        console.error("Error al crear obligación legal:", error); //
        // Usa el status y mensaje del error si el servicio los proporciona
        res.status(error.status || 500).json({ message: error.message || "Error interno del servidor al crear obligación legal." }); //
    }
};

// GET Obligación Legal por ID
export const getObligacionLById = async (req, res) => {
    try {
        const { id } = req.params; //
        // El servicio ya se encarga de verificar que la obligación pertenezca al usuario
        const obligacionLegal = await ObligacionesLService.getObligacionesLById(id, req.user.id); //

        res.status(200).json(obligacionLegal); //
    } catch (error) {
        console.error("Error al obtener obligación legal por ID:", error); //
        res.status(error.status || 500).json({ message: error.message || "Error interno del servidor al obtener obligación legal." }); //
    }
};

// GET Todas las Obligaciones Legales del propietario logueado
export const getAllObligacionesL = async (req, res) => {
    try {
        // El servicio ahora puede manejar la lógica de obtener todas las obligaciones para un propietario
        const obligacionesLegales = await ObligacionesLService.getAllObligacionesLByPropietario(req.user.id); // Asumo que crearemos este método en el servicio

        res.status(200).json(obligacionesLegales); //
    } catch (error) {
        console.error("Error al obtener todas las obligaciones legales:", error); //
        res.status(error.status || 500).json({ message: error.message || "Error interno del servidor al obtener todas las obligaciones legales." }); //
    }
};

// UPDATE Obligación Legal
export const updateObligacionL = async (req, res) => {
    try {
        const { id } = req.params; //
        // Asegúrate de que estos campos existan en tu request body de Postman si los envías
        const { nombre, tipo, descripcion, fechaEmision, fechaVencimiento } = req.body; //
        const file = req.file; // El nuevo archivo si se subió

        const updatedObligacion = await ObligacionesLService.updateObligacionesL(id, {
            nombre,
            tipo,
            descripcion,
            fechaEmision,
            fechaVencimiento
        }, file, req.user.id); // Pasa los datos, el archivo y el propietarioId

        res.status(200).json({ message: "Obligación legal actualizada exitosamente", obligacionLegal: updatedObligacion }); //
    } catch (error) {
        console.error("Error al actualizar obligación legal:", error); //
        res.status(error.status || 500).json({ message: error.message || "Error interno del servidor al actualizar obligación legal." }); //
    }
};

// DELETE Obligación Legal
export const deleteObligacionL = async (req, res) => {
    try {
        const { id } = req.params; //
        // El servicio maneja la eliminación y la verificación de propiedad
        await ObligacionesLService.deleteObligacionesL(id, req.user.id); //

        res.status(200).json({ message: "Obligación legal eliminada exitosamente." }); //
    } catch (error) {
        console.error("Error al eliminar obligación legal:", error); //
        res.status(error.status || 500).json({ message: error.message || "Error interno del servidor al eliminar obligación legal." }); //
    }
};