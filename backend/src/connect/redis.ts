import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = createClient({
    url: REDIS_URL
});

export async function connectRedis() {
    redis.on("error", console.error);
    await redis.connect();
    console.log(`Redis connected to ${REDIS_URL}`)
}