import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
export const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Limit reconnection retries to 3 attempts, then stop
      if (retries >= 3) {
        return false;
      }
      return 1000; // Retry after 1s
    }
  }
});

redisClient.on("error", () => {
  // Silent error handler to suppress unhandled socket connection warnings
});

let isRedisConnected = false;

export async function connectRedis() {
  try {
    await redisClient.connect();
    isRedisConnected = true;
    console.log("Connected to Redis successfully.");
  } catch (error: any) {
    // Silent fail if local Redis server is not running
  }
}

export async function getCache(key: string): Promise<string | null> {
  if (!isRedisConnected) return null;
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

export async function setCache(key: string, value: string, expirationSeconds = 3600): Promise<void> {
  if (!isRedisConnected) return;
  try {
    await redisClient.set(key, value, {
      EX: expirationSeconds,
    });
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

export async function invalidateCache(key: string): Promise<void> {
  if (!isRedisConnected) return;
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error("Redis del error:", error);
  }
}
