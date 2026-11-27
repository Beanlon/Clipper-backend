import { Queue, type JobsOptions } from "bullmq";
import { config } from "../lib/config";
import type { PipelineJobData } from "../types";
import { getRedisConnection } from "./connection";

let pipelineQueue: Queue<PipelineJobData> | null = null;

export function getPipelineQueue(): Queue<PipelineJobData> {
  if (!pipelineQueue) {
    pipelineQueue = new Queue<PipelineJobData>(config.pipelineQueueName, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return pipelineQueue;
}

export async function enqueuePipeline(
  data: PipelineJobData,
  opts?: JobsOptions,
): Promise<string> {
  const queue = getPipelineQueue();
  const job = await queue.add("generate", data, {
    jobId: `pipeline-${data.jobId}`,
    ...opts,
  });
  return job.id ?? data.jobId;
}
