"use client";

import type { QueueSource } from "@/lib/music/types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatClock(seconds: number) {
  return formatDuration(seconds * 1000);
}

export function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

export function sanitizeFileSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function makeQueueSource(playlistId?: string | null): QueueSource {
  return playlistId ? `playlist:${playlistId}` : "all";
}

export function parseQueueSource(queueSource: string | null | undefined) {
  if (queueSource?.startsWith("playlist:")) {
    return {
      kind: "playlist" as const,
      playlistId: queueSource.slice("playlist:".length),
    };
  }

  return {
    kind: "all" as const,
    playlistId: null,
  };
}
