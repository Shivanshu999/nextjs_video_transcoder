"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<{ height: number; index: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = auto

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const parsedLevels = hls.levels.map((level, index) => ({
          height: level.height,
          index,
        }));
        // Sort descending: 1080p, 720p, 480p, 360p
        parsedLevels.sort((a, b) => b.height - a.height);
        setLevels(parsedLevels);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error("HLS error:", data);
        if (data.fatal) {
          setError(`Playback error: ${data.details}`);
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      setError("HLS playback is not supported in this browser.");
    }
  }, [src]);

  function handleQualityChange(levelIndex: number) {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex; // -1 = auto
      setCurrentLevel(levelIndex);
    }
  }

  return (
    <div>
      <video
        ref={videoRef}
        controls
        className="w-full rounded-lg bg-black"
      />

      {levels.length > 0 && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="text-gray-500">Quality:</span>
          <select
            value={currentLevel}
            onChange={(e) => handleQualityChange(Number(e.target.value))}
            className="rounded border px-2 py-1"
          >
            <option value={-1}>Auto</option>
            {levels.map((level) => (
              <option key={level.index} value={level.index}>
                {level.height}p
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
