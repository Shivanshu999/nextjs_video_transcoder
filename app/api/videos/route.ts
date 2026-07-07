import { prisma } from "@/lib/prisma";
import { videoQueue } from "@/lib/queue";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createVideoSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  storageKey: z.string().min(1, "Storage key is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  size: z.number().positive("Size must be a positive number"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = createVideoSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { title, storageKey, mimeType, size } = result.data;

    const video = await prisma.video.create({
      data: {
        title,
        storageKey,
        mimeType,
        size: BigInt(size),
        videoStatus: "UPLOADED",
      },
    });

    // Add background processing job
    await videoQueue.add(
      "transcode-video",
      {
        videoId: video.id,
      },
      {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );

    return NextResponse.json( {...video, size: video.size.toString()}, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}