// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  $default: {
    allow: {
      $default: "false",
    },
  },
  attrs: {
    allow: {
      $default: "false",
    },
  },
  $users: {
    allow: {
      view: "auth.id == data.id",
      update: "auth.id == data.id",
    },
  },
  $files: {
    allow: {
      $default: "false",
      view: "auth.id != null && data.path.startsWith('users/' + auth.id + '/')",
      create:
        "auth.id != null && data.path.startsWith('users/' + auth.id + '/')",
      delete:
        "auth.id != null && data.path.startsWith('users/' + auth.id + '/')",
    },
  },
  tracks: {
    bind: {
      isOwner: "auth.id != null && data.ownerId == auth.id",
      isShared:
        "ruleParams.shareSecret != null && ruleParams.shareSecret in data.ref('playlistItems.playlist.playlistShare.secret')",
    },
    allow: {
      $default: "false",
      view: "isOwner || isShared",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
      link: {
        owner: "isOwner",
        file: "isOwner",
      },
      unlink: {
        owner: "isOwner",
        file: "isOwner",
      },
    },
  },
  playlists: {
    bind: {
      isOwner: "auth.id != null && data.ownerId == auth.id",
      isShared:
        "ruleParams.shareSecret != null && ruleParams.shareSecret in data.ref('playlistShare.secret')",
    },
    allow: {
      $default: "false",
      view: "isOwner || isShared",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
      link: {
        owner: "isOwner",
      },
      unlink: {
        owner: "isOwner",
      },
    },
  },
  playlistItems: {
    bind: {
      isOwner: "auth.id != null && data.ownerId == auth.id",
      isShared:
        "ruleParams.shareSecret != null && ruleParams.shareSecret in data.ref('playlist.playlistShare.secret')",
    },
    allow: {
      $default: "false",
      view: "isOwner || isShared",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
      link: {
        playlist: "isOwner",
        track: "isOwner",
      },
      unlink: {
        playlist: "isOwner",
        track: "isOwner",
      },
    },
  },
  playerStates: {
    bind: {
      isOwner: "auth.id != null && data.userId == auth.id",
    },
    allow: {
      $default: "false",
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
      link: {
        user: "isOwner",
        activeTrack: "isOwner",
        activePlaylist: "isOwner",
      },
      unlink: {
        user: "isOwner",
        activeTrack: "isOwner",
        activePlaylist: "isOwner",
      },
    },
  },
  playlistShares: {
    bind: {
      isOwner: "auth.id != null && data.ownerId == auth.id",
      matchesSecret:
        "ruleParams.shareSecret != null && ruleParams.shareSecret == data.secret",
    },
    allow: {
      $default: "false",
      view: "isOwner || matchesSecret",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
      link: {
        owner: "isOwner",
        playlist: "isOwner",
      },
      unlink: {
        owner: "isOwner",
        playlist: "isOwner",
      },
    },
  },
} satisfies InstantRules;

export default rules;
