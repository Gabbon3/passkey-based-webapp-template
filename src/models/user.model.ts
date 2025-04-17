// models/User.ts
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { v7 as uuidv7 } from 'uuid';

export class User extends Model {
    declare id: string;
    declare email: string;
    declare verified: boolean;
}

User.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv7(),
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    sequelize,
    modelName: "User",
    tableName: "user",
    timestamps: true,
    underscored: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
});