import { promises as fs } from "fs";
import os from "os";
import path from "path";

export async function createTempDirectory(videoId: string) {
  const dir = path.join(os.tmpdir(), "video-transcoder", videoId);

  await fs.mkdir(dir, { recursive: true });

  return dir;
}

export async function removeTempDirectory(dir: string) {
  await fs.rm(dir, {
    recursive: true,
    force: true,
  });
}