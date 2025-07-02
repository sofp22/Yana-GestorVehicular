import { DataTypes } from 'sequelize';

export default (sequelize) => {
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
            type: DataTypes.DATE,
            allowNull: false
        },
        fechaVencimiento: {
            type: DataTypes.DATE,
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
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        facturaPath: { // Ruta del archivo subido
            type: DataTypes.STRING,
            allowNull: true
        },
        vehiculoId: { // Clave Foránea a Vehiculo
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'vehiculos', // Nombre de la tabla a la que hace referencia
                key: 'id'
            }
        },
        tallerMecanicoId: { // Nueva Clave Foránea a TallerMecanico (opcional si es un propietario quien registra)
            type: DataTypes.UUID,
            allowNull: true, // Puede ser nulo si el registro lo hace el propietario directamente
            references: {
                model: 'TallerMecanicos', // Nombre de la tabla a la que hace referencia
                key: 'id'
            }
        }
    });
    return Mantenimiento;
};