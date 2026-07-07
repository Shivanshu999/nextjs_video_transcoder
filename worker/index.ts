import { Worker } from "bullmq";
import { connection } from "@/lib/queue";

new Worker(
  "video-processing",
  async (job) => {
    console.log(`Processing video: ${job.data.videoId}`);
  },
  {
    connection,
  }
);

console.log("🎬 Worker started");