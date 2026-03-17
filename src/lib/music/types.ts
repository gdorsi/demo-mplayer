"use client";

import type { AppSchema } from "@/instant.schema";
import { InstaQLEntity } from "@instantdb/react";

type FileRecord = InstaQLEntity<AppSchema, "$files">;

export type Track = InstaQLEntity<AppSchema, "tracks"> & {
  file?: FileRecord;
};
export type Playlist = InstaQLEntity<AppSchema, "playlists">;
export type PlaylistItem = InstaQLEntity<AppSchema, "playlistItems"> & {
  playlist?: Playlist;
  track?: Track;
};
export type PlayerState = InstaQLEntity<AppSchema, "playerStates"> & {
  user?: InstaQLEntity<AppSchema, "$users">;
  activeTrack?: Track;
  activePlaylist?: Playlist;
};
export type PlaylistShare = InstaQLEntity<
  AppSchema,
  "playlistShares",
  { playlist: {}; owner: {} }
>;
export type QueueSource = "all" | `playlist:${string}`;

export interface AudioAnalysisResult {
  durationMs: number;
  waveform: { samples: number[] };
  title: string;
  originalFileName: string;
}
