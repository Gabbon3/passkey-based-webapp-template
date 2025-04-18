import express from 'express';
import { sequelize } from './lib/db.js';
import cookieParser from 'cookie-parser';
import './models/associations.js';
import { errorHandlerMiddleware } from './middlewares/errorHandler.middleware.js';
// import { Config } from './serverConfig.js';

/**
 * MIDDLEWARES
 * qui ci sono i middleware che verranno utilizzati in tutte le routes
 */
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
// ---


/**
 * ROUTES
 */

/**
 * Pubbliche
 */
// app.use('/', static_routes);

/**
 * Middlewares per gli errori
 */
app.use(errorHandlerMiddleware);

/**
 * Middlewares per gli errori
 */
// app.use(error_handler_middleware);
/**
 * HTTP
 */
try {
    await sequelize.authenticate();
    console.log('☑️ DB');
    // -- da utilizzare solo quando ci si vuole allineare con il db
    // await sequelize.sync({ force: true });
    // console.log('☑️ Struct');
    // ---
    app.listen(3000, '0.0.0.0', () => {
        console.log(`☑️ Server`);
    });
} catch (error) {
    console.error('❌ Errore durante l\'avvio del server => ' + error);
}