export class CError extends Error {
    name: string;
    statusCode: number;

    constructor(name: string, message: string, statusCode: number = 500) {
        super(message);
        this.name = name;
        this.statusCode = statusCode;
    }
}