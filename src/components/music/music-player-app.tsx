"use client";

import {
  addTrackToPlaylist,
  createPlaylist,
  createPlaylistShare,
  deletePlaylist,
  deleteTrack,
  ensurePlayerState,
  removeTrackFromPlaylist,
  revokePlaylistShare,
  renamePlaylist,
  renameTrack,
  uploadTracks,
} from "@/lib/music/actions";
import { formatClock, formatDuration } from "@/lib/music/format";
import type { Playlist, PlaylistItem, PlaylistShare, Track } from "@/lib/music/types";
import { useMusicPlayer } from "@/lib/music/use-music-player";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import {
  ChevronUpIcon,
  DotsIcon,
  LibraryIcon,
  LogoutIcon,
  MailIcon,
  MusicNoteIcon,
  NextIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  PreviousIcon,
  SearchIcon,
  ShareIcon,
  SparkIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/music/icons";
import { Modal } from "@/components/music/modal";
import { WaveformBars } from "@/components/music/waveform-bars";
import { getAudioManager } from "@/lib/music/audio-manager";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  type CSSProperties,
  ChangeEvent,
  FormEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-400";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";
const PANEL =
  "rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(3,7,18,0.9))] shadow-[0_30px_90px_rgba(2,8,23,0.48)] backdrop-blur-xl";

export function MusicPlayerApp({ playlistId }: { playlistId?: string }) {
  const auth = db.useAuth();

  if (auth.isLoading) {
    return <LoadingScreen />;
  }

  if (auth.error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-10">
        <div className={`${PANEL} w-full p-8 text-white`}>
          <p className="text-sm uppercase tracking-[0.3em] text-rose-300">
            Authentication error
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Instant couldn&apos;t start the session.</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            {auth.error.message}
          </p>
        </div>
      </main>
    );
  }

  if (!auth.user) {
    return <SignedOutHero />;
  }

  return <SignedInShell playlistId={playlistId} />;
}

export function SharedPlaylistApp({ secret }: { secret: string }) {
  const playlistQuery = db.useQuery(
    {
      playlists: {
        playlistShare: {},
        $: {
          where: {
            "playlistShare.secret": secret,
          },
        },
      },
    },
    {
      ruleParams: {
        shareSecret: secret,
      },
    },
  );
  const playlistItemsQuery = db.useQuery(
    {
      playlistItems: {
        playlist: {},
        track: {},
        $: {
          where: {
            "playlist.playlistShare.secret": secret,
          },
          order: { position: "asc" },
        },
      },
    },
    {
      ruleParams: {
        shareSecret: secret,
      },
    },
  );

  const isLoading = playlistQuery.isLoading || playlistItemsQuery.isLoading;
  const error = playlistQuery.error || playlistItemsQuery.error;
  const playlist = playlistQuery.data?.playlists?.[0] ?? null;
  const playlistItems = playlistItemsQuery.data?.playlistItems ?? [];
  const tracks = useMemo(
    () => playlistItems.map((item) => item.track).filter(Boolean) as Track[],
    [playlistItems],
  );
  const player = useMusicPlayer({
    tracks,
    playlistItems,
    fallbackPlaylistId: playlist?.id ?? null,
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-10">
        <div className={`${PANEL} w-full p-8 text-white`}>
          <p className="text-sm uppercase tracking-[0.3em] text-rose-300">Share unavailable</p>
          <h1 className="mt-3 text-4xl font-semibold">This shared playlist couldn&apos;t load.</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">{error.message}</p>
        </div>
      </main>
    );
  }

  if (!playlist) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-10">
        <div className={`${PANEL} w-full p-8 text-white`}>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-200">Share expired</p>
          <h1 className="mt-3 text-4xl font-semibold">This playlist link isn&apos;t active anymore.</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            The owner may have revoked sharing or removed the playlist.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto min-h-screen max-w-[1280px] px-4 pb-40 pt-4 sm:px-6 sm:pt-6">
        <div className="space-y-4">
          <header className={`${PANEL} overflow-hidden p-5 text-white sm:p-7`}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.34em] text-cyan-200">Shared playlist</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold sm:text-5xl">{playlist.title}</h1>
                  <span className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-300">
                    View only
                  </span>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Press play, scrub the waveform, and listen through the exact queue the owner shared.
                </p>
              </div>
              <Link href="/" className={SECONDARY_BUTTON}>
                <MusicNoteIcon className="h-4 w-4" />
                Open your library
              </Link>
            </div>
          </header>

          <section className={`${PANEL} p-4 sm:p-5`}>
            {tracks.length ? (
              <div className="space-y-2">
                {tracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    index={index}
                    track={track}
                    isActive={player.activeTrackId === track.id}
                    isPlaying={player.audio.isPlaying && player.activeTrackId === track.id}
                    isLoading={player.loadingTrackId === track.id}
                    currentPlaylistId={playlist.id}
                    currentPlaylistItem={
                      playlistItems.find((item) => item.trackId === track.id) ?? null
                    }
                    playlists={[]}
                    memberships={new Map<string, PlaylistItem>()}
                    readOnly
                    onPlay={() => {
                      void player.selectTrack(track, {
                        playlistId: playlist.id,
                        playlistTitle: playlist.title,
                      });
                    }}
                    onRename={() => undefined}
                    onDelete={() => undefined}
                    onAddToPlaylist={() => undefined}
                    onRemoveFromCurrentPlaylist={() => undefined}
                  />
                ))}
              </div>
            ) : (
              <EmptyState hasTracks={false} isPlaylist onAddTracks={() => undefined} />
            )}
          </section>
        </div>
      </main>

      <PlayerDock
        track={player.activeTrack}
        isPlaying={player.audio.isPlaying}
        isLoading={Boolean(player.loadingTrackId)}
        currentTime={player.audio.currentTime}
        duration={player.audio.duration || ((player.activeTrack?.durationMs ?? 0) / 1000)}
        volume={player.audio.volume}
        onPlayPause={() => {
          void player.togglePlayback();
        }}
        onSeek={(seconds) => player.seekTo(seconds)}
        onNext={() => {
          void player.playNext();
        }}
        onPrevious={() => {
          void player.playPrevious();
        }}
        onVolumeChange={player.setVolume}
      />
    </>
  );
}

function SignedOutHero() {
  const [isGuestPending, setIsGuestPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuestAccess() {
    setIsGuestPending(true);
    setError(null);

    try {
      await db.auth.signInAsGuest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start guest session.");
    } finally {
      setIsGuestPending(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.28),transparent_32%),radial-gradient(circle_at_85%_18%,rgba(244,114,182,0.16),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(250,204,21,0.12),transparent_24%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className={`${PANEL} overflow-hidden px-6 py-8 text-white sm:px-10 sm:py-12`}>
          <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.34em] text-cyan-200">
            <MusicNoteIcon className="h-4 w-4" />
            Instant Music Player
          </div>
          <h1 className="mt-8 max-w-3xl text-5xl font-semibold leading-[0.96] text-white sm:text-7xl">
            Your private
            <span className="block bg-[linear-gradient(120deg,#67e8f9,#f9a8d4,#fde68a)] bg-clip-text text-transparent">
              cloud mixtape.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Upload audio, shape playlists, and keep a persistent now-playing queue
            across guest and email sessions. Everything syncs through Instant and stays
            scoped to your account.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className={PRIMARY_BUTTON} onClick={handleGuestAccess} disabled={isGuestPending}>
              <SparkIcon className="h-4 w-4" />
              {isGuestPending ? "Starting session..." : "Try it as a guest"}
            </button>
            <a
              href="#magic-code"
              className={`${SECONDARY_BUTTON} text-center`}
            >
              <MailIcon className="h-4 w-4" />
              Continue with email
            </a>
          </div>
          {error ? (
            <p className="mt-4 text-sm text-rose-300">{error}</p>
          ) : null}
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              {
                eyebrow: "Waveform first",
                text: "Every upload is analyzed in-browser so lists, rows, and the dock all feel alive.",
              },
              {
                eyebrow: "Playlist memory",
                text: "Custom playlists preserve their order and your current listening context.",
              },
              {
                eyebrow: "Guest to email",
                text: "Start instantly, then upgrade later with a magic code without losing your library.",
              },
            ].map((item) => (
              <div
                key={item.eyebrow}
                className="rounded-[24px] border border-white/10 bg-white/6 p-5"
              >
                <p className="text-xs uppercase tracking-[0.32em] text-amber-200">
                  {item.eyebrow}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section
          id="magic-code"
          className={`${PANEL} px-6 py-8 text-white sm:px-8 sm:py-10`}
        >
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-200">
            Magic code access
          </p>
          <h2 className="mt-4 text-3xl font-semibold">Use your email when you&apos;re ready.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Sign in on a fresh device, or upgrade a guest session later from the app sidebar.
          </p>
          <div className="mt-8">
            <MagicCodeCard />
          </div>
        </section>
      </div>
    </main>
  );
}

function SignedInShell({ playlistId }: { playlistId?: string }) {
  const router = useRouter();
  const user = db.useUser();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [isUploading, setIsUploading] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [addTracksOpen, setAddTracksOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const playerStateCreateRef = useRef<string | null>(null);

  const trackQuery = db.useQuery(
    user
      ? {
          tracks: {
            file: {},
            $: {
              where: { ownerId: user.id },
              order: { createdAt: "desc" },
            },
          },
        }
      : null,
  );
  const playlistQuery = db.useQuery(
    user
      ? {
          playlists: {
            $: {
              where: { ownerId: user.id },
              order: { updatedAt: "desc" },
            },
          },
        }
      : null,
  );
  const playlistItemsQuery = db.useQuery(
    user
      ? {
          playlistItems: {
            playlist: {},
            track: {
              file: {},
            },
            $: {
              where: { ownerId: user.id },
              order: { position: "asc" },
            },
          },
        }
      : null,
  );
  const playerStateQuery = db.useQuery(
    user
      ? {
          playerStates: {
            user: {},
            activeTrack: {
              file: {},
            },
            activePlaylist: {},
            $: {
              where: { id: user.id },
            },
          },
        }
      : null,
  );
  const playlistSharesQuery = db.useQuery(
    user
      ? {
          playlistShares: {
            playlist: {},
            owner: {},
            $: {
              where: { ownerId: user.id },
            },
          },
        }
      : null,
  );

  const isDataLoading =
    trackQuery.isLoading ||
    playlistQuery.isLoading ||
    playlistItemsQuery.isLoading ||
    playerStateQuery.isLoading ||
    playlistSharesQuery.isLoading;

  const dataError =
    trackQuery.error ||
    playlistQuery.error ||
    playlistItemsQuery.error ||
    playerStateQuery.error ||
    playlistSharesQuery.error;

  const tracks = trackQuery.data?.tracks ?? [];
  const playlists = playlistQuery.data?.playlists ?? [];
  const playlistItems = playlistItemsQuery.data?.playlistItems ?? [];
  const playerState = playerStateQuery.data?.playerStates?.[0] ?? null;
  const playlistShares = playlistSharesQuery.data?.playlistShares ?? [];
  const currentPlaylist = playlistId
    ? playlists.find((playlist) => playlist.id === playlistId) ?? null
    : null;
  const currentShare = playlistId
    ? playlistShares.find((share) => share.playlistId === playlistId) ?? null
    : null;

  useEffect(() => {
    if (
      user &&
      !playerState &&
      !playerStateQuery.isLoading &&
      playerStateCreateRef.current !== user.id
    ) {
      playerStateCreateRef.current = user.id;
      void ensurePlayerState(user.id);
    }
  }, [playerState, playerStateQuery.isLoading, user]);

  const currentPlaylistItems = useMemo(() => {
    if (!playlistId) {
      return [];
    }

    return playlistItems
      .filter((item) => item.playlistId === playlistId)
      .sort((left, right) => left.position - right.position);
  }, [playlistId, playlistItems]);

  const currentTracks = useMemo(() => {
    if (!playlistId) {
      return tracks;
    }

    return currentPlaylistItems
      .map((item) => item.track)
      .filter(Boolean) as Track[];
  }, [currentPlaylistItems, playlistId, tracks]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const visibleTracks = useMemo(() => {
    if (!normalizedQuery) {
      return currentTracks;
    }

    return currentTracks.filter((track) => {
      return (
        track.title.toLowerCase().includes(normalizedQuery) ||
        track.originalFileName.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [currentTracks, normalizedQuery]);

  const membership = useMemo(() => {
    return playlistItems.reduce<Map<string, Map<string, PlaylistItem>>>((map, item) => {
      const playlistMap = map.get(item.trackId) ?? new Map<string, PlaylistItem>();
      playlistMap.set(item.playlistId, item);
      map.set(item.trackId, playlistMap);
      return map;
    }, new Map<string, Map<string, PlaylistItem>>());
  }, [playlistItems]);

  const availableTracksForPlaylist = useMemo(() => {
    if (!playlistId) {
      return [];
    }

    const currentIds = new Set(currentPlaylistItems.map((item) => item.trackId));
    return tracks.filter((track) => !currentIds.has(track.id));
  }, [currentPlaylistItems, playlistId, tracks]);

  const player = useMusicPlayer({
    userId: user.id,
    tracks,
    playlistItems,
    playerState,
    fallbackPlaylistId: playlistId ?? null,
  });

  const currentTitle = playlistId ? currentPlaylist?.title ?? "Playlist" : "All Tracks";
  const currentDescription = playlistId
    ? "Curate the sequence, add tracks from your library, and keep the queue anchored to this playlist."
    : "Upload songs, skim waveforms, and build playlists from your private library.";

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    setIsUploading(true);

    try {
      await uploadTracks(user.id, files);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Unable to upload these tracks.");
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  }

  async function handleCreatePlaylist(title: string) {
    const newPlaylistId = await createPlaylist(user.id, title);
    setCreatePlaylistOpen(false);
    startTransition(() => {
      router.push(`/playlist/${newPlaylistId}`);
    });
  }

  async function handleDeletePlaylist() {
    if (!currentPlaylist || !playlistId) {
      return;
    }

    if (!window.confirm(`Delete "${currentPlaylist.title}" and its entries?`)) {
      return;
    }

    await deletePlaylist({
      playlistId,
      playlistItems: currentPlaylistItems,
      playerState,
    });

    startTransition(() => {
      router.push("/");
    });
  }

  async function handleSignOut() {
    getAudioManager().unload();
    await db.auth.signOut();
  }

  if (isDataLoading) {
    return <LoadingScreen />;
  }

  if (dataError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-10">
        <div className={`${PANEL} w-full p-8 text-white`}>
          <p className="text-sm uppercase tracking-[0.3em] text-rose-300">Data error</p>
          <h1 className="mt-3 text-4xl font-semibold">The player couldn&apos;t load your library.</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            {dataError.message}
          </p>
        </div>
      </main>
    );
  }

  if (playlistId && !currentPlaylist) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-10">
        <div className={`${PANEL} w-full p-8 text-white`}>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-200">Missing playlist</p>
          <h1 className="mt-3 text-4xl font-semibold">This playlist isn&apos;t available.</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            It may have been deleted or it belongs to another account.
          </p>
          <Link href="/" className={`${PRIMARY_BUTTON} mt-6`}>
            Back to all tracks
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto min-h-screen max-w-[1600px] px-4 pb-40 pt-4 sm:px-6 sm:pt-6">
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={`${PANEL} h-fit p-4 text-white sm:p-5 lg:sticky lg:top-6`}>
            <div className="rounded-[26px] border border-white/10 bg-white/6 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/16 text-cyan-200">
                    <MusicNoteIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.34em] text-slate-400">
                      Private Player
                    </p>
                    <h1 className="text-xl font-semibold">Instant Music</h1>
                  </div>
                </div>
                <button
                  className="rounded-full border border-white/12 p-2 text-slate-300 transition hover:border-white/20 hover:text-white"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                >
                  <LogoutIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatCard label="Tracks" value={tracks.length.toString()} />
                <StatCard label="Playlists" value={playlists.length.toString()} />
              </div>
              <div className="mt-4 rounded-[22px] border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">
                  Session
                </p>
                <p className="mt-3 text-sm font-medium text-white">
                  {user.isGuest ? "Guest session" : user.email ?? "Signed in"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {user.isGuest
                    ? "Upgrade this guest library with email magic code whenever you want."
                    : "Your uploads and playlists stay private to this account."}
                </p>
                {user.isGuest ? (
                  <div className="mt-4">
                    <MagicCodeCard compact />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-[26px] border border-white/10 bg-white/6 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Library
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    Collections
                  </h2>
                </div>
                <button
                  className={`${SECONDARY_BUTTON} h-11 px-4`}
                  onClick={() => setCreatePlaylistOpen(true)}
                >
                  <PlusIcon className="h-4 w-4" />
                  Playlist
                </button>
              </div>
              <nav className="mt-4 space-y-2">
                <SidebarLink
                  href="/"
                  isActive={!playlistId}
                  icon={<LibraryIcon className="h-4 w-4" />}
                  suffix={`${tracks.length}`}
                >
                  All Tracks
                </SidebarLink>
                {playlists.map((playlist) => (
                  <SidebarLink
                    key={playlist.id}
                    href={`/playlist/${playlist.id}`}
                    isActive={playlist.id === playlistId}
                    icon={<MusicNoteIcon className="h-4 w-4" />}
                  >
                    {playlist.title}
                  </SidebarLink>
                ))}
              </nav>
            </div>
          </aside>

          <section className="space-y-4">
            <header className={`${PANEL} overflow-hidden p-5 text-white sm:p-7`}>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs uppercase tracking-[0.34em] text-cyan-200">
                    {playlistId ? "Custom queue" : "Your library"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-semibold sm:text-5xl">{currentTitle}</h2>
                    {playlistId ? (
                      <button
                        className="rounded-full border border-white/12 p-2 text-slate-300 transition hover:border-white/20 hover:text-white"
                        onClick={() => setEditingPlaylist(currentPlaylist)}
                        aria-label="Rename playlist"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    {currentDescription}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <label className={cn(PRIMARY_BUTTON, isUploading && "animate-pulse")}>
                    <UploadIcon className="h-4 w-4" />
                    {isUploading ? "Uploading..." : playlistId ? "Upload to library" : "Upload tracks"}
                    <input
                      type="file"
                      accept="audio/*"
                      multiple
                      className="hidden"
                      onChange={handleUpload}
                      disabled={isUploading}
                    />
                  </label>
                  {playlistId ? (
                    <>
                      <button
                        className={SECONDARY_BUTTON}
                        onClick={() => setShareModalOpen(true)}
                      >
                        <ShareIcon className="h-4 w-4" />
                        Share
                      </button>
                      <button
                        className={SECONDARY_BUTTON}
                        onClick={() => setAddTracksOpen(true)}
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add tracks
                      </button>
                      <button className={SECONDARY_BUTTON} onClick={handleDeletePlaylist}>
                        <TrashIcon className="h-4 w-4" />
                        Delete playlist
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 rounded-[26px] border border-white/10 bg-white/6 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <SparkIcon className="h-4 w-4 text-amber-200" />
                  {playlistId
                    ? `${currentTracks.length} tracks in this playlist`
                    : `${tracks.length} uploads ready to play`}
                </div>
                <div className="relative w-full sm:max-w-sm">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search tracks by title or file name"
                    className="h-12 w-full rounded-full border border-white/10 bg-slate-950/65 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                  />
                </div>
              </div>
            </header>

            <section className={`${PANEL} p-4 sm:p-5`}>
              {visibleTracks.length ? (
                <div className="space-y-2">
                  {visibleTracks.map((track, index) => {
                    const memberships = membership.get(track.id) ?? new Map<string, PlaylistItem>();
                    const currentPlaylistItem =
                      playlistId ? memberships.get(playlistId) ?? null : null;

                    return (
                      <TrackRow
                        key={track.id}
                        index={index}
                        track={track}
                        isActive={player.activeTrackId === track.id}
                        isPlaying={player.audio.isPlaying && player.activeTrackId === track.id}
                        isLoading={player.loadingTrackId === track.id}
                        currentPlaylistId={playlistId ?? null}
                        currentPlaylistItem={currentPlaylistItem}
                        playlists={playlists}
                        memberships={memberships}
                        onPlay={() => {
                          void player.selectTrack(track, { playlistId: playlistId ?? null });
                        }}
                        onRename={() => setEditingTrack(track)}
                        onDelete={() => {
                          void deleteTrack({
                            track,
                            playlistItems: playlistItems.filter((item) => item.trackId === track.id),
                            playerState,
                          });
                        }}
                        onAddToPlaylist={(targetPlaylistId) => {
                          const itemsForPlaylist = playlistItems.filter(
                            (item) => item.playlistId === targetPlaylistId,
                          );

                          void addTrackToPlaylist({
                            userId: user.id,
                            playlistId: targetPlaylistId,
                            trackId: track.id,
                            currentItems: itemsForPlaylist,
                          });
                        }}
                        onRemoveFromCurrentPlaylist={() => {
                          if (!currentPlaylistItem) {
                            return;
                          }

                          void removeTrackFromPlaylist({
                            playlistItem: currentPlaylistItem,
                            playerState,
                          });
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  hasTracks={currentTracks.length > 0}
                  isPlaylist={Boolean(playlistId)}
                  onAddTracks={() => setAddTracksOpen(true)}
                />
              )}
            </section>
          </section>
        </div>
      </main>

      <PlayerDock
        track={player.activeTrack}
        isPlaying={player.audio.isPlaying}
        isLoading={Boolean(player.loadingTrackId)}
        currentTime={player.audio.currentTime}
        duration={player.audio.duration || ((player.activeTrack?.durationMs ?? 0) / 1000)}
        volume={player.audio.volume}
        onPlayPause={() => {
          void player.togglePlayback();
        }}
        onSeek={(seconds) => player.seekTo(seconds)}
        onNext={() => {
          void player.playNext();
        }}
        onPrevious={() => {
          void player.playPrevious();
        }}
        onVolumeChange={player.setVolume}
      />

      {createPlaylistOpen ? (
        <PlaylistModal
          onClose={() => setCreatePlaylistOpen(false)}
          onSubmit={(title) => void handleCreatePlaylist(title)}
          title="Create playlist"
          description="Give this collection a title. You can rename it later."
          submitLabel="Create playlist"
          initialValue="Late-night session"
        />
      ) : null}

      {editingPlaylist ? (
        <PlaylistModal
          onClose={() => setEditingPlaylist(null)}
          onSubmit={async (title) => {
            await renamePlaylist(editingPlaylist.id, title);
            setEditingPlaylist(null);
          }}
          title="Rename playlist"
          description="Tune the title to match the mood."
          submitLabel="Save title"
          initialValue={editingPlaylist.title}
        />
      ) : null}

      {editingTrack ? (
        <PlaylistModal
          onClose={() => setEditingTrack(null)}
          onSubmit={async (title) => {
            await renameTrack(editingTrack.id, title);
            setEditingTrack(null);
          }}
          title="Rename track"
          description="This only changes the title inside your library."
          submitLabel="Save track"
          initialValue={editingTrack.title}
        />
      ) : null}

      {shareModalOpen && playlistId && currentPlaylist ? (
        <PlaylistShareModal
          playlist={currentPlaylist}
          share={currentShare}
          userId={user.id}
          onClose={() => setShareModalOpen(false)}
        />
      ) : null}

      {addTracksOpen && playlistId && currentPlaylist ? (
        <AddTracksModal
          playlist={currentPlaylist}
          tracks={availableTracksForPlaylist}
          onClose={() => setAddTracksOpen(false)}
          onSubmit={async (selectedTrackIds) => {
            let currentItems: PlaylistItem[] = playlistItems.filter(
              (item) => item.playlistId === playlistId,
            );

            for (const trackId of selectedTrackIds) {
              const createdId = await addTrackToPlaylist({
                userId: user.id,
                playlistId,
                trackId,
                currentItems,
              });

              if (createdId) {
                const nextPosition =
                  currentItems.reduce((max, item) => Math.max(max, item.position), -1) + 1;

                currentItems = currentItems.concat({
                  id: createdId,
                  ownerId: user.id,
                  playlistId,
                  trackId,
                  position: nextPosition,
                  addedAt: Date.now(),
                } as PlaylistItem);
              }
            }

            setAddTracksOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function TrackRow(props: {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  playlists: Playlist[];
  memberships: Map<string, PlaylistItem>;
  currentPlaylistId: string | null;
  currentPlaylistItem: PlaylistItem | null;
  readOnly?: boolean;
  onPlay: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onRemoveFromCurrentPlaylist: () => void;
}) {
  const {
    track,
    index,
    isActive,
    isPlaying,
    isLoading,
    playlists,
    memberships,
    currentPlaylistId,
    currentPlaylistItem,
    readOnly = false,
    onPlay,
    onRename,
    onDelete,
    onAddToPlaylist,
    onRemoveFromCurrentPlaylist,
  } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const availablePlaylists = playlists.filter((playlist) => !memberships.has(playlist.id));

  return (
    <div
      className={cn(
        "group relative grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.045] p-4 text-white transition hover:border-white/14 hover:bg-white/[0.08] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center",
        isActive && "border-cyan-300/28 bg-cyan-300/[0.08]",
      )}
        style={
          {
            "--waveform-active": "#67e8f9",
            "--waveform-muted": "rgba(148,163,184,0.22)",
          } as CSSProperties
        }
    >
      <div className="flex items-center gap-3">
        <button
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white transition hover:border-cyan-300/60 hover:bg-cyan-300/16",
            isActive && "border-cyan-300/60 bg-cyan-300/18 text-cyan-100",
          )}
          onClick={onPlay}
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-100 border-t-transparent" />
          ) : isPlaying ? (
            <PauseIcon className="h-5 w-5" />
          ) : (
            <PlayIcon className="h-5 w-5 translate-x-[1px]" />
          )}
        </button>
        <div className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/75 text-sm font-medium text-slate-400 sm:flex">
          {index + 1}
        </div>
      </div>

      <button onClick={onPlay} className="min-w-0 text-left">
        <p className="truncate text-base font-medium text-white">{track.title}</p>
        <p className="mt-1 truncate text-sm text-slate-400">
          {track.originalFileName}
        </p>
        <div className="mt-3 h-10">
          <WaveformBars samples={track.waveform.samples} height={40} />
        </div>
      </button>

      <div className="flex items-center justify-between gap-2 sm:block">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-slate-400">
          {formatDuration(track.durationMs)}
        </span>
        {currentPlaylistItem ? (
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-200">
            In playlist
          </span>
        ) : null}
      </div>

      {readOnly ? (
        <div className="hidden sm:block" />
      ) : (
        <div className="relative" ref={menuRef}>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/18 hover:bg-white/10 hover:text-white"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={`Open actions for ${track.title}`}
          >
            <DotsIcon className="h-5 w-5" />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-14 z-20 w-72 rounded-[22px] border border-white/12 bg-slate-950/95 p-2 shadow-[0_30px_90px_rgba(2,8,23,0.68)] backdrop-blur-xl">
              <MenuButton
                onClick={() => {
                  setMenuOpen(false);
                  onRename();
                }}
              >
                <PencilIcon className="h-4 w-4" />
                Rename track
              </MenuButton>
              {currentPlaylistItem && currentPlaylistId ? (
                <MenuButton
                  onClick={() => {
                    setMenuOpen(false);
                    onRemoveFromCurrentPlaylist();
                  }}
                >
                  <TrashIcon className="h-4 w-4" />
                  Remove from this playlist
                </MenuButton>
              ) : null}
              {availablePlaylists.length ? (
                <div className="mt-2 border-t border-white/8 pt-2">
                  <p className="px-3 pb-2 text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    Add to playlist
                  </p>
                  <div className="max-h-52 space-y-1 overflow-y-auto">
                    {availablePlaylists.map((playlist) => (
                      <MenuButton
                        key={playlist.id}
                        onClick={() => {
                          setMenuOpen(false);
                          onAddToPlaylist(playlist.id);
                        }}
                      >
                        <PlusIcon className="h-4 w-4" />
                        {playlist.title}
                      </MenuButton>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-2 border-t border-white/8 pt-2">
                <MenuButton
                  danger
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm(`Delete "${track.title}" from your library?`)) {
                      onDelete();
                    }
                  }}
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete track
                </MenuButton>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PlayerDock(props: {
  track: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onVolumeChange: (volume: number) => void;
}) {
  const {
    track,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    onPlayPause,
    onSeek,
    onNext,
    onPrevious,
    onVolumeChange,
  } = props;
  const [expanded, setExpanded] = useState(false);

  if (!track) {
    return null;
  }

  const resolvedDuration = duration || track.durationMs / 1000;
  const progress = resolvedDuration ? currentTime / resolvedDuration : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="pointer-events-auto mx-auto max-w-[1600px]">
        {expanded ? (
          <div
            className={`${PANEL} mb-3 block rounded-[30px] p-5 text-white md:hidden`}
            style={
              {
                "--waveform-active": "#67e8f9",
                "--waveform-muted": "rgba(148,163,184,0.22)",
              } as CSSProperties
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-xl font-semibold">{track.title}</p>
                <p className="mt-1 truncate text-sm text-slate-400">
                  {track.originalFileName}
                </p>
              </div>
              <button
                className="rounded-full border border-white/10 p-2 text-slate-300"
                onClick={() => setExpanded(false)}
              >
                <ChevronUpIcon className="h-4 w-4 rotate-180" />
              </button>
            </div>
            <div className="mt-5 h-20">
              <WaveformBars samples={track.waveform.samples} progress={progress} height={80} />
            </div>
            <div className="mt-4 space-y-2">
              <input
                type="range"
                min={0}
                max={resolvedDuration || 0}
                step={0.1}
                value={Math.min(currentTime, resolvedDuration || currentTime)}
                onChange={(event) => onSeek(Number(event.target.value))}
                className="music-range"
              />
              <div className="flex justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                <span>{formatClock(currentTime)}</span>
                <span>{formatClock(resolvedDuration)}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={`${PANEL} rounded-[30px] border border-white/12 px-4 py-4 text-white sm:px-5`}
          style={
            {
              "--waveform-active": "#67e8f9",
              "--waveform-muted": "rgba(148,163,184,0.2)",
            } as CSSProperties
          }
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="min-w-0 md:w-[280px]">
              <p className="truncate text-base font-semibold">{track.title}</p>
              <p className="mt-1 truncate text-sm text-slate-400">{track.originalFileName}</p>
            </div>

            <div className="order-3 md:order-2 md:flex-1">
              <div className="hidden h-12 md:block">
                <WaveformBars samples={track.waveform.samples} progress={progress} height={48} />
              </div>
              <div className="mt-2 space-y-2">
                <input
                  type="range"
                  min={0}
                  max={resolvedDuration || 0}
                  step={0.1}
                  value={Math.min(currentTime, resolvedDuration || currentTime)}
                  onChange={(event) => onSeek(Number(event.target.value))}
                  className="music-range"
                />
                <div className="flex justify-between text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  <span>{formatClock(currentTime)}</span>
                  <span>{formatClock(resolvedDuration)}</span>
                </div>
              </div>
            </div>

            <div className="order-2 flex items-center justify-between gap-3 md:order-3 md:w-[270px] md:justify-end">
              <div className="flex items-center gap-2">
                <ControlButton onClick={onPrevious} ariaLabel="Previous track">
                  <PreviousIcon className="h-5 w-5" />
                </ControlButton>
                <button
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400 text-slate-950 transition hover:bg-cyan-300"
                  onClick={onPlayPause}
                  aria-label={isPlaying ? "Pause active track" : "Play active track"}
                >
                  {isLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  ) : isPlaying ? (
                    <PauseIcon className="h-6 w-6" />
                  ) : (
                    <PlayIcon className="h-6 w-6 translate-x-[1px]" />
                  )}
                </button>
                <ControlButton onClick={onNext} ariaLabel="Next track">
                  <NextIcon className="h-5 w-5" />
                </ControlButton>
              </div>
              <div className="hidden items-center gap-3 md:flex">
                <span className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Vol
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => onVolumeChange(Number(event.target.value))}
                  className="music-range w-28"
                />
              </div>
              <button
                className="rounded-full border border-white/10 p-2 text-slate-300 md:hidden"
                onClick={() => setExpanded((value) => !value)}
              >
                <ChevronUpIcon className={cn("h-4 w-4 transition", expanded && "rotate-180")} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MagicCodeCard({ compact = false }: { compact?: boolean }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await db.auth.sendMagicCode({ email });
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send code.");
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await db.auth.signInWithMagicCode({ email, code });
      setCode("");
      setStep("email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify code.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-900/65 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
        {step === "email" ? "Step 1" : "Step 2"}
      </p>
      {step === "email" ? (
        <form className="mt-4 space-y-3" onSubmit={handleSendCode}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
          />
          <button className={cn(PRIMARY_BUTTON, "w-full")} disabled={pending}>
            <MailIcon className="h-4 w-4" />
            {pending ? "Sending code..." : compact ? "Upgrade with email" : "Send magic code"}
          </button>
        </form>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={handleVerifyCode}>
          <input
            type="text"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="123456"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
          />
          <button className={cn(PRIMARY_BUTTON, "w-full")} disabled={pending}>
            <SparkIcon className="h-4 w-4" />
            {pending ? "Verifying..." : "Verify and continue"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-slate-400 transition hover:text-white"
            onClick={() => {
              setStep("email");
              setCode("");
            }}
          >
            Change email
          </button>
        </form>
      )}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}

function PlaylistModal(props: {
  title: string;
  description: string;
  initialValue: string;
  submitLabel: string;
  onSubmit: (value: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const { title, description, initialValue, submitLabel, onSubmit, onClose } = props;
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);

  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);

          try {
            await onSubmit(value.trim());
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="border-b border-white/8 px-6 py-5 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Collection edit</p>
          <h3 className="mt-3 text-2xl font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>
        <div className="px-6 py-5">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
            placeholder="Collection title"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-white/8 px-6 py-5 sm:flex-row sm:justify-end">
          <button type="button" className={SECONDARY_BUTTON} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={PRIMARY_BUTTON}
            disabled={!value.trim() || pending}
          >
            {pending ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddTracksModal(props: {
  playlist: Playlist;
  tracks: Track[];
  onClose: () => void;
  onSubmit: (trackIds: string[]) => void | Promise<void>;
}) {
  const { playlist, tracks, onClose, onSubmit } = props;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  return (
    <Modal onClose={onClose} className="max-w-2xl">
      <div className="border-b border-white/8 px-6 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Add from library</p>
        <h3 className="mt-3 text-2xl font-semibold">{playlist.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Pull more tracks into this playlist without leaving the queue.
        </p>
      </div>
      <div className="max-h-[55vh] space-y-2 overflow-y-auto px-4 py-4">
        {tracks.length ? (
          tracks.map((track) => {
            const isSelected = selected.has(track.id);

            return (
              <button
                key={track.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4 text-left text-white transition hover:border-white/14 hover:bg-white/[0.08]",
                  isSelected && "border-cyan-300/30 bg-cyan-300/[0.08]",
                )}
                onClick={() => {
                  setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(track.id)) {
                      next.delete(track.id);
                    } else {
                      next.add(track.id);
                    }
                    return next;
                  });
                }}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{track.title}</p>
                  <p className="mt-1 truncate text-sm text-slate-400">
                    {track.originalFileName}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-slate-400">
                  {formatDuration(track.durationMs)}
                </span>
              </button>
            );
          })
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-400">
            Every track in your library is already part of this playlist.
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 border-t border-white/8 px-6 py-5 sm:flex-row sm:justify-end">
        <button type="button" className={SECONDARY_BUTTON} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={PRIMARY_BUTTON}
          disabled={!selected.size || pending}
          onClick={async () => {
            setPending(true);

            try {
              await onSubmit(Array.from(selected));
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? "Adding..." : `Add ${selected.size || ""} track${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </Modal>
  );
}

function PlaylistShareModal(props: {
  playlist: Playlist;
  share: PlaylistShare | null;
  userId: string;
  onClose: () => void;
}) {
  const { playlist, share, userId, onClose } = props;
  const [pending, setPending] = useState(false);
  const [activeShare, setActiveShare] = useState<PlaylistShare | null>(share);
  const [feedback, setFeedback] = useState<string | null>(null);
  const shareUrl =
    activeShare && typeof window !== "undefined"
      ? `${window.location.origin}/share/${activeShare.secret}`
      : "";

  async function handleEnableShare() {
    setPending(true);
    setFeedback(null);

    try {
      const createdShare = await createPlaylistShare({
        userId,
        playlistId: playlist.id,
        existingShare: activeShare,
      });
      setActiveShare(createdShare);
      setFeedback("Share link ready.");
    } finally {
      setPending(false);
    }
  }

  async function handleCopyLink() {
    if (!shareUrl) {
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    setFeedback("Link copied to clipboard.");
  }

  async function handleRevoke() {
    if (!activeShare) {
      return;
    }

    setPending(true);
    setFeedback(null);

    try {
      await revokePlaylistShare(activeShare.id);
      setActiveShare(null);
      setFeedback("Share link revoked.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="border-b border-white/8 px-6 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Playlist sharing</p>
        <h3 className="mt-3 text-2xl font-semibold">{playlist.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Create a secret link so anyone with it can listen to this playlist in a read-only view.
        </p>
      </div>
      <div className="space-y-4 px-6 py-5 text-white">
        {activeShare ? (
          <>
            <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Share link</p>
              <p className="mt-3 break-all text-sm text-slate-200">{shareUrl}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
              Shared listeners can play tracks and move through the queue, but they can&apos;t edit the playlist or see the rest of your library.
            </div>
          </>
        ) : (
          <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
            Sharing is off right now. Create a secret URL when you want to send this playlist out.
          </div>
        )}
        {feedback ? <p className="text-sm text-cyan-200">{feedback}</p> : null}
      </div>
      <div className="flex flex-col gap-3 border-t border-white/8 px-6 py-5 sm:flex-row sm:justify-between">
        {activeShare ? (
          <>
            <button type="button" className={SECONDARY_BUTTON} onClick={() => void handleCopyLink()}>
              <ShareIcon className="h-4 w-4" />
              Copy link
            </button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" className={SECONDARY_BUTTON} onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className={cn(
                  SECONDARY_BUTTON,
                  "border-rose-400/22 text-rose-200 hover:border-rose-300/34 hover:bg-rose-400/10",
                )}
                onClick={() => {
                  void handleRevoke();
                }}
                disabled={pending}
              >
                <TrashIcon className="h-4 w-4" />
                {pending ? "Revoking..." : "Revoke link"}
              </button>
            </div>
          </>
        ) : (
          <>
            <button type="button" className={SECONDARY_BUTTON} onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className={PRIMARY_BUTTON}
              onClick={() => {
                void handleEnableShare();
              }}
              disabled={pending}
            >
              <ShareIcon className="h-4 w-4" />
              {pending ? "Creating..." : "Create share link"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function SidebarLink(props: {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  isActive: boolean;
  suffix?: string;
}) {
  return (
    <Link
      href={props.href}
      className={cn(
        "flex items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-sm transition",
        props.isActive
          ? "border-cyan-300/28 bg-cyan-300/[0.1] text-cyan-100"
          : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="text-current">{props.icon}</span>
        <span className="truncate">{props.children}</span>
      </span>
      {props.suffix ? (
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.26em] text-slate-400">
          {props.suffix}
        </span>
      ) : null}
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-slate-900/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MenuButton(props: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition",
        props.danger
          ? "text-rose-300 hover:bg-rose-400/10"
          : "text-slate-200 hover:bg-white/7",
      )}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function ControlButton(props: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white transition hover:border-white/18 hover:bg-white/10"
      onClick={props.onClick}
      aria-label={props.ariaLabel}
    >
      {props.children}
    </button>
  );
}

function EmptyState(props: {
  hasTracks: boolean;
  isPlaylist: boolean;
  onAddTracks: () => void;
}) {
  if (!props.hasTracks) {
    return (
      <div className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.03] px-6 py-14 text-center text-white">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-200">First drop</p>
        <h3 className="mt-4 text-3xl font-semibold">
          {props.isPlaylist ? "This playlist is empty." : "Your library is waiting."}
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
          {props.isPlaylist
            ? "Add tracks from your library to give this playlist a pulse."
            : "Upload an audio file to generate the first waveform, unlock the dock, and start building playlists."}
        </p>
        {props.isPlaylist ? (
          <button className={cn(PRIMARY_BUTTON, "mt-6")} onClick={props.onAddTracks}>
            <PlusIcon className="h-4 w-4" />
            Add tracks
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.03] px-6 py-14 text-center text-white">
      <p className="text-xs uppercase tracking-[0.32em] text-amber-200">No matches</p>
      <h3 className="mt-4 text-3xl font-semibold">That search came up quiet.</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
        Try a different title, file name, or playlist mood.
      </p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 sm:px-6">
      <div className={`${PANEL} w-full overflow-hidden p-6 text-white sm:p-8`}>
        <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.32em] text-cyan-200">
          <MusicNoteIcon className="h-4 w-4" />
          Loading library
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-[26px] bg-white/[0.06]"
              />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-56 animate-pulse rounded-[26px] bg-white/[0.06]" />
            <div className="h-[420px] animate-pulse rounded-[26px] bg-white/[0.04]" />
          </div>
        </div>
      </div>
    </main>
  );
}
