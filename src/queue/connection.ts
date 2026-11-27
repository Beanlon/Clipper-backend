import IORedis from "ioredis";
import { config } from "../lib/config";

let connection: IORedis | null = null;

/** Shared Redis connection for BullMQ (lazy). */
export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }
  return connection;
}

export async function connectRedis(): Promise<IORedis> {
  const redis = getRedisConnection();
  if (redis.status === "wait" || redis.status === "end") {
    await redis.connect();
  }
  return redis;
}
