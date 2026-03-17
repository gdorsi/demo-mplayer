import { extractWaveform } from "@/lib/music/audio-analysis";
import { describe, expect, it } from "vitest";

describe("extractWaveform", () => {
  it("returns a stable fallback waveform for empty audio data", () => {
    const waveform = extractWaveform(new Float32Array());

    expect(waveform).toHaveLength(56);
    expect(new Set(waveform)).toEqual(new Set([0.12]));
  });

  it("normalizes waveform bars and keeps them within the visual clamp range", () => {
    const waveform = extractWaveform(
      new Float32Array([0, 0.25, -0.5, 0.75, -1, 0.5, -0.25, 0]),
    );

    expect(waveform).toHaveLength(56);
    expect(Math.max(...waveform)).toBe(1);
    expect(Math.min(...waveform)).toBeGreaterThanOrEqual(0.08);
    expect(waveform.some((sample) => sample > 0.08)).toBe(true);
  });
});
