import { SharedPlaylistApp } from "@/components/music/music-player-app";

export default async function SharedPlaylistPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;

  return <SharedPlaylistApp secret={secret} />;
}
