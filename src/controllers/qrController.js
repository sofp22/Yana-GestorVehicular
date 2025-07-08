import qrcode from 'qrcode';
import db from '../models/index.js';

const temporaryQrTokens = new Map(); // Map<shortCode, { vehiculoId, expiresAt }>
const QR_TOKEN_EXPIRATION_MINUTES = 120;

// Función para generar códigos cortos tipo Google Meet (ej: ABCD-1234)
function generateShortCode(length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789'; // Sin O, 0, I, l
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code.slice(0, 4) + '-' + code.slice(4); // Formato: XXXX-XXXX
}

// Generador de QR
export const generateMaintenanceQr = async (req, res) => {
    try {
        const { vehiculoId } = req.params;

        // 1. Verificar propiedad
        const vehiculo = await db.models.Vehiculo.findOne({
            where: { id: vehiculoId, propietarioId: req.user.id }
        });

        if (!vehiculo) {
            return res.status(404).json({ message: "Vehículo no encontrado o no pertenece al propietario." });
        }

        // 2. Generar short code único
        let shortCode;
        do {
            shortCode = generateShortCode();
        } while (temporaryQrTokens.has(shortCode)); // Evitar colisiones

        const expiresAt = new Date(Date.now() + QR_TOKEN_EXPIRATION_MINUTES * 60 * 10000);
        temporaryQrTokens.set(shortCode, { vehiculoId: vehiculo.id, expiresAt });
        cleanExpiredTokens();

        // 3. Construir URL del SSR (desde variable de entorno)
        const ssrBaseUrl = process.env.SSR_BASE_URL || 'https://yana-gestorvehicular.onrender.com/api/mantenimientos';
        const workshopFormUrl = `${ssrBaseUrl}/workshop-submit?token=${shortCode}`;

        // 4. Generar QR
        const qrDataURL = await qrcode.toDataURL(workshopFormUrl);

        res.status(200).json({
            message: `QR generado. Válido por ${QR_TOKEN_EXPIRATION_MINUTES} minutos.`,
            qrCodeImage: qrDataURL,
            workshopSubmissionUrl: workshopFormUrl
        });

    } catch (error) {
        console.error("Error al generar QR de mantenimiento:", error);
        res.status(500).json({ message: "Error interno del servidor." });
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