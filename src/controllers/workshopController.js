// src/controllers/workshopController.js
import path from 'path';
import fs from 'fs'; // Necesitarás 'fs' para leer el archivo HTML
import { validateQrToken } from './qrController.js'; // Importa la función de validación del QR
import { createMantenimiento } from './mantenimiento.controller.js'; // Importa la función de crear mantenimiento

export function showWorkshopForm(req, res) {
  // CAMBIO CLAVE 1: Leer el token de req.query
  const token = req.query.token;

  if (!token) {
    return res.status(400).send('Falta el token QR en la URL.');
  }

  // Opcional: Validar el token aquí para una capa extra de seguridad antes de mostrar el formulario
  const tokenInfo = validateQrToken(token);
  if (!tokenInfo) {
      return res.status(403).send('Token QR inválido o expirado.');
  }

  // Renderizamos el HTML estático, sustituyendo {{TOKEN}}
  // Asegúrate de que 'public/workshop_form.html' exista y sea accesible
  const formPath = path.resolve('public/workshop_form.html');
  
  if (!fs.existsSync(formPath)) {
      console.error(`Error: El archivo HTML del formulario no se encuentra en: ${formPath}`);
      return res.status(500).send('Error interno del servidor: Formulario no encontrado.');
  }

  let html = fs.readFileSync(formPath, 'utf8');
  html = html.replace('{{TOKEN}}', encodeURIComponent(token)); // Codifica el token para la URL
  res.send(html);
}

// Asegúrate de que este controlador reciba el middleware de Multer en la ruta
export async function submitWorkshopForm(req, res) {
  // CAMBIO CLAVE 2: Leer el token de req.query
  const token = req.query.token; 

  if (!token) {
    return res.status(400).send('Token QR no proporcionado en la URL.');
  }

  // 1. Validar el token
  const tokenInfo = validateQrToken(token);
  if (!tokenInfo) {
    return res.status(403).send('Token QR inválido o expirado.');
  }

  const { vehiculoId } = tokenInfo; // Obtener vehiculoId del token validado
  const { tipo, fecha, kilometraje, descripcion, costo, fechaProximoMantenimiento } = req.body;
  const facturaFile = req.file; // Multer adjunta el archivo aquí

  // 2. Preparar los datos para el controlador de mantenimiento
  // Asegúrate de que los nombres de los campos coincidan con lo que 'createMantenimiento' espera
  const maintenanceData = {
    vehiculoId,
    tipo,
    fecha, // Las fechas pueden necesitar un parseo si vienen de un formulario HTML
    kilometraje: parseFloat(kilometraje), // Convertir a número
    descripcion,
    costo: parseFloat(costo), // Convertir a número
    fechaProximoMantenimiento, // Similar a la fecha, puede necesitar parseo
    // No pasamos facturaFile directamente aquí, el createMantenimiento lo manejará con req.file
    // O si createMantenimiento es solo una función sin req, res, se la pasamos directamente
    // Para simplificar, asumiremos que createMantenimiento espera req.body y req.file
  };

  try {
      // 3. Simular la petición al controlador de mantenimiento
      // Esto es un TRUCO. Lo ideal sería refactorizar createMantenimiento para
      // que sea una función de servicio pura (sin req, res) y llamarla aquí.
      // Pero para que funcione con tu estructura actual:
      const fakeReq = {
          body: maintenanceData,
          file: facturaFile,
          user: { id: vehiculoId } // Multer ya no necesita autenticación por JWT para esta ruta,
                                    // pero createMantenimiento podría esperar req.user.id.
                                    // Usamos vehiculoId como un placeholder o lo obtenemos del vehiculo en el QR.
                                    // NOTA: Si createMantenimiento hace una verificación de propietarioId con req.user.id,
                                    // esto necesita un ID de propietario real. Considera si el taller debe
                                    // tener un ID de usuario genérico o si la validación debe ser diferente aquí.
                                    // Por ahora, asumiremos que no hay una verificación de propietario en createMantenimiento
                                    // cuando se llama desde submitWorkshopForm, ya que el vehiculoId viene del token QR.
      };
      const fakeRes = {
          status: function(code) { this.statusCode = code; return this; },
          json: function(data) { this.data = data; },
          send: function(data) { this.data = data; }
      };

      // Aquí podrías necesitar ajustar cómo createMantenimiento recibe el req.user.id.
      // Si `createMantenimiento` espera `req.user.id`, y el token QR no tiene eso,
      // tendrás que modificar `createMantenimiento` para que se adapte a este flujo
      // o pasar el `propietarioId` obtenido del `vehiculoId` asociado al token QR.

      // Una forma más limpia sería que `createMantenimiento` fuera una función de servicio
      // independiente del `req`/`res` y la pudieras llamar con los datos directamente.
      // Por ahora, vamos a simular la llamada:
      await createMantenimiento(fakeReq, fakeRes);

      // Si `createMantenimiento` fue exitoso, fakeRes.statusCode será 201
      if (fakeRes.statusCode === 201) {
          res.status(200).send('<h3>Mantenimiento registrado con éxito. ¡Gracias!</h3>');
      } else {
          // Si createMantenimiento falló pero devolvió una respuesta, la mostramos
          console.error("Error al registrar mantenimiento desde el formulario de taller:", fakeRes.data);
          res.status(fakeRes.statusCode || 500).send(`<h3>Error al registrar mantenimiento:</h3><p>${fakeRes.data?.message || 'Error desconocido'}</p>`);
      }

  } catch (error) {
    console.error("Error al procesar el formulario de taller:", error);
    res.status(500).send('<h3>Error interno del servidor al registrar mantenimiento.</h3>');
  }
}