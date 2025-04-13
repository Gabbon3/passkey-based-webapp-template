import { DataTypes } from "sequelize";
import { sequelize } from "../lib/db.js";
import { v7 as uuidv7 } from 'uuid';

export const RefreshToken = sequelize.define(
    "RefreshToken",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv7(),
            primaryKey: true,
        },
        token_hash: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
            comment: "64 caratteri corrispondono ad una stringa hex da 32 byte",
        },
        user_id: { 
            type: DataTypes.UUID,
            allowNull: false 
        },
        device_name: {
            type: DataTypes.STRING(25),
            allowNull: false,
            defaultValue: "New device *",
        },
        user_agent_hash: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "MD5",
        },
        user_agent_summary: { type: DataTypes.STRING(100), allowNull: false },
        ip_address: { type: DataTypes.STRING(45) },
        iat: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: "Data di creazione del token",
        },
        last_used_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        is_revoked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        tableName: "refresh_token",
        timestamps: false,
        underscored: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
    }
);