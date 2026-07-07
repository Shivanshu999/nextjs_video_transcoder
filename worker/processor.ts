import path from "path";
import { prisma } from "@/lib/prisma";
import { createTempDirectory, removeTempDirectory } from "./temp";
import { transcodeToHLS } from "./ffmpeg";
import {
  downloadFromS3,
  uploadDirectoryToS3,
} from "@/lib/s3";

export interface VideoJobData {
  videoId: string;
}

export async function processVideo({ videoId }: VideoJobData) {
  console.log(`🎬 Starting ${videoId}`);

  let tempDir = "";

  try {
    // -------------------------
    // Load video
    // -------------------------

    const video = await prisma.video.findUnique({
      where: {
        id: videoId,
      },
    });

    if (!video) {
      throw new Error("Video not found.");
    }

    // -------------------------
    // Update status
    // -------------------------

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        videoStatus: "PROCESSING",
      },
    });

    // -------------------------
    // Temporary directory
    // -------------------------

    tempDir = await createTempDirectory(videoId);

    const inputPath = path.join(tempDir, "input.mp4");

    // -------------------------
    // Download original
    // -------------------------

    await downloadFromS3(video.storageKey, inputPath);

    // -------------------------
    // Generate HLS + thumbnail + duration
    // -------------------------

    const outputDir = path.join(tempDir, "output");

    const { duration } = await transcodeToHLS(inputPath, outputDir);

    // -------------------------
    // Upload HLS variants + master playlist
    // -------------------------

    const hlsPrefix = `processed/${videoId}`;

    await uploadDirectoryToS3(outputDir, hlsPrefix);

    // Note: generateThumbnail() writes thumbnail.jpg inside outputDir,
    // so uploadDirectoryToS3 above already uploaded it to
    // `${hlsPrefix}/thumbnail.jpg`. No separate upload call needed —
    // uploadFileToS3 import above can be removed unless you use it elsewhere.

    // -------------------------
    // Update database
    // -------------------------

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        videoStatus: "READY",
        hlsPath: `${hlsPrefix}/master.m3u8`,
        thumbnail: `${hlsPrefix}/thumbnail.jpg`,
        duration: Math.round(duration),
      },
    });

    console.log("✅ Finished");
  } catch (error) {
    console.error(error);

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        videoStatus: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
  } finally {
    if (tempDir) {
      await removeTempDirectory(tempDir);
    }
  }
}
