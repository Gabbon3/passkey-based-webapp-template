import { User } from "./user.model.js";
import { Passkey } from "./passkey.model.js";
import { AuthKeys } from "./authKeys.model.js";

/*
 * In questo file sono presenti tutte le relazioni
 */

// Relazione 1 utente - N refresh token
User.hasMany(AuthKeys, { 
    foreignKey: "user_id", 
    onDelete: "CASCADE",
});
AuthKeys.belongsTo(User, { 
    foreignKey: "user_id", 
    onDelete: "CASCADE",
});

// Relazione 1 utente - N passkey
User.hasMany(Passkey, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
});
Passkey.belongsTo(User, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
});