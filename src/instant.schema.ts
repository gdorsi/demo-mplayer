// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

export type WaveformEnvelope = {
  samples: number[];
};

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    tracks: i.entity({
      title: i.string(),
      originalFileName: i.string(),
      ownerId: i.string().indexed(),
      fileId: i.string().optional(),
      musicTrackURL: i.string().optional(),
      durationMs: i.number(),
      waveform: i.json<WaveformEnvelope>(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    playlists: i.entity({
      title: i.string(),
      ownerId: i.string().indexed(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    playlistItems: i.entity({
      ownerId: i.string().indexed(),
      playlistId: i.string().indexed(),
      trackId: i.string().indexed(),
      position: i.number().indexed(),
      addedAt: i.number().indexed(),
    }),
    playerStates: i.entity({
      userId: i.string().unique().indexed(),
      queueSource: i.string(),
      volume: i.number(),
      updatedAt: i.number().indexed(),
    }),
    playlistShares: i.entity({
      ownerId: i.string().indexed(),
      playlistId: i.string().unique().indexed(),
      secret: i.string().unique().indexed(),
      createdAt: i.number().indexed(),
    }),
  },
  links: {
    trackOwner: {
      forward: {
        on: "tracks",
        has: "one",
        label: "owner",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "tracks",
      },
    },
    trackFile: {
      forward: {
        on: "tracks",
        has: "one",
        label: "file",
      },
      reverse: {
        on: "$files",
        has: "one",
        label: "track",
      },
    },
    playlistOwner: {
      forward: {
        on: "playlists",
        has: "one",
        label: "owner",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "playlists",
      },
    },
    playlistItemPlaylist: {
      forward: {
        on: "playlistItems",
        has: "one",
        label: "playlist",
        onDelete: "cascade",
      },
      reverse: {
        on: "playlists",
        has: "many",
        label: "items",
      },
    },
    playlistItemTrack: {
      forward: {
        on: "playlistItems",
        has: "one",
        label: "track",
        onDelete: "cascade",
      },
      reverse: {
        on: "tracks",
        has: "many",
        label: "playlistItems",
      },
    },
    playerStateUser: {
      forward: {
        on: "playerStates",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "playerState",
      },
    },
    playerStateTrack: {
      forward: {
        on: "playerStates",
        has: "one",
        label: "activeTrack",
      },
      reverse: {
        on: "tracks",
        has: "many",
        label: "activePlayerStates",
      },
    },
    playerStatePlaylist: {
      forward: {
        on: "playerStates",
        has: "one",
        label: "activePlaylist",
      },
      reverse: {
        on: "playlists",
        has: "many",
        label: "activePlayerStates",
      },
    },
    playlistSharePlaylist: {
      forward: {
        on: "playlistShares",
        has: "one",
        label: "playlist",
        onDelete: "cascade",
      },
      reverse: {
        on: "playlists",
        has: "one",
        label: "playlistShare",
      },
    },
    playlistShareOwner: {
      forward: {
        on: "playlistShares",
        has: "one",
        label: "owner",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "playlistShares",
      },
    },
  },
  rooms: {},
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
