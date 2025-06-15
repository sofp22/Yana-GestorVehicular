// src/middleware/errorHandler.js
export const handleHttpError = (res, error, defaultMessage = 'Error interno del servidor.') => {
    console.error(`Error HTTP: ${error.message || defaultMessage}`, error);

    const statusCode = error.status || 500;
    const message = error.message || defaultMessage;

    res.status(statusCode).json({ message: message });
};