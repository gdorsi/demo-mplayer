import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Operation = {
  type: "create" | "update" | "delete" | "link" | "unlink";
  payload?: unknown;
};

type Chunk = {
  entity: string;
  id: string;
  operations: Operation[];
  create: (payload: unknown) => Chunk;
  update: (payload: unknown) => Chunk;
  delete: () => Chunk;
  link: (payload: unknown) => Chunk;
  unlink: (payload: unknown) => Chunk;
};

function makeChunk(entity: string, id: string): Chunk {
  const chunk: Chunk = {
    entity,
    id,
    operations: [],
    create(payload) {
      chunk.operations.push({ type: "create", payload });
      return chunk;
    },
    update(payload) {
      chunk.operations.push({ type: "update", payload });
      return chunk;
    },
    delete() {
      chunk.operations.push({ type: "delete" });
      return chunk;
    },
    link(payload) {
      chunk.operations.push({ type: "link", payload });
      return chunk;
    },
    unlink(payload) {
      chunk.operations.push({ type: "unlink", payload });
      return chunk;
    },
  };

  return chunk;
}

function makeCollection(entity: string) {
  return new Proxy(
    {},
    {
      get(_target, key) {
        return makeChunk(entity, String(key));
      },
    },
  ) as Record<string, Chunk>;
}

const {
  transactMock,
  uploadFileMock,
  queryOnceMock,
  analyzeAudioFileMock,
  idMock,
} = vi.hoisted(() => ({
  transactMock: vi.fn(),
  uploadFileMock: vi.fn(),
  queryOnceMock: vi.fn(),
  analyzeAudioFileMock: vi.fn(),
  idMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    transact: transactMock,
    queryOnce: queryOnceMock,
    storage: {
      uploadFile: uploadFileMock,
    },
    tx: {
      playerStates: makeCollection("playerStates"),
      playlists: makeCollection("playlists"),
      playlistItems: makeCollection("playlistItems"),
      tracks: makeCollection("tracks"),
      playlistShares: makeCollection("playlistShares"),
      $files: makeCollection("$files"),
    },
  },
}));

vi.mock("@/lib/music/audio-analysis", () => ({
  analyzeAudioFile: analyzeAudioFileMock,
}));

vi.mock("@instantdb/react", () => ({
  id: idMock,
}));

import {
  addTrackToPlaylist,
  createPlaylistShare,
  deleteTrack,
  ensurePlayerState,
  persistPlayerState,
  uploadTracks,
} from "@/lib/music/actions";

describe("InstantDB music actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(1_710_000_000_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ensures player state with defaults and user link", async () => {
    await ensurePlayerState("user-1");

    expect(transactMock).toHaveBeenCalledTimes(1);
    expect(transactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "playerStates",
        id: "user-1",
        operations: [
          {
            type: "update",
            payload: {
              userId: "user-1",
              queueSource: "all",
              volume: 0.72,
              updatedAt: 1_710_000_000_000,
            },
          },
          {
            type: "link",
            payload: { user: "user-1" },
          },
        ],
      }),
    );
  });

  it("persists player state by unlinking stale active relations", async () => {
    await persistPlayerState({
      userId: "user-1",
      queueSource: "all",
      volume: 0.55,
      activeTrackId: null,
      activePlaylistId: null,
      previousState: {
        id: "user-1",
        userId: "user-1",
        volume: 0.9,
        queueSource: "playlist:playlist-1",
        updatedAt: 0,
        activeTrack: { id: "track-1" },
        activePlaylist: { id: "playlist-1" },
      } as never,
    });

    expect(transactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "playerStates",
        id: "user-1",
        operations: [
          expect.objectContaining({
            type: "update",
            payload: expect.objectContaining({
              userId: "user-1",
              queueSource: "all",
              volume: 0.55,
            }),
          }),
          { type: "link", payload: { user: "user-1" } },
          { type: "unlink", payload: { activeTrack: "track-1" } },
          { type: "unlink", payload: { activePlaylist: "playlist-1" } },
        ],
      }),
    );
  });

  it("does not create duplicate playlist items", async () => {
    const result = await addTrackToPlaylist({
      userId: "user-1",
      playlistId: "playlist-1",
      trackId: "track-1",
      currentItems: [{ id: "item-1", trackId: "track-1", position: 0 } as never],
    });

    expect(result).toBeNull();
    expect(transactMock).not.toHaveBeenCalled();
  });

  it("creates a playlist item at the next position and bumps playlist timestamp", async () => {
    idMock.mockReturnValue("playlist-item-2");

    const result = await addTrackToPlaylist({
      userId: "user-1",
      playlistId: "playlist-1",
      trackId: "track-2",
      currentItems: [
        { id: "item-1", trackId: "track-1", position: 1 } as never,
        { id: "item-9", trackId: "track-9", position: 4 } as never,
      ],
    });

    expect(result).toBe("playlist-item-2");
    expect(transactMock).toHaveBeenCalledTimes(2);
    expect(transactMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        entity: "playlistItems",
        id: "playlist-item-2",
        operations: [
          {
            type: "create",
            payload: {
              ownerId: "user-1",
              playlistId: "playlist-1",
              trackId: "track-2",
              position: 5,
              addedAt: 1_710_000_000_000,
            },
          },
          {
            type: "link",
            payload: { playlist: "playlist-1", track: "track-2" },
          },
        ],
      }),
    );
    expect(transactMock.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        entity: "playlists",
        id: "playlist-1",
        operations: [
          {
            type: "update",
            payload: { updatedAt: 1_710_000_000_000 },
          },
        ],
      }),
    );
  });

  it("uploads tracks through Instant storage and creates linked track records", async () => {
    idMock.mockReturnValue("track-1");
    analyzeAudioFileMock.mockResolvedValue({
      title: "Summer Nights",
      originalFileName: "Summer Nights.mp3",
      durationMs: 123_000,
      waveform: { samples: [0.1, 0.8] },
    });
    uploadFileMock.mockResolvedValue({ data: { id: "file-1" } });
    queryOnceMock.mockResolvedValue({
      data: {
        $files: [{ id: "file-1", url: "https://cdn.example/file-1" }],
      },
    });

    const file = {
      name: "Summer Nights.mp3",
      type: "audio/mpeg",
    } as File;

    await uploadTracks("user-1", [file]);

    expect(uploadFileMock).toHaveBeenCalledWith(
      "users/user-1/tracks/track-1/summer-nights-mp3",
      file,
      {
        contentType: "audio/mpeg",
        contentDisposition: "inline",
      },
    );
    expect(queryOnceMock).toHaveBeenCalledWith({
      $files: {
        $: {
          where: {
            id: "file-1",
          },
        },
      },
    });
    expect(transactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "tracks",
        id: "track-1",
        operations: [
          {
            type: "create",
            payload: {
              title: "Summer Nights",
              originalFileName: "Summer Nights.mp3",
              ownerId: "user-1",
              fileId: "file-1",
              musicTrackURL: "https://cdn.example/file-1",
              durationMs: 123_000,
              waveform: { samples: [0.1, 0.8] },
              createdAt: 1_710_000_000_000,
              updatedAt: 1_710_000_000_000,
            },
          },
          {
            type: "link",
            payload: { owner: "user-1", file: "file-1" },
          },
        ],
      }),
    );
  });

  it("deletes a track, its file, dependent playlist items, and clears active playback", async () => {
    await deleteTrack({
      track: { id: "track-1", fileId: "file-1" } as never,
      playlistItems: [
        { id: "item-1" } as never,
        { id: "item-2" } as never,
      ],
      playerState: {
        id: "state-1",
        userId: "user-1",
        volume: 0.66,
        queueSource: "playlist:playlist-9",
        updatedAt: 0,
        activeTrack: { id: "track-1" },
        activePlaylist: { id: "playlist-9" },
      } as never,
    });

    expect(transactMock).toHaveBeenCalledTimes(1);
    expect(transactMock).toHaveBeenCalledWith([
      expect.objectContaining({
        entity: "playlistItems",
        id: "item-1",
        operations: [{ type: "delete" }],
      }),
      expect.objectContaining({
        entity: "playlistItems",
        id: "item-2",
        operations: [{ type: "delete" }],
      }),
      expect.objectContaining({
        entity: "tracks",
        id: "track-1",
        operations: [{ type: "delete" }],
      }),
      expect.objectContaining({
        entity: "$files",
        id: "file-1",
        operations: [{ type: "delete" }],
      }),
      expect.objectContaining({
        entity: "playerStates",
        id: "state-1",
        operations: [
          {
            type: "update",
            payload: {
              queueSource: "playlist:playlist-9",
              updatedAt: 1_710_000_000_000,
              volume: 0.66,
              userId: "user-1",
            },
          },
          {
            type: "unlink",
            payload: { activeTrack: "track-1" },
          },
        ],
      }),
    ]);
  });

  it("reuses an existing playlist share instead of creating a second one", async () => {
    const existingShare = { id: "share-1", secret: "keep-me" } as never;

    const result = await createPlaylistShare({
      userId: "user-1",
      playlistId: "playlist-1",
      existingShare,
    });

    expect(result).toBe(existingShare);
    expect(transactMock).not.toHaveBeenCalled();
  });
});
