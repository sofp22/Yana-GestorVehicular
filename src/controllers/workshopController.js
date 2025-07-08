import path from 'path';

export function showWorkshopForm(req, res) {
  const { token } = req.params;
  if (!token) {
    return res.status(400).send('Falta el token QR en la URL.');
  }
  // Renderizamos el HTML estático, sustituyendo {{TOKEN}}
  const formPath = path.resolve('public/workshop_form.html');
  let html = require('fs').readFileSync(formPath, 'utf8');
  html = html.replace('{{TOKEN}}', encodeURIComponent(token));
  res.send(html);
}

export function submitWorkshopForm(req, res) {
  const token = req.query.token;
  // Aquí recoge multer en req.file, y los campos en req.body
  // Valida token con tu función validateQrToken(token)
  // Luego usa tu service para crear mantenimiento en DB
  // Finalmente redirige o muestra un mensaje de éxito:
  res.send('<h3>Mantenimiento registrado con éxito.</h3>');
}
