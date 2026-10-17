/** Room gallery entries are plain URLs; an .mp4 URL is a video clip, anything else an image. */
export function isVideoUrl(url: string) {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".mp4");
  } catch {
    return /\.mp4(\?|#|$)/i.test(url);
  }
}

/** First frame as the poster: browsers (notably iOS Safari) show nothing for preload="metadata" without it. */
export function videoSrc(url: string) {
  return url.includes("#") ? url : `${url}#t=0.1`;
}
