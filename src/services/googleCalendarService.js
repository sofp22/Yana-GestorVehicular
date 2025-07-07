import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path'; // Import path module
import fs from 'fs';   // Import file system module
import { fileURLToPath } from 'url'; // For __dirname in ES Modules

dotenv.config(); 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Credenciales de la cuenta de servicio de Google (Intento 1: Desde .env) ---
const GOOGLE_CALENDAR_CLIENT_EMAIL_ENV = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
const rawPrivateKeyEnv = process.env.GOOGLE_CALENDAR_PRIVATE_KEY;
let GOOGLE_CALENDAR_PRIVATE_KEY_ENV = null;

if (rawPrivateKeyEnv) {
    // Trim any whitespace from the start/end of the entire string
    // Replace ALL carriage returns (\r) with nothing, then replace escaped newlines (\\n) with actual newlines (\n)
    GOOGLE_CALENDAR_PRIVATE_KEY_ENV = rawPrivateKeyEnv.trim().replace(/\r/g, '').replace(/\\n/g, '\n');
}

const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

// --- Depuración de variables de entorno ---
console.log('DEBUG: GOOGLE_CALENDAR_CLIENT_EMAIL (from .env):', GOOGLE_CALENDAR_CLIENT_EMAIL_ENV);
console.log('DEBUG: GOOGLE_CALENDAR_PRIVATE_KEY (from .env, first 20 chars):', GOOGLE_CALENDAR_PRIVATE_KEY_ENV ? GOOGLE_CALENDAR_PRIVATE_KEY_ENV.substring(0, 20) + '...' : 'NOT SET');
console.log('DEBUG: GOOGLE_CALENDAR_PRIVATE_KEY (from .env, length):', GOOGLE_CALENDAR_PRIVATE_KEY_ENV ? GOOGLE_CALENDAR_PRIVATE_KEY_ENV.length : 'N/A');
console.log('DEBUG: Type of GOOGLE_CALENDAR_PRIVATE_KEY (from .env):', typeof GOOGLE_CALENDAR_PRIVATE_KEY_ENV);
console.log('DEBUG: GOOGLE_CALENDAR_ID:', GOOGLE_CALENDAR_ID);

if (GOOGLE_CALENDAR_PRIVATE_KEY_ENV) {
    console.log('DEBUG: GOOGLE_CALENDAR_PRIVATE_KEY (from .env, first 50 chars):', GOOGLE_CALENDAR_PRIVATE_KEY_ENV.substring(0, 50));
    console.log('DEBUG: GOOGLE_CALENDAR_PRIVATE_KEY (from .env, last 50 chars):', GOOGLE_CALENDAR_PRIVATE_KEY_ENV.substring(GOOGLE_CALENDAR_PRIVATE_KEY_ENV.length - 50));
}

// --- NUEVAS COMPROBACIONES DE FORMATO DE CLAVE PRIVADA (desde .env) ---
if (GOOGLE_CALENDAR_PRIVATE_KEY_ENV) {
    if (!GOOGLE_CALENDAR_PRIVATE_KEY_ENV.startsWith('-----BEGIN PRIVATE KEY-----')) {
        console.error('ERROR DE FORMATO (ENV): GOOGLE_CALENDAR_PRIVATE_KEY no comienza con "-----BEGIN PRIVATE KEY-----". Revisa tu .env.');
    }
    if (!GOOGLE_CALENDAR_PRIVATE_KEY_ENV.endsWith('-----END PRIVATE KEY-----')) {
        console.error('ERROR DE FORMATO (ENV): GOOGLE_CALENDAR_PRIVATE_KEY no termina con "-----END PRIVATE KEY-----". Revisa tu .env.');
    }
    if (!GOOGLE_CALENDAR_PRIVATE_KEY_ENV.includes('-----BEGIN PRIVATE KEY-----') || !GOOGLE_CALENDAR_PRIVATE_KEY_ENV.includes('-----END PRIVATE KEY-----')) {
        console.error('ERROR DE FORMATO (ENV): GOOGLE_CALENDAR_PRIVATE_KEY no contiene los marcadores PEM completos. Revisa tu .env.');
    }
}
// --- FIN NUEVAS COMPROBACIONES ---


let authClient;

// --- Intento 2: Cargar credenciales desde un archivo JSON (SOLO PARA DEPURACIÓN LOCAL) ---
const KEY_FILE_PATH = path.join(__dirname, '../config/google-credentials.json');

console.log('DEBUG: Intentando cargar credenciales desde archivo:', KEY_FILE_PATH);

if (fs.existsSync(KEY_FILE_PATH)) {
    authClient = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    console.log('DEBUG: Usando credenciales del archivo JSON (keyFile) para autenticación.');
    console.log('Autenticación con Google Calendar API exitosa (vía keyFile).');
} else if (GOOGLE_CALENDAR_CLIENT_EMAIL_ENV && GOOGLE_CALENDAR_PRIVATE_KEY_ENV) {
    authClient = new google.auth.JWT(
        GOOGLE_CALENDAR_CLIENT_EMAIL_ENV,
        null,
        GOOGLE_CALENDAR_PRIVATE_KEY_ENV,
        ['https://www.googleapis.com/auth/calendar'],
        null
    );
    console.log('DEBUG: Archivo de credenciales JSON NO encontrado. Usando credenciales de variables de entorno para autenticación.');
    authClient.authorize((err) => {
        if (err) {
            console.error('Error al autenticar con Google Calendar API (vía .env):', err);
            return;
        }
        console.log('Autenticación con Google Calendar API exitosa (vía .env).');
    });
} else {
    console.error('ERROR CRÍTICO: No se pudieron cargar las credenciales de Google Calendar ni desde .env ni desde archivo JSON. La autenticación fallará.');
}


// Instancia del cliente de Google Calendar API
const calendar = google.calendar({ version: 'v3', auth: authClient });

/**
 * Crea un evento en el calendario de Google.
 * Este evento servirá como recordatorio para el usuario.
 * @param {string} summary - Título del evento (ej. "Recordatorio SOAT - Placa ABC123").
 * @param {string} description - Descripción detallada del evento.
 * @param {Date} eventStartDateTime - Objeto Date para la fecha y hora de inicio del evento en el calendario.
 * @param {Date} eventEndDateTime - Objeto Date para la fecha y hora de fin del evento en el calendario.
 * @param {Array<number>} reminderMinutesArray - Array de minutos antes del evento para las alarmas (ej. [0, 60*24] para el mismo día y un día antes).
 * @returns {Promise<object|null>} El evento creado o null si hay un error.
 */
export const createCalendarEvent = async (summary, description, eventStartDateTime, eventEndDateTime, reminderMinutesArray) => {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
        console.error('GOOGLE_CALENDAR_ID no está configurado en las variables de entorno. No se puede crear evento en Calendar.');
        return null;
    }

    // Construir los overrides de recordatorios
    const overrides = reminderMinutesArray.map(minutes => ({
        method: 'popup', // Tipo de recordatorio: pop-up
        minutes: minutes // Minutos antes del evento
    }));

    const event = {
        summary: summary,
        description: description,
        start: {
            dateTime: eventStartDateTime.toISOString(),
            timeZone: 'America/Bogota', // Asegúrate de usar la zona horaria correcta
        },
        end: {
            dateTime: eventEndDateTime.toISOString(),
            timeZone: 'America/Bogota',
        },
        reminders: {
            useDefault: false, // No usar los recordatorios por defecto del calendario
            overrides: overrides, // Usar los recordatorios definidos
        },
    };

    try {
        const res = await calendar.events.insert({
            calendarId: calendarId,
            resource: event,
        });
        console.log(`Evento de calendario creado: ${res.data.htmlLink}`);
        return res.data;
    } catch (err) {
        console.error('Error al crear evento en Google Calendar:', err.message);
        return null;
    }
};

