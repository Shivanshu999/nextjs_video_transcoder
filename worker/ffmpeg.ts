import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";

export interface Variant {
  name: string;
  width: number;
  height: number;
  bitrate: string;
  maxrate: string;
  bufsize: string;
  bandwidth: number;
}

export interface HLSResult {
  masterPlaylist: string;
  variants: Variant[];
}

export interface ProgressCallback {
  (percent: number): void;
}

export const HLS_VARIANTS: Variant[] = [
  {
    name: "1080p",
    width: 1920,
    height: 1080,
    bitrate: "5000k",
    maxrate: "5350k",
    bufsize: "7500k",
    bandwidth: 5500000,
  },
  {
    name: "720p",
    width: 1280,
    height: 720,
    bitrate: "2800k",
    maxrate: "2996k",
    bufsize: "4200k",
    bandwidth: 3000000,
  },
  {
    name: "480p",
    width: 854,
    height: 480,
    bitrate: "1400k",
    maxrate: "1498k",
    bufsize: "2100k",
    bandwidth: 1500000,
  },
  {
    name: "360p",
    width: 640,
    height: 360,
    bitrate: "800k",
    maxrate: "856k",
    bufsize: "1200k",
    bandwidth: 900000,
  },
];

async function ensureDirectory(dir: string) {
  await fs.mkdir(dir, {
    recursive: true,
  });
}

function variantDirectory(
  outputDir: string,
  variant: Variant
) {
  return path.join(outputDir, variant.name);
}

function playlistPath(
  outputDir: string,
  variant: Variant
) {
  return path.join(
    variantDirectory(outputDir, variant),
    "index.m3u8"
  );
}

function segmentPattern(
  outputDir: string,
  variant: Variant
) {
  return path.join(
    variantDirectory(outputDir, variant),
    "segment_%03d.ts"
  );
}

async function prepareDirectories(
  outputDir: string
) {
  await ensureDirectory(outputDir);

  for (const variant of HLS_VARIANTS) {
    await ensureDirectory(
      variantDirectory(outputDir, variant)
    );
  }
}