// src/models/index.js
import { Sequelize, DataTypes } from 'sequelize';
import sequelize from '../config/db.config.js';

// Importar definiciones de modelos
import definePropietario from './propietario.js';
import defineVehiculo from './vehiculo.js';
import defineMantenimiento from './mantenimiento.js';
import defineObligacionesL from './obligacionesL.js';

const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Inicializar modelos
db.Propietario = definePropietario(sequelize, DataTypes);
db.Vehiculo = defineVehiculo(sequelize, DataTypes);
db.Mantenimiento = defineMantenimiento(sequelize, DataTypes);
db.ObligacionesL = defineObligacionesL(sequelize, DataTypes);

// Definir Relaciones
// Propietario (1) <---> (N) Vehiculo
db.Propietario.hasMany(db.Vehiculo, {
    foreignKey: 'propietarioId',
    as: 'vehiculos',
    onDelete: 'CASCADE'
});
db.Vehiculo.belongsTo(db.Propietario, {
    foreignKey: 'propietarioId',
    as: 'propietario'
});

// Vehiculo (1) <---> (N) Mantenimiento
db.Vehiculo.hasMany(db.Mantenimiento, {
    foreignKey: 'vehiculoId',
    as: 'mantenimientos',
    onDelete: 'CASCADE'
});
db.Mantenimiento.belongsTo(db.Vehiculo, {
    foreignKey: 'vehiculoId',
    as: 'vehiculo'
});

// Vehiculo (1) <---> (N) ObligacionesL
db.Vehiculo.hasMany(db.ObligacionesL, {
    foreignKey: 'vehiculoId',
    as: 'obligacionesL',
    onDelete: 'CASCADE'
});
db.ObligacionesL.belongsTo(db.Vehiculo, {
    foreignKey: 'vehiculoId',
    as: 'vehiculo'
});

export default db;