import { Request, Response, NextFunction } from "express";

export const async_handler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
}