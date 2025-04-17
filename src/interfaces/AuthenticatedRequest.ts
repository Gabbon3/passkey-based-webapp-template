export interface AuthenticatedRequest extends Request {
    user: {
        uid: number;
        email: string;
    };
    cookies: {
        uid?: string;
        [key: string]: any; // opzionale, per flessibilità
    };
}