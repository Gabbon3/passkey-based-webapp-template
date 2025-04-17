import {
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    Model
} from "sequelize";
import { sequelize } from "../lib/db.js";
import { v7 as uuidv7 } from 'uuid';

export interface PasskeyInstance
    extends Model<InferAttributes<PasskeyInstance>, InferCreationAttributes<PasskeyInstance>> {
    id: string;
    credentialId: string;
    publicKey: string;
    signCount: number;
    name: string;
    userId: string;
    attestationFormat?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export const Passkey = sequelize.define<PasskeyInstance>(
    "Passkey",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv7(),
            primaryKey: true
        },
        credentialId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: "ID univoco della credenziale WebAuth"
        },
        publicKey: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: "Chiave pubblica in binario per verificare le challenge"
        },
        signCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "Contatore di sicurezza per prevenire replay attacks"
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: "New passkey *",
            comment: "Nome della passkey",
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        attestationFormat: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: "Formato della attestation (es. packed, fido-u2f, ecc.)",
        },
    },
    {
        tableName: "passkey",
        timestamps: true,
        underscored: true, // mantiene snake_case nel DB
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
    }
);