import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promises as fsPromises } from "fs";

export interface Variant {
  name: string;
  width: number;
  height: number;
  videoBitrate: string;
  maxRate: string;
  bufferSize: string;
  bandwidth: number;
}

export interface HLSResult {
  masterPlaylist: string;
  variants: Variant[];
}

export interface ProgressInfo {
  frame?: number;
  fps?: number;
  bitrate?: string;
  speed?: string;
  percent?: number;
}

export type ProgressCallback = (
  progress: ProgressInfo
) => void;

export const HLS_VARIANTS: Variant[] = [
  {
    name: "1080p",
    width: 1920,
    height: 1080,
    videoBitrate: "5000k",
    maxRate: "5350k",
    bufferSize: "7500k",
    bandwidth: 5500000,
  },
  {
    name: "720p",
    width: 1280,
    height: 720,
    videoBitrate: "2800k",
    maxRate: "2996k",
    bufferSize: "4200k",
    bandwidth: 3000000,
  },
  {
    name: "480p",
    width: 854,
    height: 480,
    videoBitrate: "1400k",
    maxRate: "1498k",
    bufferSize: "2100k",
    bandwidth: 1500000,
  },
  {
    name: "360p",
    width: 640,
    height: 360,
    videoBitrate: "800k",
    maxRate: "856k",
    bufferSize: "1200k",
    bandwidth: 900000,
  },
];

const AUDIO_BITRATE = "128k";
const SEGMENT_DURATION = 6;


// ─────────────────────────────────────────────
// Master playlist generation
// ─────────────────────────────────────────────

function buildMasterPlaylist(variants: Variant[]): string {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:3"];

  for (const variant of variants) {
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.width}x${variant.height}`
    );
    lines.push(`${variant.name}/index.m3u8`);
  }

  return lines.join("\n") + "\n";
}


async function ensureDirectory(dir: string) {
  await fs.mkdir(dir, {
    recursive: true,
  });
}

export async function prepareOutputDirectories(
  outputDir: string
) {
  await ensureDirectory(outputDir);

  for (const variant of HLS_VARIANTS) {
    await ensureDirectory(
      path.join(outputDir, variant.name)
    );
  }
}

export function variantDirectory(
  outputDir: string,
  variant: Variant
) {
  return path.join(
    outputDir,
    variant.name
  );
}

export function playlistPath(
  outputDir: string,
  variant: Variant
) {
  return path.join(
    variantDirectory(outputDir, variant),
    "index.m3u8"
  );
}

export function segmentPattern(
  outputDir: string,
  variant: Variant
) {
  return path.join(
    variantDirectory(outputDir, variant),
    "segment_%03d.ts"
  );
}

function parseProgress(
  line: string
): ProgressInfo | null {
  if (!line.includes("frame=")) {
    return null;
  }

  const frame =
    /frame=\s*(\d+)/.exec(line)?.[1];

  const fps =
    /fps=\s*([\d.]+)/.exec(line)?.[1];

  const bitrate =
    /bitrate=\s*([^\s]+)/.exec(line)?.[1];

  const speed =
    /speed=\s*([^\s]+)/.exec(line)?.[1];

  return {
    frame: frame ? Number(frame) : undefined,
    fps: fps ? Number(fps) : undefined,
    bitrate,
    speed,
  };
}

interface FFmpegOptions {
  args: string[];
  onProgress?: ProgressCallback;
}

export function runFFmpeg({
  args,
  onProgress,
}: FFmpegOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-y",
        ...args,
      ],
      {
        stdio: [
          "ignore",
          "ignore",
          "pipe",
        ],
      }
    );

    let stderr = "";

    ffmpeg.stderr.setEncoding("utf8");

    ffmpeg.stderr.on(
      "data",
      (chunk: string) => {
        stderr += chunk;

        const lines = chunk
          .split("\n")
          .filter(Boolean);

        for (const line of lines) {
          const progress =
            parseProgress(line);

          if (
            progress &&
            onProgress
          ) {
            onProgress(progress);
          }
        }
      }
    );

    ffmpeg.on(
      "error",
      reject
    );

    ffmpeg.on(
      "close",
      (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            `FFmpeg exited with code ${code}\n\n${stderr}`
          )
        );
      }
    );
  });
}

export async function fileExists(
  file: string
) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export {
  AUDIO_BITRATE,
  SEGMENT_DURATION,
};


/**
 * Encode a single HLS variant.
 *
 * Example output:
 *
 * output/
 *   720p/
 *      index.m3u8
 *      segment_000.ts
 *      segment_001.ts
 *      ...
 */
export async function transcodeVariant(
  inputFile: string,
  outputDir: string,
  variant: Variant,
  onProgress?: ProgressCallback
): Promise<void> {
  const playlist = playlistPath(outputDir, variant);

  const segments = segmentPattern(
    outputDir,
    variant
  );

  const scaleFilter =
    `scale=w=${variant.width}:h=${variant.height}:` +
    `force_original_aspect_ratio=decrease,` +
    `pad=${variant.width}:${variant.height}:(ow-iw)/2:(oh-ih)/2`;

  await runFFmpeg({
    onProgress,

    args: [
      "-i",
      inputFile,

      // -----------------------------
      // Video
      // -----------------------------
      "-map",
      "0:v:0",

      "-c:v",
      "libx264",

      "-preset",
      "medium",

      "-profile:v",
      "main",

      "-pix_fmt",
      "yuv420p",

      "-vf",
      scaleFilter,

      "-b:v",
      variant.videoBitrate,

      "-maxrate",
      variant.maxRate,

      "-bufsize",
      variant.bufferSize,

      "-g",
      "48",

      "-keyint_min",
      "48",

      "-sc_threshold",
      "0",

      // -----------------------------
      // Audio
      // -----------------------------
      "-map",
      "0:a?",

      "-c:a",
      "aac",

      "-b:a",
      AUDIO_BITRATE,

      "-ac",
      "2",

      "-ar",
      "48000",

      // -----------------------------
      // HLS
      // -----------------------------
      "-f",
      "hls",

      "-hls_time",
      String(SEGMENT_DURATION),

      "-hls_playlist_type",
      "vod",

      "-hls_flags",
      "independent_segments",

      "-hls_segment_type",
      "mpegts",

      "-hls_segment_filename",
      segments,

      playlist,
    ],
  });

  const exists = await fileExists(playlist);

  if (!exists) {
    throw new Error(
      `Failed to generate playlist for ${variant.name}`
    );
  }
}

// ─────────────────────────────────────────────
// Duration probing (requires ffprobe on PATH)
// ─────────────────────────────────────────────

export function getVideoDuration(inputFile: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputFile,
    ]);

    let stdout = "";
    let stderr = "";

    ffprobe.stdout.setEncoding("utf8");
    ffprobe.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    ffprobe.stderr.setEncoding("utf8");
    ffprobe.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    ffprobe.on("error", reject);

    ffprobe.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}\n\n${stderr}`));
        return;
      }

      const duration = parseFloat(stdout.trim());

      if (Number.isNaN(duration)) {
        reject(new Error(`Could not parse duration: "${stdout}"`));
        return;
      }

      resolve(duration);
    });
  });
}
// ─────────────────────────────────────────────
// Thumbnail generation
// ─────────────────────────────────────────────

export async function generateThumbnail(
  inputFile: string,
  outputDir: string,
  atSeconds: number = 1
): Promise<string> {
  const thumbnailPath = path.join(outputDir, "thumbnail.jpg");

  await runFFmpeg({
    args: [
      "-ss", String(atSeconds),
      "-i", inputFile,
      "-frames:v", "1",
      "-q:v", "2",
      thumbnailPath,
    ],
  });

  const exists = await fileExists(thumbnailPath);

  if (!exists) {
    throw new Error("Failed to generate thumbnail");
  }

  return thumbnailPath;
}

// ─────────────────────────────────────────────
// Full HLS transcode orchestrator
// ─────────────────────────────────────────────

export interface TranscodeResult {
  masterPlaylistPath: string;
  thumbnailPath: string;
  duration: number;
}

export async function transcodeToHLS(
  inputFile: string,
  outputDir: string,
  onProgress?: ProgressCallback
): Promise<TranscodeResult> {
  await prepareOutputDirectories(outputDir);

  // Probe duration first — also fails fast if the file is invalid/corrupt
  const duration = await getVideoDuration(inputFile);

  // Transcode each variant sequentially.
  // (Sequential keeps CPU/memory predictable; switch to Promise.all
  // if your worker has cores/memory to spare and you want speed over stability.)
  for (const variant of HLS_VARIANTS) {
    await transcodeVariant(inputFile, outputDir, variant, onProgress);
  }

  // Write the master playlist referencing all variants
  const masterPlaylistPath = path.join(outputDir, "master.m3u8");
  const masterContent = buildMasterPlaylist(HLS_VARIANTS);
  await fsPromises.writeFile(masterPlaylistPath, masterContent, "utf8");

  // Generate a thumbnail from partway into the video (helps avoid black frames at t=0)
  const thumbnailSeconds = duration > 2 ? Math.min(2, duration / 2) : 0;
  const thumbnailPath = await generateThumbnail(inputFile, outputDir, thumbnailSeconds);

  return {
    masterPlaylistPath,
    thumbnailPath,
    duration,
  };
}
