import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { CError } from "../helpers/cError.js";
import { Bytes } from "../utils/bytes.util.js";
import { Cripto } from "../utils/cripto.util.js";

export class CKEController {
    static cookieLifetime = 365 * 24 * 60 * 60 * 1000;
    constructor() {}
    /**
     * Rigenera del nuovo materiale cookie restituendo quello vecchio se presente
     * @param {Request} req
     * @param {Response} res
     */
    set = asyncHandler(async (req, res) => {
        const old = {
            basic: req.cookies["cke-basic"],
            advanced: req.cookies["cke-advanced"],
        };
        const cripto = new Cripto();
        const newMaterialBasic = cripto.randomBytes(32, "hex");
        const newMaterialAdvanced = cripto.randomBytes(32, "hex");
        // ---
        res.cookie("cke-basic", newMaterialBasic, {
            httpOnly: true,
            secure: true,
            maxAge: CKEController.cookieLifetime,
            sameSite: "None",
            path: "/cke/get",
        });
        res.cookie("cke-advanced", newMaterialAdvanced, {
            httpOnly: true,
            secure: true,
            maxAge: CKEController.cookieLifetime,
            sameSite: "None",
            path: "/cke/get/advanced",
        });
        // -- calcolo e restituisco anche il materiale avanzato
        const key = await cripto.HKDF(
            Bytes.hex.decode(newMaterialAdvanced),
            Bytes.hex.decode(newMaterialBasic)
        );
        // ---
        res.status(201).json({ old, new: { basic: newMaterialBasic, advanced: Bytes.hex.encode(key) } });
    });
    /**
     * Restituisce il materiale corrente in base64
     * @param {Request} req
     * @param {Response} res
     */
    getBasic = asyncHandler(async (req, res) => {
        const material = req.cookies['cke-basic'];
        // --- id dell'utente
        if (!material)
            throw new CError("NotFoundError", "Material not found", 404);
        // ---
        res.status(200).json({ material });
    });
    /**
     * Restituisce una chiave simmetrica derivata da materiale basic + advanced
     * @param {Request} req
     * @param {Response} res
     */
    getAdvanced = asyncHandler(async (req, res) => {
        const materials = {
            basic: req.cookies["cke-basic"],
            advanced: req.cookies["cke-advanced"],
        };
        // --- id dell'utente
        if (!materials.basic || !materials.advanced)
            throw new CError("NotFoundError", "Materials not found", 404);
        // -- converto in Uint8
        const basicBytes = Bytes.hex.decode(materials.basic);
        const advancedBytes = Bytes.hex.decode(materials.advanced);
        // -- calcolo la chiave
        const cripto = new Cripto();
        const key = await cripto.HKDF(advancedBytes, basicBytes);
        // ---
        res.status(200).json({ key: Bytes.hex.encode(key) });
    });
}