// src/models/obligacionesL.model.js
const defineObligacionesL = (sequelize, DataTypes) => {
    const ObligacionesL = sequelize.define('ObligacionesL', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        nombre: {
            type: DataTypes.STRING,
            allowNull: false
        },
        tipo: {
            type: DataTypes.STRING,
            allowNull: false
        },
        fechaEmision: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        fechaRenovacion: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        archivoPath: { // Ruta del archivo en el servidor local
            type: DataTypes.STRING,
            allowNull: false
        },
        vehiculoId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'vehiculos', // Nombre de la tabla de Vehiculos
                key: 'id'
            }
        }
    }, {
        tableName: 'obligaciones_l', // Nombre de la tabla en PostgreSQL
        timestamps: true
    });
    return ObligacionesL;
};

export default defineObligacionesL;