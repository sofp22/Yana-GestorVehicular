// src/models/mantenimiento.model.js
const defineMantenimiento = (sequelize, DataTypes) => {
    const Mantenimiento = sequelize.define('Mantenimiento', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        tipo: {
            type: DataTypes.STRING,
            allowNull: false
        },
        fecha: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        kilometraje: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        descripcion: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        costo: {
            type: DataTypes.DECIMAL(10, 2), // 10 dígitos en total, 2 después del punto decimal
            allowNull: true
        },
        facturaPath: { // Ruta del archivo en el servidor local
            type: DataTypes.STRING,
            allowNull: true // Puede que no todos los mantenimientos tengan factura
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
        tableName: 'mantenimientos',
        timestamps: true
    });
    return Mantenimiento;
};

export default defineMantenimiento;