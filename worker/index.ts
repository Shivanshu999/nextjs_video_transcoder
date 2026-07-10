import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "@/lib/queue";
import { processVideo } from "./processor";

const worker = new Worker(
  "video-processing",
  async (job) => {
    await processVideo(job.data);
  },
  {
    connection,
  }
);

// Fired when a job completes successfully
worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

// Fired when a job fails
worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed`);
  console.error(err);
});

// Fired when the worker itself encounters an error
worker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("🎬 Worker started");