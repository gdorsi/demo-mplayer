"use client";

import { clamp } from "@/lib/music/format";

type Snapshot = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isStalled: boolean;
  volume: number;
  loadedTrackId: string | null;
};

type Listener = () => void;

type TrackHandlers = {
  next: (() => void | Promise<void>) | null;
  previous: (() => void | Promise<void>) | null;
};

const DEFAULT_SNAPSHOT: Snapshot = {
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isStalled: false,
  volume: 0.72,
  loadedTrackId: null,
};

export class AudioManager {
  private readonly audio: HTMLAudioElement;
  private readonly listeners = new Set<Listener>();
  private readonly handlers: TrackHandlers = {
    next: null,
    previous: null,
  };
  private snapshot: Snapshot = DEFAULT_SNAPSHOT;
  private currentSrc: string | null = null;
  private keyboardEnabled = false;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "metadata";
    this.audio.volume = DEFAULT_SNAPSHOT.volume;

    this.audio.addEventListener("timeupdate", this.handleUpdate);
    this.audio.addEventListener("durationchange", this.handleUpdate);
    this.audio.addEventListener("play", this.handleUpdate);
    this.audio.addEventListener("pause", this.handleUpdate);
    this.audio.addEventListener("volumechange", this.handleUpdate);
    this.audio.addEventListener("waiting", this.handleWaiting);
    this.audio.addEventListener("playing", this.handlePlaying);
    this.audio.addEventListener("canplay", this.handlePlaying);
    this.audio.addEventListener("ended", this.handleEnded);
    this.audio.addEventListener("error", this.handleError);

    this.enableKeyboardShortcuts();
    this.updateSnapshot();
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private emit() {
    this.updateMediaSessionState();
    for (const listener of this.listeners) {
      listener();
    }
  }

  private updateSnapshot(partial?: Partial<Snapshot>) {
    this.snapshot = {
      currentTime: this.audio.currentTime || 0,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
      isPlaying: !this.audio.paused,
      isStalled: this.snapshot.isStalled,
      volume: this.audio.volume,
      loadedTrackId: this.snapshot.loadedTrackId,
      ...partial,
    };
    this.emit();
  }

  private handleUpdate = () => {
    this.updateSnapshot();
  };

  private handleWaiting = () => {
    this.updateSnapshot({ isStalled: true });
  };

  private handlePlaying = () => {
    this.updateSnapshot({ isStalled: false });
  };

  private handleEnded = () => {
    this.updateSnapshot({ currentTime: 0 });
    if (this.handlers.next) {
      void this.handlers.next();
    }
  };

  private handleError = () => {
    this.updateSnapshot({ isPlaying: false, isStalled: false });
  };

  private updateMediaSessionState() {
    if (!("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.playbackState = this.snapshot.isPlaying
      ? "playing"
      : "paused";
  }

  private updateMediaSessionHandlers() {
    if (!("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.setActionHandler("play", () => {
      void this.play();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      this.pause();
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      this.seekBy(-(details.seekOffset ?? 10));
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      this.seekBy(details.seekOffset ?? 10);
    });
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") {
        this.seekTo(details.seekTime);
      }
    });
    navigator.mediaSession.setActionHandler(
      "nexttrack",
      this.handlers.next ? () => void this.handlers.next?.() : null,
    );
    navigator.mediaSession.setActionHandler(
      "previoustrack",
      this.handlers.previous ? () => void this.handlers.previous?.() : null,
    );
  }

  private handleKeyboard = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable;

    if (isTyping) {
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      void this.toggle();
    }

    if (event.code === "ArrowLeft" && event.altKey) {
      event.preventDefault();
      void this.handlers.previous?.();
    }

    if (event.code === "ArrowRight" && event.altKey) {
      event.preventDefault();
      void this.handlers.next?.();
    }
  };

  enableKeyboardShortcuts() {
    if (this.keyboardEnabled) {
      return;
    }

    window.addEventListener("keydown", this.handleKeyboard);
    this.keyboardEnabled = true;
  }

  setMetadata({
    title,
    artist,
  }: {
    title: string;
    artist?: string;
  }) {
    if (!("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: artist ?? "",
      album: "",
      artwork: [],
    });
  }

  clearMetadata() {
    if (!("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = null;
  }

  setTrackHandlers(handlers: TrackHandlers) {
    this.handlers.next = handlers.next;
    this.handlers.previous = handlers.previous;
    this.updateMediaSessionHandlers();
  }

  async load(src: string, trackId: string) {
    console.log("load", src, trackId);
    if (this.currentSrc === src && this.snapshot.loadedTrackId === trackId) {
      return;
    }

    this.audio.pause();
    this.audio.src = src;
    this.audio.load();
    this.currentSrc = src;
    this.updateSnapshot({
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      isStalled: true,
      loadedTrackId: trackId,
    });

    await new Promise<void>((resolve, reject) => {
      const handleLoaded = () => {
        cleanup();
        this.updateSnapshot({ isStalled: false });
        resolve();
      };

      const handleFailed = () => {
        cleanup();
        reject(new Error("Unable to load audio."));
      };

      const cleanup = () => {
        this.audio.removeEventListener("loadeddata", handleLoaded);
        this.audio.removeEventListener("canplay", handleLoaded);
        this.audio.removeEventListener("error", handleFailed);
      };

      this.audio.addEventListener("loadeddata", handleLoaded);
      this.audio.addEventListener("canplay", handleLoaded);
      this.audio.addEventListener("error", handleFailed);
    });
  }

  async play() {
    await this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  async toggle() {
    if (this.audio.paused) {
      await this.play();
      return;
    }

    this.pause();
  }

  seekTo(seconds: number) {
    this.audio.currentTime = clamp(seconds, 0, this.audio.duration || 0);
    this.updateSnapshot();
  }

  seekBy(seconds: number) {
    this.seekTo(this.audio.currentTime + seconds);
  }

  setVolume(nextVolume: number) {
    this.audio.volume = clamp(nextVolume, 0, 1);
    this.updateSnapshot({ volume: this.audio.volume });
  }

  unload() {
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.currentSrc = null;
    this.clearMetadata();
    this.updateSnapshot({
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      isStalled: false,
      loadedTrackId: null,
    });
  }
}

let singleton: AudioManager | null = null;

export function getAudioManager() {
  if (typeof window === "undefined") {
    throw new Error("AudioManager is only available in the browser.");
  }

  if (!singleton) {
    singleton = new AudioManager();
  }

  return singleton;
}
