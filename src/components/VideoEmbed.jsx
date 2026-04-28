// Accepts a full YouTube URL or embed URL and renders a responsive 16:9 iframe.
function toEmbedUrl(url) {
  if (!url) return null
  // Already an embed URL
  if (url.includes('youtube.com/embed/')) return url
  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
  return url
}

export default function VideoEmbed({ url }) {
  const embedUrl = toEmbedUrl(url)
  if (!embedUrl) return null

  return (
    <div className="w-full rounded-sm overflow-hidden border border-border aspect-video">
      <iframe
        src={embedUrl}
        title="Project video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  )
}
