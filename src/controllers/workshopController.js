// src/controllers/workshopController.js
import path from 'path';
import fs from 'fs'; // Necesario para leer el archivo HTML
import { fileURLToPath } from 'url'; // Necesario para __dirname en ES Modules
import { validateQrToken } from './qrController.js'; // Importa la función de validación del QR
import { createMantenimientoByWorkshop } from './mantenimientoController.js'; // Importa la función de crear mantenimiento por taller
import db from '../models/index.js'; // Importar db si es necesario para alguna lógica aquí

// Configuración para __dirname en módulos ES (para este controlador)
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export function showWorkshopForm(req, res) {
    // --- CONSOLE.LOGS PARA DEPURAR ---
    console.log("DEBUG: Contenido de req.query:", req.query);
    console.log("DEBUG: Valor de req.query.token:", req.query.token);
    // ---------------------------------

    const token = req.query.token;

    if (!token) {
        console.log("DEBUG: El token no fue encontrado en req.query.");
        return res.status(400).send('<h3>Error: Falta el token QR en la URL.</h3><p>Por favor, escanee el código QR completo o asegúrese de que la URL contenga el parámetro "token".</p>');
    }

    const tokenInfo = validateQrToken(token);
    if (!tokenInfo) {
        console.log("DEBUG: Token QR inválido o expirado después de validación.");
        return res.status(403).send('<h3>Error: Token QR inválido o expirado.</h3><p>El enlace del código QR ha caducado o no es válido. Por favor, solicite un nuevo código QR.</p>');
    }

    const formPath = path.join(__dirname, '../web/workshop_form.html'); 
    
    if (!fs.existsSync(formPath)) {
        console.error(`Error: El archivo HTML del formulario no se encuentra en: ${formPath}`);
        return res.status(500).send('<h3>Error Interno:</h3><p>El formulario del taller no pudo ser cargado. Por favor, contacte al soporte técnico.</p>');
    }

    let html = fs.readFileSync(formPath, 'utf8');
    html = html.replace('{{TOKEN}}', encodeURIComponent(token)); // Codifica el token para la URL del formulario
    res.send(html);
}

export async function submitWorkshopForm(req, res) {
    const token = req.query.token;

    if (!token) {
        return res.status(400).send('<h3>Error: Token QR no proporcionado en la URL para el envío.</h3>');
    }

    const tokenInfo = validateQrToken(token);
    if (!tokenInfo) {
        return res.status(403).send('<h3>Error: Token QR inválido o expirado para el envío.</h3>');
    }

    const { vehiculoId } = tokenInfo; // Obtener vehiculoId del token validado
    // Los datos del formulario HTML vienen en req.body gracias a multer
    // Asegúrate de que 'nitOCedulaTaller' esté en el formulario HTML
    const { tipo, fecha, kilometraje, descripcion, costo, fechaProximoMantenimiento, nitOCedulaTaller } = req.body; 
    const facturaFile = req.file; // Multer adjunta el archivo aquí

    // Parsear datos del formulario HTML a los tipos correctos
    const maintenanceData = {
        vehiculoId, // Este vehiculoId ya viene del token validado, no del body del formulario
        tipo,
        fecha: fecha ? new Date(fecha) : null, // Convertir a Date si existe
        kilometraje: parseFloat(kilometraje),
        descripcion,
        costo: parseFloat(costo),
        fechaProximoMantenimiento: fechaProximoMantenimiento ? new Date(fechaProximoMantenimiento) : null, // Convertir a Date si existe
        nitOCedulaTaller // Pasar el NIT/Cédula del taller
    };

    try {
        // Llamar a la función createMantenimientoByWorkshop directamente
        // Pasamos el vehiculoId validado en una propiedad especial para que createMantenimientoByWorkshop lo use
        const fakeReq = {
            query: { token: token }, // Todavía pasamos el token en query si createMantenimientoByWorkshop lo espera allí
            body: maintenanceData,
            file: facturaFile,
            vehiculoIdFromToken: vehiculoId // Pasamos el vehiculoId validado directamente
        };
        const fakeRes = {
            statusCode: 200, 
            data: null,      
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { this.data = data; },
            send: function(data) { this.data = data; }
        };

        await createMantenimientoByWorkshop(fakeReq, fakeRes); 

        if (fakeRes.statusCode >= 200 && fakeRes.statusCode < 300) { 
            res.status(200).send('<h3>Mantenimiento registrado con éxito. ¡Gracias!</h3><p>Puede cerrar esta ventana.</p>');
        } else {
            console.error("Error al registrar mantenimiento desde el formulario de taller (fakeRes):", fakeRes.data);
            res.status(fakeRes.statusCode || 500).send(`<h3>Error al registrar mantenimiento:</h3><p>${fakeRes.data?.message || 'Error desconocido al procesar el mantenimiento.'}</p><p>Por favor, intente de nuevo o contacte al soporte.</p>`);
        }

    } catch (error) {
        console.error("Error al procesar el formulario de taller:", error);
        res.status(500).send('<h3>Error interno del servidor al registrar mantenimiento.</h3><p>Ha ocurrido un problema inesperado. Por favor, intente de nuevo más tarde.</p>');
    }
}