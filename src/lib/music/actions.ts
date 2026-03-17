"use client";

import type { AppSchema } from "@/instant.schema";
import { db } from "@/lib/db";
import { analyzeAudioFile } from "@/lib/music/audio-analysis";
import { sanitizeFileSegment } from "@/lib/music/format";
import type {
  PlayerState,
  PlaylistItem,
  PlaylistShare,
  QueueSource,
  Track,
} from "@/lib/music/types";
import { id, type TransactionChunk } from "@instantdb/react";

const DEFAULT_PLAYER_VOLUME = 0.72;

function trackPath(userId: string, trackId: string, fileName: string) {
  const safeName = sanitizeFileSegment(fileName) || "track";
  return `users/${userId}/tracks/${trackId}/${safeName}`;
}

export async function ensurePlayerState(userId: string) {
  await db.transact(
    db.tx.playerStates[userId]
      .update({
        userId,
        queueSource: "all",
        volume: DEFAULT_PLAYER_VOLUME,
        updatedAt: Date.now(),
      })
      .link({ user: userId }),
  );
}

export async function persistPlayerState(params: {
  userId: string;
  queueSource: QueueSource;
  volume: number;
  activeTrackId: string | null;
  activePlaylistId: string | null;
  previousState?: PlayerState | null;
}) {
  const { userId, queueSource, volume, activeTrackId, activePlaylistId, previousState } =
    params;

  let tx = db.tx.playerStates[userId]
    .update({
      userId,
      queueSource,
      volume,
      updatedAt: Date.now(),
    })
    .link({ user: userId });

  if (activeTrackId) {
    tx = tx.link({ activeTrack: activeTrackId });
  } else if (previousState?.activeTrack?.id) {
    tx = tx.unlink({ activeTrack: previousState.activeTrack.id });
  }

  if (activePlaylistId) {
    tx = tx.link({ activePlaylist: activePlaylistId });
  } else if (previousState?.activePlaylist?.id) {
    tx = tx.unlink({ activePlaylist: previousState.activePlaylist.id });
  }

  await db.transact(tx);
}

export async function createPlaylist(userId: string, title: string) {
  const playlistId = id();
  const timestamp = Date.now();

  await db.transact(
    db.tx.playlists[playlistId]
      .create({
        title,
        ownerId: userId,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .link({ owner: userId }),
  );

  return playlistId;
}

export async function renamePlaylist(playlistId: string, title: string) {
  await db.transact(
    db.tx.playlists[playlistId].update({
      title,
      updatedAt: Date.now(),
    }),
  );
}

export async function deletePlaylist(params: {
  playlistId: string;
  playlistItems: PlaylistItem[];
  playerState?: PlayerState | null;
}) {
  const { playlistId, playlistItems, playerState } = params;
  const txs: Array<TransactionChunk<AppSchema, any>> = playlistItems.map((item) =>
    db.tx.playlistItems[item.id].delete(),
  );
  txs.push(db.tx.playlists[playlistId].delete());

  if (playerState?.activePlaylist?.id === playlistId) {
    let stateTx = db.tx.playerStates[playerState.id].update({
      queueSource: "all",
      updatedAt: Date.now(),
      volume: playerState.volume,
      userId: playerState.userId,
    });

    stateTx = stateTx.unlink({ activePlaylist: playlistId });
    txs.push(stateTx);
  }

  await db.transact(txs);
}

export async function renameTrack(trackId: string, title: string) {
  await db.transact(
    db.tx.tracks[trackId].update({
      title,
      updatedAt: Date.now(),
    }),
  );
}

export async function uploadTracks(userId: string, files: FileList | File[]) {
  const fileList = Array.from(files);

  for (const file of fileList) {
    const trackId = id();
    const metadata = await analyzeAudioFile(file);
    const path = trackPath(userId, trackId, file.name);
    const upload = await db.storage.uploadFile(path, file, {
      contentType: file.type || "audio/mpeg",
      contentDisposition: "inline",
    });

    const fileId = upload.data.id;
    const fileData = await db.queryOnce({
      $files: {
        $: {
          where: {
            id: fileId,
          },
        },
      },
    });
    const fileUrl = fileData.data.$files[0]?.url;
    const timestamp = Date.now();

    await db.transact(
      db.tx.tracks[trackId]
        .create({
          title: metadata.title,
          originalFileName: metadata.originalFileName,
          ownerId: userId,
          fileId,
          fileUrl: fileUrl ?? "",
          durationMs: metadata.durationMs,
          waveform: metadata.waveform,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .link({ owner: userId, file: fileId }),
    );
  }
}

export async function addTrackToPlaylist(params: {
  userId: string;
  playlistId: string;
  trackId: string;
  currentItems: PlaylistItem[];
}) {
  const { userId, playlistId, trackId, currentItems } = params;

  if (currentItems.some((item) => item.trackId === trackId)) {
    return null;
  }

  const playlistItemId = id();
  const nextPosition =
    currentItems.reduce((max, item) => Math.max(max, item.position), -1) + 1;

  await db.transact(
    db.tx.playlistItems[playlistItemId]
      .create({
        ownerId: userId,
        playlistId,
        trackId,
        position: nextPosition,
        addedAt: Date.now(),
      })
      .link({ playlist: playlistId, track: trackId }),
  );

  await db.transact(
    db.tx.playlists[playlistId].update({
      updatedAt: Date.now(),
    }),
  );

  return playlistItemId;
}

export async function removeTrackFromPlaylist(params: {
  playlistItem: PlaylistItem;
  playerState?: PlayerState | null;
}) {
  const { playlistItem, playerState } = params;
  const txs: Array<TransactionChunk<AppSchema, any>> = [
    db.tx.playlistItems[playlistItem.id].delete(),
    db.tx.playlists[playlistItem.playlistId].update({
      updatedAt: Date.now(),
    }),
  ];

  if (
    playerState?.queueSource === `playlist:${playlistItem.playlistId}` &&
    playerState.activeTrack?.id === playlistItem.trackId &&
    playerState.activePlaylist?.id === playlistItem.playlistId
  ) {
    let stateTx = db.tx.playerStates[playerState.id].update({
      queueSource: "all",
      updatedAt: Date.now(),
      volume: playerState.volume,
      userId: playerState.userId,
    });

    stateTx = stateTx.unlink({ activePlaylist: playlistItem.playlistId });
    txs.push(stateTx);
  }

  await db.transact(txs);
}

export async function deleteTrack(params: {
  track: Track;
  playlistItems: PlaylistItem[];
  playerState?: PlayerState | null;
}) {
  const { track, playlistItems, playerState } = params;
  const txs: Array<TransactionChunk<AppSchema, any>> = playlistItems.map((item) =>
    db.tx.playlistItems[item.id].delete(),
  );
  txs.push(db.tx.tracks[track.id].delete());

  if (track.fileId) {
    txs.push(db.tx.$files[track.fileId].delete());
  }

  if (playerState?.activeTrack?.id === track.id) {
    let stateTx = db.tx.playerStates[playerState.id].update({
      queueSource:
        playerState.activePlaylist?.id && playerState.queueSource !== "all"
          ? playerState.queueSource
          : "all",
      updatedAt: Date.now(),
      volume: playerState.volume,
      userId: playerState.userId,
    });
    stateTx = stateTx.unlink({ activeTrack: track.id });
    txs.push(stateTx);
  }

  await db.transact(txs);
}

export async function createPlaylistShare(params: {
  userId: string;
  playlistId: string;
  existingShare?: PlaylistShare | null;
}) {
  if (params.existingShare) {
    return params.existingShare;
  }

  const shareId = id();
  const secret =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const createdAt = Date.now();

  await db.transact(
    db.tx.playlistShares[shareId]
      .create({
        ownerId: params.userId,
        playlistId: params.playlistId,
        secret,
        createdAt,
      })
      .link({ owner: params.userId, playlist: params.playlistId }),
  );

  return {
    id: shareId,
    ownerId: params.userId,
    playlistId: params.playlistId,
    secret,
    createdAt,
  } as PlaylistShare;
}

export async function revokePlaylistShare(shareId: string) {
  await db.transact(db.tx.playlistShares[shareId].delete());
}
