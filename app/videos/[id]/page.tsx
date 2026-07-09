import { prisma } from "@/lib/prisma";
import { VideoPlayer } from "@/app/components/video-player";
import { notFound } from "next/navigation";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const video = await prisma.video.findUnique({ where: { id } });

  if (!video || video.videoStatus !== "READY" || !video.hlsPath) {
    notFound();
  }

  const hlsUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${video.hlsPath}`;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-2xl font-bold">{video.title}</h1>
      <VideoPlayer src={hlsUrl} />
    </main>
  );
}