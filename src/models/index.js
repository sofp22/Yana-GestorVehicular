import { Sequelize } from 'sequelize';
//import config from '../config/db.config.js';

import dotenv from 'dotenv';
dotenv.config();

import PropietarioModel from './propietario.js';
import VehiculoModel from './vehiculo.js';
import MantenimientoModel from './mantenimiento.js';
import ObligacionesLModel from './obligacionesL.js';
import TallerMecanicoModel from './tallerMecanico.js'; 

const DATABASE_URL = process.env.DATABASE_URL;

// Añade un log aquí para verificar que la URL es una string antes de pasarla a Sequelize
console.log('DEBUG: DATABASE_URL en models/index.js:', DATABASE_URL);

if (!DATABASE_URL) {
  // Lanza un error más descriptivo si la URL sigue siendo undefined
  throw new Error("DATABASE_URL no está definida. Asegúrate de que tu archivo .env esté configurado y dotenv.config() se ejecute temprano en server.js.");
}

const sequelize = new Sequelize(DATABASE_URL, { // <-- Usa la variable directamente
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },


  logging: false // Deshabilita los logs de Sequelize si no los necesitas
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Inicializa los modelos
db.models = {
  Propietario: PropietarioModel(sequelize),
  Vehiculo: VehiculoModel(sequelize),
  Mantenimiento: MantenimientoModel(sequelize),
  ObligacionesL: ObligacionesLModel(sequelize),
  TallerMecanico: TallerMecanicoModel(sequelize) 
};

// Define las asociaciones

// Propietario - Vehiculo (Un propietario tiene muchos vehículos)
db.models.Propietario.hasMany(db.models.Vehiculo, {
  foreignKey: 'propietarioId',
  as: 'vehiculos'
});
db.models.Vehiculo.belongsTo(db.models.Propietario, {
  foreignKey: 'propietarioId',
  as: 'propietario'
});

// Vehiculo - Mantenimiento (Un vehículo tiene muchos mantenimientos)
db.models.Vehiculo.hasMany(db.models.Mantenimiento, {
  foreignKey: 'vehiculoId',
  as: 'mantenimientos'
});
db.models.Mantenimiento.belongsTo(db.models.Vehiculo, {
  foreignKey: 'vehiculoId',
  as: 'vehiculo'
});

// Vehiculo - ObligacionesL (Un vehículo tiene muchas obligaciones legales)
db.models.Vehiculo.hasMany(db.models.ObligacionesL, {
  foreignKey: 'vehiculoId',
  as: 'obligacionesLegales'
});
db.models.ObligacionesL.belongsTo(db.models.Vehiculo, {
  foreignKey: 'vehiculoId',
  as: 'vehiculo'
});

// NUEVA ASOCIACIÓN: TallerMecanico - Mantenimiento (Un taller puede realizar muchos mantenimientos)
db.models.TallerMecanico.hasMany(db.models.Mantenimiento, {
  foreignKey: 'tallerMecanicoId',
  as: 'mantenimientosRealizados'
});
db.models.Mantenimiento.belongsTo(db.models.TallerMecanico, {
  foreignKey: 'tallerMecanicoId',
  as: 'tallerMecanico'
});


export default db;