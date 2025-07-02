import db from '../models/index.js';
import bcrypt from 'bcryptjs';
import authService from './auth.service.js'; // Importa authService para generateAccessToken

const Propietario = db.models.Propietario;
const Vehiculo = db.models.Vehiculo;
const Mantenimiento = db.models.Mantenimiento;
const ObligacionesL = db.models.ObligacionesL;

import fs from 'fs/promises';
import path from 'path';

const UPLOADS_MANTENIMIENTOS_DIR = 'src/uploads/mantenimientos';
const UPLOADS_OBLIGACIONES_L_DIR = 'src/uploads/obligacionesL';

class PropietarioService {
    async registerPropietario(propietarioData) {
        const { identificacion, correo, password } = propietarioData;

        const existingPropietario = await Propietario.findOne({
            where: {
                [db.Sequelize.Op.or]: [{ identificacion: identificacion }, { correo: correo }]
            }
        });

        if (existingPropietario) {
            if (existingPropietario.identificacion === identificacion) {
                throw { status: 409, message: 'La identificación ya está registrada.' };
            }
            if (existingPropietario.correo === correo) {
                throw { status: 409, message: 'El correo electrónico ya está registrado.' };
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newPropietario = await Propietario.create({
            ...propietarioData,
            password: hashedPassword
        });

        const { password: _, ...propietarioSinPassword } = newPropietario.toJSON();
        return propietarioSinPassword;
    }

    async loginPropietario(correo, password) {
        const propietario = await Propietario.findOne({ where: { correo: correo } });

        if (!propietario || !(await bcrypt.compare(password, propietario.password))) {
            throw { status: 401, message: 'Correo o contraseña incorrectos.' };
        }

        const { password: _, ...propietarioSinPassword } = propietario.toJSON();
        return propietarioSinPassword;
    }

    // Método para generar el token de acceso (expuesto para el controlador de autenticación)
    generateAccessToken(propietario) {
        return authService.generateAccessToken(propietario);
    }

    async getAllPropietarios() {
        const propietarios = await Propietario.findAll({
            attributes: { exclude: ['password'] }
        });
        return propietarios;
    }

    async getPropietarioByIdentificacion(identificacion) {
        const propietario = await Propietario.findOne({
            where: { identificacion: identificacion },
            attributes: { exclude: ['password'] }
        });
        if (!propietario) {
            throw { status: 404, message: 'Propietario no encontrado.' };
        }
        return propietario;
    }

    async updatePropietarioByIdentificacion(identificacion, propietarioData) {
        const propietario = await Propietario.findOne({
            where: { identificacion: identificacion }
        });

        if (!propietario) {
            throw { status: 404, message: 'Propietario no encontrado.' };
        }

        // Validar si se intenta cambiar la identificación o correo a uno ya existente
        if (propietarioData.identificacion && propietarioData.identificacion !== identificacion) {
            const existingByIdentificacion = await Propietario.findOne({ where: { identificacion: propietarioData.identificacion } });
            if (existingByIdentificacion) {
                throw { status: 409, message: 'La nueva identificación ya está registrada para otro propietario.' };
            }
        }
        if (propietarioData.correo && propietarioData.correo !== propietario.correo) {
            const existingByCorreo = await Propietario.findOne({ where: { correo: propietarioData.correo } });
            if (existingByCorreo) {
                throw { status: 409, message: 'El nuevo correo electrónico ya está registrado para otro propietario.' };
            }
        }

        // Si se envía una nueva contraseña, hashearla
        if (propietarioData.password) {
            propietarioData.password = await bcrypt.hash(propietarioData.password, 10);
        }

        await propietario.update(propietarioData);

        const { password: _, ...propietarioSinPassword } = propietario.toJSON();
        return propietarioSinPassword;
    }

    async deletePropietarioByIdentificacion(identificacion) {
        const propietario = await Propietario.findOne({
            where: { identificacion: identificacion }
        });

        if (!propietario) {
            throw { status: 404, message: 'Propietario no encontrado.' };
        }

        // Antes de eliminar el propietario (y que CASCADE elimine vehículos),
        // necesitamos eliminar los archivos asociados a sus mantenimientos y obligaciones legales.
        const vehiculos = await Vehiculo.findAll({ where: { propietarioId: propietario.id } });

        for (const vehiculo of vehiculos) {
            // Eliminar archivos de mantenimientos
            const mantenimientos = await Mantenimiento.findAll({ where: { vehiculoId: vehiculo.id } });
            for (const mant of mantenimientos) {
                if (mant.facturaPath) {
                    await fs.unlink(path.resolve(mant.facturaPath)).catch(err => console.warn(`Error al eliminar factura de mantenimiento ${mant.id}: ${err.message}`));
                }
            }

            // Eliminar archivos de obligaciones legales
            const obligacionesL = await ObligacionesL.findAll({ where: { vehiculoId: vehiculo.id } });
            for (const obl of obligacionesL) {
                if (obl.archivoPath) {
                    await fs.unlink(path.resolve(obl.archivoPath)).catch(err => console.warn(`Error al eliminar archivo de obligación legal ${obl.id}: ${err.message}`));
                }
            }
        }

        // Ahora eliminar el propietario, lo que por CASCADE eliminará vehículos, mantenimientos y obligaciones legales.
        await propietario.destroy();
        return { message: 'Propietario eliminado exitosamente, junto con todos sus datos asociados y archivos.' };
    }
}

export default new PropietarioService();