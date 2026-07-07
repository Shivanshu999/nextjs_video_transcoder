import { Worker } from "bullmq";
import { connection } from "@/lib/queue";
import { processVideo } from "./processor";


new Worker(
  "video-processing",
  async (job) => {
    await processVideo(job.data);
  },
  {
    connection,
  }
);

console.log("🎬 Worker started");