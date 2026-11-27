import { Worker } from "bullmq";
import { config } from "../lib/config";
import { connectRedis } from "../queue/connection";
import type { PipelineJobData } from "../types";
import { runPipeline } from "./runPipeline";

async function main(): Promise<void> {
  await connectRedis();

  const worker = new Worker<PipelineJobData>(
    config.pipelineQueueName,
    async (job) => {
      console.log(`[worker] start ${job.name} jobId=${job.data.jobId}`);
      await runPipeline(job.data);
      console.log(`[worker] done jobId=${job.data.jobId}`);
    },
    {
      connection: await connectRedis(),
      concurrency: 1,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] failed jobId=${job?.data.jobId}`, err);
  });

  console.log(`[worker] listening on queue=${config.pipelineQueueName}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
