import { DataTypes } from 'sequelize';

const defineVehiculo = (sequelize) => {
    const Vehiculo = sequelize.define('Vehiculo', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        placa: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        marca: {
            type: DataTypes.STRING,
            allowNull: false
        },
        modelo: {
            type: DataTypes.STRING,
            allowNull: false
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        color: {
            type: DataTypes.STRING,
            allowNull: true
        },
        propietarioId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'propietarios', // Nombre de la tabla de Propietarios
                key: 'id'
            }
        }
    }, {
        tableName: 'vehiculos',
        timestamps: true
    });
    return Vehiculo;
};

export default defineVehiculo;