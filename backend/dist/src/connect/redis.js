import { createClient } from "redis";
const REDIS_URL = process.env.REDIS_URL?.trim() || "";
if (!REDIS_URL) {
    console.error("ERROR: REDIS_URL environment variable is not set!");
    console.error("Please set REDIS_URL in your environment variables.");
    console.error("Example: REDIS_URL=redis://localhost:6379");
    process.exit(1);
}
// Upstash Redis uses rediss:// protocol and requires TLS configuration
const isSecureRedis = REDIS_URL.startsWith("rediss://");
export const redis = createClient({
    url: REDIS_URL,
    socket: isSecureRedis ? {
        tls: true,
        rejectUnauthorized: false // Upstash requires this
    } : undefined
});
export async function connectRedis() {
    redis.on("error", (err) => {
        console.error("Redis connection error:", err);
    });
    try {
        await redis.connect();
        // Hide password in logs
        const safeUrl = REDIS_URL.includes('@')
            ? REDIS_URL.replace(/:[^:@]+@/, ':****@')
            : REDIS_URL;
        console.log(`✅ Redis connected to ${safeUrl}`);
    }
    catch (err) {
        console.error("❌ Failed to connect to Redis:", err);
        process.exit(1);
    }
}
