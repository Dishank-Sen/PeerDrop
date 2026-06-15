import { redis } from "../connect/redis.js";
import { RedisStore } from "./redis_store.js";

export const store = new RedisStore(redis)