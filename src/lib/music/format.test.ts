import {
  clamp,
  formatClock,
  formatDuration,
  makeQueueSource,
  parseQueueSource,
  sanitizeFileSegment,
  stripFileExtension,
} from "@/lib/music/format";
import { describe, expect, it } from "vitest";

describe("music format helpers", () => {
  it("clamps values inside the provided range", () => {
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(6, 0, 10)).toBe(6);
    expect(clamp(18, 0, 10)).toBe(10);
  });

  it("formats durations using rounded seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(59_600)).toBe("1:00");
    expect(formatClock(125)).toBe("2:05");
  });

  it("removes only the last file extension", () => {
    expect(stripFileExtension("anthem.mp3")).toBe("anthem");
    expect(stripFileExtension("mix.v1.wav")).toBe("mix.v1");
    expect(stripFileExtension("README")).toBe("README");
  });

  it("sanitizes upload path segments consistently", () => {
    expect(sanitizeFileSegment("  Summer Nights!!.mp3  ")).toBe("summer-nights-mp3");
    expect(sanitizeFileSegment("___")).toBe("");
    expect(sanitizeFileSegment("A".repeat(80))).toBe("a".repeat(48));
  });

  it("creates and parses queue sources for playlists and the global queue", () => {
    expect(makeQueueSource()).toBe("all");
    expect(makeQueueSource("playlist-123")).toBe("playlist:playlist-123");

    expect(parseQueueSource("playlist:playlist-123")).toEqual({
      kind: "playlist",
      playlistId: "playlist-123",
    });
    expect(parseQueueSource("all")).toEqual({
      kind: "all",
      playlistId: null,
    });
    expect(parseQueueSource(undefined)).toEqual({
      kind: "all",
      playlistId: null,
    });
  });
});
