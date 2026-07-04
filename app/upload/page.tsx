"use client";

import { useState } from "react";
import {toast} from "sonner"
export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) {
      toast.error("Please select a video.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Ask backend for a presigned URL
      const uploadRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to get upload URL.");
      }

      const { uploadUrl, storageKey } = await uploadRes.json();

      // Step 2: Upload directly to S3
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!s3Res.ok) {
        throw new Error("Failed to upload to S3.");
      }

      // Step 3: Save metadata in PostgreSQL
      const saveRes = await fetch("/api/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          storageKey,
          mimeType: file.type,
          size: file.size,
        }),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save metadata.");
      }

      toast.success("Video uploaded successfully!");

      setTitle("");
      setFile(null);
    } catch (error) {
      console.error(error);
      toast.error("Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Upload Video
      </h1>

      <div className="space-y-4">
        <input
          className="w-full rounded border p-2"
          placeholder="Video title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="file"
          accept="video/*"
          onChange={(e) => {
            if (e.target.files?.length) {
              setFile(e.target.files[0]);
            }
          }}
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="rounded bg-black px-5 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {file && (
        <div className="mt-6 rounded border p-4">
          <p>
            <strong>Name:</strong> {file.name}
          </p>

          <p>
            <strong>Type:</strong> {file.type}
          </p>

          <p>
            <strong>Size:</strong>{" "}
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}
    </main>
  );
}