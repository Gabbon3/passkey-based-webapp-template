import { Sequelize } from 'sequelize';
import { Config } from '../serverConfig.js';

export const sequelize = new Sequelize(
    Config.DB_NAME,
    Config.DB_USER,
    Config.DB_PASSWORD,
    {
        host: Config.DB_HOST,
        dialect: 'postgres',
        dialectOptions: {
            useUTC: true,
        },
        logging: false,
        timezone: '+00:00',
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        }
    }
);