import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { PulseService } from "../services/pulse.service.js";
import { PULSE } from "../protocols/PULSE.node.js";
import { CError } from "../helpers/cError.js";

export class PulseController {
    constructor() {
        this.service = new PulseService();
    }

    /**
     * Rilascia un Pulse Privileged Token
     */
    pulsePrivilegedToken = asyncHandler(async (req, res) => {
        const ppt = await this.service.createPulsePrivilegedToken({ payload: req.user });
        // -- imposto il cookie
        res.cookie("ppt", ppt, {
            httpOnly: true,
            secure: true,
            maxAge: PULSE.pptLifetime * 1000,
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
        const { kid, uid: userId } = req.user;
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
        const [affectedCount] = await this.service.update({ kid: kid, user_id: req.user.uid }, { device_name: name });
        res.status(200).json({ count: affectedCount });
    });

    /**
     * Elimina una sessione specifica
     */
    deleteSession = asyncHandler(async (req, res) => {
        const { kid } = req.params;
        if (!kid) throw new CError("", "Session id not found", 400);
        // -- verifico che non sia la sessione corrente
        const currentKid = await this.service.pulse.calculateKid(req.user.kid);
        if (kid === currentKid) throw new CError("", "It is not possible to destroy the current session; instead, a signout must be performed", 400);
        // ---
        const deleted = await this.service.delete({ kid: kid, user_id: req.user.uid });
        res.status(200).json({ count: deleted });
    });

    /**
     * Elimina tutte le sessioni tranne la corrente
     */
    deleteAllSession = asyncHandler(async (req, res) => {
        const deleted = await this.service.deleteAll({ kid: req.user.kid, user_id: req.user.uid });
        res.status(200).json({ count: deleted });
    });
}
