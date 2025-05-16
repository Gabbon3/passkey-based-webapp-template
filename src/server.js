import express from 'express';
import { sequelize } from './lib/db.js';
import cookieParser from 'cookie-parser';
import './models/associations.js';
import { errorHandlerMiddleware } from './middlewares/errorHandler.middleware.js';
// routes
import passkeyRoutes from './routes/passkey.routes.js';
import staticRoutes from './routes/static.routes.js';
import authRoutes from './routes/auth.routes.js';
import shivRoutes from './routes/shiv.routes.js';
import ckeRoutes from './routes/cke.routes.js';
// ---
import { date } from './utils/date.util.js';

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
app.use('/api/auth', authRoutes);
app.use('/api/shiv', shivRoutes);
app.use('/api/passkey', passkeyRoutes);
app.use('/api/health', (req, res) => {
    res.status(200).json({ message: 'Im fine!' });
});
app.use('/api/cke', ckeRoutes);
/**
 * Pubbliche
 */
app.use('/', staticRoutes);

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
        console.log(`☑️ ${date.format('%j %M %Y - %H:%i')}`);
    });
} catch (error) {
    console.error('❌ Errore durante l\'avvio del server => ' + error);
}