// worker/processor.ts

export interface VideoJobData {
  videoId: string;
}

export async function processVideo(job: VideoJobData) {
  console.log("🎬 Processing video:", job.videoId);

  // Step 1: Fetch video metadata from database

  // Step 2: Download original video from S3

  // Step 3: Transcode with FFmpeg

  // Step 4: Upload HLS files to S3

  // Step 5: Update video status to READY

  console.log("✅ Finished processing:", job.videoId);
}