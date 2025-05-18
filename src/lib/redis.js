import Redis from "ioredis";
import { Config } from "../serverConfig.js";

// docker run --name redis-dev -p 6379:6379 -d redis
export const redis = new Redis(Config.DEV ? {
    host: Config.REDIS_HOST,
    port: Config.REDIS_PORT,
} : Config.REDIS_URL);

// export const redis = new Redis(Config.REDIS_URL);