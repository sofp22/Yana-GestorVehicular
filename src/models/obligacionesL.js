import { DataTypes } from 'sequelize';

export default (sequelize) => {
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
        descripcion: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        fechaVencimiento: { // Asegúrate de tener este campo para la vigencia
            type: DataTypes.DATEONLY, 
            allowNull: true
        },
        documentoPath: { // Ruta del archivo subido
            type: DataTypes.STRING,
            allowNull: true
        },
        vehiculoId: { // Clave Foránea
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'vehiculos',
                key: 'id'
            }
        }
    });
    return ObligacionesL;
};