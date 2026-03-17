import { MusicPlayerApp } from "@/components/music/music-player-app";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const { playlistId } = await params;

  return <MusicPlayerApp playlistId={playlistId} />;
}
