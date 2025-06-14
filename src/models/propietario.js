// src/models/propietario.model.js
const definePropietario = (sequelize, DataTypes) => {
    const Propietario = sequelize.define('Propietario', {
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
        identificacion: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        correo: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true // Valida formato de email
            }
        },
        celular: {
            type: DataTypes.STRING,
            allowNull: true // Puede ser nulo
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'propietarios',
        timestamps: true // Habilita createdAt y updatedAt
    });
    return Propietario;
};

export default definePropietario;