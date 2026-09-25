// Turn a YouTube/Vimeo watch URL into an embeddable player URL. Returns null if
// it isn't a recognised video link (caller can fall back to a plain link).
export function embedUrl(raw?: string | null): string | null {
  if (!raw) return null
  const url = raw.trim()
  // YouTube: youtu.be/ID, youtube.com/watch?v=ID, /live/ID, /embed/ID
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/))([\w-]{6,})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  // Vimeo: vimeo.com/ID
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}
