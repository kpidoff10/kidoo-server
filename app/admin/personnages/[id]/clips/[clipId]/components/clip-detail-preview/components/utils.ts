const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?|$)/i;

export function isVideoUrl(url: string): boolean {
  try {
    return VIDEO_EXT.test(new URL(url).pathname) || VIDEO_EXT.test(url);
  } catch {
    return VIDEO_EXT.test(url);
  }
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}
