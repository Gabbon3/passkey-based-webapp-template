import { Request, Response, NextFunction } from "express";
import { CError } from "../helpers/cError.js";

/**
 * Gestione degli errori centralizzata
 * @param {CError | Error} error 
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 * @returns 
 */
export const errorHandlerMiddleware = async (error: CError | Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof CError) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    // -- gestione di altri errori generici
    console.error(`\n-----\nERROR\n *** \n${error}\n-----\n`);
    return res.status(500).json({ error: "Internal Server Error" });
};