import path from "path";

import { prisma } from "@/lib/prisma";

import {
  downloadFromS3,
  uploadDirectoryToS3,
} from "@/lib/s3";

import {
  createTempDirectory,
  removeTempDirectory,
} from "./temp";

import { transcodeToHLS } from "./ffmpeg";

export interface VideoJobData {
  videoId: string;
}

export async function processVideo({
  videoId,
}: VideoJobData) {
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

    const inputPath = path.join(
      tempDir,
      "input.mp4"
    );

    // -------------------------
    // Download original
    // -------------------------

    await downloadFromS3(
      video.storageKey,
      inputPath
    );

    // -------------------------
    // Generate HLS
    // -------------------------

    const outputDir = path.join(
      tempDir,
      "output"
    );

    await transcodeToHLS(
      inputPath,
      outputDir
    );

    // -------------------------
    // Upload HLS
    // -------------------------

    const hlsPrefix = `processed/${videoId}`;

    await uploadDirectoryToS3(
      outputDir,
      hlsPrefix
    );

    // -------------------------
    // Update database
    // -------------------------

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        videoStatus: "READY",

        // Add this field after updating Prisma
        hlsPath: `${hlsPrefix}/master.m3u8`,
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

        // Add after updating Prisma
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
    });
  } finally {
    if (tempDir) {
      await removeTempDirectory(tempDir);
    }
  }
}