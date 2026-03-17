"use client";

import type { AudioAnalysisResult } from "@/lib/music/types";
import { clamp, stripFileExtension } from "@/lib/music/format";

const SAMPLE_COUNT = 56;

function normalize(samples: number[]) {
  const peak = Math.max(...samples, 0.001);
  return samples.map((sample) => clamp(sample / peak, 0.08, 1));
}

export function extractWaveform(channelData: Float32Array) {
  if (channelData.length === 0) {
    return Array.from({ length: SAMPLE_COUNT }, () => 0.12);
  }

  const blockSize = Math.max(1, Math.floor(channelData.length / SAMPLE_COUNT));
  const values: number[] = [];

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const start = index * blockSize;
    const end = Math.min(channelData.length, start + blockSize);
    let total = 0;

    for (let cursor = start; cursor < end; cursor += 1) {
      total += Math.abs(channelData[cursor] ?? 0);
    }

    const average = total / Math.max(1, end - start);
    values.push(average);
  }

  return normalize(values);
}

async function readDurationFromMetadata(file: File) {
  return await new Promise<number>((resolve) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute("src");
      audio.load();
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const durationMs = Number.isFinite(audio.duration)
        ? Math.round(audio.duration * 1000)
        : 0;
      cleanup();
      resolve(durationMs);
    };
    audio.onerror = () => {
      cleanup();
      resolve(0);
    };
    audio.src = objectUrl;
  });
}

export async function analyzeAudioFile(file: File): Promise<AudioAnalysisResult> {
  const originalFileName = file.name;
  const title = stripFileExtension(file.name) || "Untitled track";
  const arrayBuffer = await file.arrayBuffer();

  let durationMs = 0;
  let waveform = { samples: Array.from({ length: SAMPLE_COUNT }, () => 0.12) };

  const AudioContextCtor =
    typeof window !== "undefined"
      ? window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      : undefined;

  if (AudioContextCtor) {
    const context = new AudioContextCtor();

    try {
      const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
      durationMs = Math.round(decoded.duration * 1000);
      waveform = {
        samples: extractWaveform(decoded.getChannelData(0)),
      };
    } catch {
      durationMs = 0;
    } finally {
      await context.close();
    }
  }

  if (!durationMs) {
    durationMs = await readDurationFromMetadata(file);
  }

  return {
    durationMs,
    waveform,
    title,
    originalFileName,
  };
}
