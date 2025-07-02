import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/index.js';  

// Almacenamiento temporal de tokens (para demostración)
// En producción, esto debería ser una tabla de base de datos con TTL (Time To Live)
// o un servicio de caché como Redis.
const temporaryQrTokens = new Map(); // Map<token: { vehiculoId: UUID, expiresAt: Date }>

const QR_TOKEN_EXPIRATION_MINUTES = 120; 

/**
 * Genera una URL temporal con un token para que un taller pueda registrar un mantenimiento.
 * Esta función es llamada por el propietario (autenticado).
 */
export const generateMaintenanceQr = async (req, res) => {
    try {
        const { vehiculoId } = req.params; 

        // 1. Verificar que el vehículo existe y pertenece al propietario logueado (seguridad)
        const vehiculo = await db.models.Vehiculo.findOne({
            where: { id: vehiculoId, propietarioId: req.user.id }
        });

        if (!vehiculo) {
            return res.status(404).json({ message: "Vehículo no encontrado o no pertenece al propietario." });
        }

        // 2. Generar un token único y temporal
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + QR_TOKEN_EXPIRATION_MINUTES * 60 * 1000);

        // Almacenar el token asociado al vehiculoId y su expiración
        temporaryQrTokens.set(token, { vehiculoId: vehiculo.id, expiresAt });
    
        cleanExpiredTokens();


        // 3. Construir la URL para el taller
    
        const backendPort = process.env.PORT || 3000;
        const workshopFormUrl = `http://localhost:${backendPort}/api/mantenimientos/workshop-submit?token=${token}`;
        

        // 4. Generar el QR code como Data URL (base64)
        const qrDataURL = await qrcode.toDataURL(workshopFormUrl);

        res.status(200).json({
            message: "QR code generado exitosamente. Válido por " + QR_TOKEN_EXPIRATION_MINUTES + " minutos.",
            qrCodeImage: qrDataURL, // Imagen base64 del QR
            workshopSubmissionUrl: workshopFormUrl // URL que el QR codifica
        });

    } catch (error) {
        console.error("Error al generar QR de mantenimiento:", error);
        res.status(500).json({ message: "Error interno del servidor al generar QR." });
    }
};

/**
 * Función interna para validar un token de QR.
 * @param {string} token - El token a validar.
 * @returns {object|null} - Objeto con vehiculoId si es válido, null si no.
 */
export const validateQrToken = (token) => {
    const tokenInfo = temporaryQrTokens.get(token);

    if (!tokenInfo) {
        return null; 
    }

    if (new Date() > tokenInfo.expiresAt) {
        temporaryQrTokens.delete(token); 
        return null; 
    }

    return tokenInfo;
};


const cleanExpiredTokens = () => {
    const now = new Date();
    for (let [token, info] of temporaryQrTokens) {
        if (now > info.expiresAt) {
            temporaryQrTokens.delete(token);
        }
    }
};