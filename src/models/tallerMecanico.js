import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const TallerMecanico = sequelize.define('TallerMecanico', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        nitOCedula: { // Para identificar el taller (NIT o Cédula)
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        nombre: {
            type: DataTypes.STRING,
            allowNull: false
        },
        direccion: {
            type: DataTypes.STRING,
            allowNull: true
        },
        telefono: {
            type: DataTypes.STRING,
            allowNull: true
        },
        correo: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
            validate: {
                isEmail: true
            }
        }
    });

    return TallerMecanico;
};