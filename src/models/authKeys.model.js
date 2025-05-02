import { DataTypes } from "sequelize";
import { sequelize } from "../lib/db.js";

export const AuthKeys = sequelize.define(
    "AuthKeys",
    {
        kid: {
            type: DataTypes.UUID,
            primaryKey: true,
        },
        secret: {
            type: DataTypes.STRING(64), // oppure BLOB(32) se binario
            allowNull: false,
        },
        last_seen_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "auth_keys",
        timestamps: false,
        underscored: true,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
    }
);