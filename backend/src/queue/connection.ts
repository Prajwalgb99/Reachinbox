import IORedis, { RedisOptions } from "ioredis";
import { env } from "../config/env";

// BullMQ requires maxRetriesPerRequest: null on its connection options.
export const redisOptions: RedisOptions = process.env.REDIS_URL
  ? ({ maxRetriesPerRequest: null, tls: {} } as any)
  : {
      host: env.redisHost,
      port: env.redisPort,
      maxRetriesPerRequest: null,
    };

export const redisConnection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null, tls: {} })
  : new IORedis({
      host: env.redisHost,
      port: env.redisPort,
      maxRetriesPerRequest: null,
    });

