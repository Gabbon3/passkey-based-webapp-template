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
export const errorHandlerMiddleware = (error: CError | Error, req: Request, res: Response, next: NextFunction): void => {
    if (error instanceof CError) {
        res.status(error.statusCode).json({ error: error.message });
    } else {
        // -- errori generici
        console.error(`\n-----\nERROR\n *** \n${error}\n-----\n`);
        res.status(500).json({ error: "Internal Server Error" });
    }
};