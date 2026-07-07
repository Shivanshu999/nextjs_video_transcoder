import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import { promises as fs } from "fs";
import { createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import mime from "mime-types";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
});

const BUCKET = process.env.AWS_BUCKET_NAME!;

async function streamToFile(stream: Readable, filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  return new Promise<void>((resolve, reject) => {
    const writeStream = createWriteStream(filePath);

    stream.pipe(writeStream);

    stream.on("error", reject);
    writeStream.on("error", reject);

    writeStream.on("finish", () => resolve());
  });
}

/**
 * Download one object from S3.
 */
export async function downloadFromS3(
  key: string,
  destination: string
) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const response = await s3.send(command);

  if (!response.Body) {
    throw new Error("S3 object has no body.");
  }

  await streamToFile(response.Body as Readable, destination);

  return destination;
}

/**
 * Upload one local file.
 */
export async function uploadFileToS3(
  filePath: string,
  key: string
) {
  const body = await fs.readFile(filePath);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType:
      mime.lookup(filePath) || "application/octet-stream",
  });

  await s3.send(command);
}

/**
 * Delete one object.
 */
export async function deleteFromS3(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3.send(command);
}

/**
 * Upload an entire directory recursively.
 */
export async function uploadDirectoryToS3(
  localDirectory: string,
  s3Prefix: string
) {
  const entries = await fs.readdir(localDirectory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(localDirectory, entry.name);

    if (entry.isDirectory()) {
      await uploadDirectoryToS3(
        fullPath,
        `${s3Prefix}/${entry.name}`
      );
      continue;
    }

    const key = `${s3Prefix}/${entry.name}`;

    await uploadFileToS3(fullPath, key);
  }
}