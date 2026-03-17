"use client";

import { makeQueueSource, parseQueueSource } from "@/lib/music/format";
import { getAudioManager } from "@/lib/music/audio-manager";
import { persistPlayerState } from "@/lib/music/actions";
import type { PlayerState, PlaylistItem, QueueSource, Track } from "@/lib/music/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

function uniqueTracks(tracks: Array<Track | null | undefined>) {
  const deduped = new Map<string, Track>();

  for (const track of tracks) {
    if (track?.id) {
      deduped.set(track.id, track);
    }
  }

  return Array.from(deduped.values());
}

function resolveTrackUrl(track: Track | null | undefined) {
  return track?.musicTrackURL || track?.file?.url || null;
}

function useEventCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Args) => callbackRef.current(...args), []);
}

export function useMusicPlayer(params: {
  userId?: string;
  tracks: Track[];
  playlistItems: PlaylistItem[];
  playerState?: PlayerState | null;
  fallbackPlaylistId?: string | null;
}) {
  const { userId, tracks, playlistItems, playerState, fallbackPlaylistId } = params;
  const audioManager = getAudioManager();
  const audio = useSyncExternalStore(
    audioManager.subscribe,
    audioManager.getSnapshot,
    audioManager.getSnapshot,
  );
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const volumePersistTimeout = useRef<number | null>(null);

  const queueSelection = parseQueueSource(
    playerState?.queueSource ?? makeQueueSource(fallbackPlaylistId),
  );
  const activePlaylistId = playerState?.activePlaylist?.id ?? queueSelection.playlistId;

  const playlistMap = useMemo(() => {
    return playlistItems.reduce<Record<string, PlaylistItem[]>>((accumulator, item) => {
      const key = item.playlistId;
      const bucket = accumulator[key] ?? [];
      bucket.push(item);
      accumulator[key] = bucket.sort((left, right) => left.position - right.position);
      return accumulator;
    }, {});
  }, [playlistItems]);

  const activeQueue = useMemo(() => {
    if (queueSelection.kind === "playlist" && queueSelection.playlistId) {
      const items = playlistMap[queueSelection.playlistId] ?? [];
      return uniqueTracks(items.map((item) => item.track));
    }

    return tracks;
  }, [playlistMap, queueSelection.kind, queueSelection.playlistId, tracks]);

  const activeTrackId = playerState?.activeTrack?.id ?? null;
  const activeTrack =
    tracks.find((track) => track.id === activeTrackId) ??
    activeQueue.find((track) => track.id === activeTrackId) ??
    playerState?.activeTrack ??
    null;
  const activeIndex = activeTrackId
    ? activeQueue.findIndex((track) => track.id === activeTrackId)
    : -1;

  const syncPlayerState = useEventCallback(
    async (next: {
      queueSource?: QueueSource;
      activeTrackId?: string | null;
      activePlaylistId?: string | null;
      volume?: number;
    }) => {
      if (!userId) {
        return;
      }

      await persistPlayerState({
        userId,
        queueSource: next.queueSource ?? makeQueueSource(activePlaylistId),
        activeTrackId:
          next.activeTrackId === undefined ? activeTrackId : next.activeTrackId,
        activePlaylistId:
          next.activePlaylistId === undefined
            ? activePlaylistId
            : next.activePlaylistId,
        volume: next.volume ?? audio.volume,
        previousState: playerState,
      });
    },
  );

  const loadTrack = useEventCallback(
    async (
      track: Track,
      options?: {
        queueSource?: QueueSource;
        activePlaylistId?: string | null;
        playlistTitle?: string | null;
        autoplay?: boolean;
      },
    ) => {
      const sourceUrl = resolveTrackUrl(track);

      if (!sourceUrl) {
        return;
      }

      setLoadingTrackId(track.id);

      try {
        await audioManager.load(sourceUrl, track.id);
        audioManager.setMetadata({
          title: track.title,
          artist: options?.playlistTitle ?? "All tracks",
        });

        if (userId) {
          await syncPlayerState({
            queueSource: options?.queueSource ?? makeQueueSource(options?.activePlaylistId),
            activeTrackId: track.id,
            activePlaylistId: options?.activePlaylistId ?? null,
          });
        }

        if (options?.autoplay !== false) {
          await audioManager.play();
        }
      } finally {
        setLoadingTrackId(null);
      }
    },
  );

  const playByIndex = useEventCallback(async (index: number) => {
    const nextTrack = activeQueue[index];
    if (!nextTrack) {
      return;
    }

    await loadTrack(nextTrack, {
      queueSource: makeQueueSource(activePlaylistId),
      activePlaylistId,
    });
  });

  const playNext = useEventCallback(async () => {
    if (activeQueue.length === 0) {
      return;
    }

    const nextIndex =
      activeIndex >= 0 ? (activeIndex + 1) % activeQueue.length : 0;
    await playByIndex(nextIndex);
  });

  const playPrevious = useEventCallback(async () => {
    if (audio.currentTime > 4) {
      audioManager.seekTo(0);
      return;
    }

    if (activeQueue.length === 0) {
      return;
    }

    const previousIndex =
      activeIndex >= 0
        ? (activeIndex - 1 + activeQueue.length) % activeQueue.length
        : 0;
    await playByIndex(previousIndex);
  });

  useEffect(() => {
    audioManager.setTrackHandlers({
      next: () => {
        void playNext();
      },
      previous: () => {
        void playPrevious();
      },
    });
  }, [audioManager, playNext, playPrevious]);

  useEffect(() => {
    if (playerState && Math.abs(playerState.volume - audio.volume) > 0.01) {
      audioManager.setVolume(playerState.volume);
    }
  }, [audio.volume, audioManager, playerState]);

  useEffect(() => {
    return () => {
      if (volumePersistTimeout.current) {
        window.clearTimeout(volumePersistTimeout.current);
      }
    };
  }, []);

  const setVolume = useEventCallback((nextVolume: number) => {
    audioManager.setVolume(nextVolume);

    if (volumePersistTimeout.current) {
      window.clearTimeout(volumePersistTimeout.current);
    }

    volumePersistTimeout.current = window.setTimeout(() => {
      void syncPlayerState({ volume: nextVolume });
    }, 180);
  });

  const togglePlayback = useEventCallback(async () => {
    if (!activeTrack) {
      const fallbackTrack = activeQueue[0];
      if (fallbackTrack) {
        await loadTrack(fallbackTrack, {
          queueSource: makeQueueSource(activePlaylistId),
          activePlaylistId,
        });
      }
      return;
    }

    if (audio.loadedTrackId !== activeTrack.id && resolveTrackUrl(activeTrack)) {
      await loadTrack(activeTrack, {
        queueSource: makeQueueSource(activePlaylistId),
        activePlaylistId,
      });
      return;
    }

    await audioManager.toggle();
  });

  const selectTrack = useEventCallback(
    async (
      track: Track,
      options?: { playlistId?: string | null; playlistTitle?: string | null },
    ) => {
      await loadTrack(track, {
        queueSource: makeQueueSource(options?.playlistId),
        activePlaylistId: options?.playlistId ?? null,
        playlistTitle: options?.playlistTitle ?? null,
      });
    },
  );

  const setQueueContext = useEventCallback(async (playlistId?: string | null) => {
    await syncPlayerState({
      queueSource: makeQueueSource(playlistId),
      activePlaylistId: playlistId ?? null,
    });
  });

  return {
    audio,
    activeTrack,
    activeTrackId,
    activePlaylistId,
    activeQueue,
    loadingTrackId,
    playNext,
    playPrevious,
    seekTo: (seconds: number) => audioManager.seekTo(seconds),
    selectTrack,
    setQueueContext,
    setVolume,
    togglePlayback,
  };
}
