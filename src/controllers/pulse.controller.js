import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { ShivService } from "../services/shiv.service.js";
import { SHIV } from "../protocols/SHIV.node.js";
import { CError } from "../helpers/cError.js";

export class ShivController {
    constructor() {
        this.service = new ShivService();
    }

    /**
     * Rilascia un Shiv Privileged Token
     */
    shivPrivilegedToken = asyncHandler(async (req, res) => {
        const ppt = await this.service.createShivPrivilegedToken({ payload: req.payload });
        // -- imposto il cookie
        res.cookie("ppt", ppt, {
            httpOnly: true,
            secure: true,
            maxAge: SHIV.pptLifetime * 1000,
            sameSite: "Strict",
            path: "/",
        });
        // ---
        res.status(201).json({ ppt: ppt });
    });

    /**
     * Restituisce la lista di tutte le sessioni legate ad un utente
     */
    getAllSession = asyncHandler(async (req, res) => {
        // -- ottengo il kid corrente
        const { kid, uid: userId } = req.payload;
        // ---
        const sessions = await this.service.getAllSession(kid, userId);
        res.status(200).json(sessions);
    });

    /**
     * Modifica il nome di un dispositivo associato ad una sessione
     */
    editDeviceName = asyncHandler(async (req, res) => {
        const { kid } = req.params;
        if (!kid) throw new CError("", "Session id not found", 400);
        const { name } = req.body;
        if (!name || name.length > 20) throw new CError("", "Invalid name", 422);
        // ---
        const [affectedCount] = await this.service.update({ kid: kid, user_id: req.payload.uid }, { device_name: name });
        res.status(200).json({ count: affectedCount });
    });

    /**
     * Elimina una sessione specifica
     */
    deleteSession = asyncHandler(async (req, res) => {
        const { kid } = req.params;
        if (!kid) throw new CError("", "Session id not found", 400);
        // -- verifico che non sia la sessione corrente
        const currentKid = await this.service.shiv.calculateKid(req.payload.kid);
        if (kid === currentKid) throw new CError("", "It is not possible to destroy the current session; instead, a signout must be performed", 400);
        // ---
        const deleted = await this.service.delete({ kid: kid, user_id: req.payload.uid });
        res.status(200).json({ count: deleted });
    });

    /**
     * Elimina tutte le sessioni tranne la corrente
     */
    deleteAllSession = asyncHandler(async (req, res) => {
        const deleted = await this.service.deleteAll({ kid: req.payload.kid, user_id: req.payload.uid });
        res.status(200).json({ count: deleted });
    });
}
