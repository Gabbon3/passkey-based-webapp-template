import { DataTypes } from "sequelize";
import { sequelize } from "../lib/db.js";

/**
 * Sul db bisogna creare l'indice hash e l'indice unico:
 * CREATE INDEX idx_auth_keys_kid_hash ON auth_keys USING hash(kid);
 * CREATE UNIQUE INDEX idx_auth_keys_kid_unique ON auth_keys(kid);
 */
export const AuthKeys = sequelize.define(
    "AuthKeys",
    {
        kid: {
            type: DataTypes.STRING(64),
            primaryKey: true,
            comment: "Calcolato con hmac(guid, pepper) - 64 caratteri esadecimali",
        },
        secret: {
            type: DataTypes.STRING(64), // oppure BLOB(32) se binario
            allowNull: false,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
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