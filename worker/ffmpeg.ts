import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";

export async function transcodeToHLS(
  inputPath: string,
  outputDir: string
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-preset veryfast",
        "-g 48",
        "-sc_threshold 0",
        "-hls_time 6",
        "-hls_playlist_type vod",
        "-hls_segment_filename",
        path.join(outputDir, "segment_%03d.ts"),
      ])
      .output(path.join(outputDir, "master.m3u8"))
      .on("start", (command) => {
        console.log("FFmpeg started");
        console.log(command);
      })
      .on("progress", (progress) => {
        console.log(`Progress: ${progress.percent ?? 0}%`);
      })
      .on("end", () => {
        console.log("Transcoding complete");
        resolve(path.join(outputDir, "master.m3u8"));
      })
      .on("error", (err) => {
        reject(err);
      })
      .run();
  });
}