import { DataTypes } from "sequelize";
import { sequelize } from "../lib/db.js";
import { v7 as uuidv7 } from 'uuid';

export const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv7(),
            primaryKey: true,
        },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
        tableName: "user",
        timestamps: true,
        underscored: true,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
    }
);
