// MUSIC_SECTION — uncomment in Home.jsx when ready
//
// This section is scaffolded but not live yet.
// When built: a record on a shelf. One or two embeds. A short honest line.
// No subscribe CTA. No playlist grid.

/* eslint-disable no-unreachable */
export default function Music() {
  return (
    <section id="music" style={{ paddingTop: '140px', paddingBottom: '140px' }}>
      <div className="content-wrap">
        <div className="divider mb-6" />
        <h2 className="font-serif text-cream" style={{ fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3rem' }}>
          Music
        </h2>

        {/* Placeholder — replace iframe src with real embed when ready */}
        <p
          className="font-mono text-stone"
          style={{ fontSize: '13px', lineHeight: 1.7, marginBottom: '2rem' }}
        >
          {/* placeholder description line — edit this when going live */}
          music made quietly, in between other things.
        </p>

        {/* SoundCloud / Spotify iframe — swap src when ready */}
        <iframe
          title="music embed"
          src="about:blank"
          style={{
            width: '100%',
            height: '166px',
            border: 'none',
            opacity: 0.6,
          }}
          allow="autoplay"
        />
      </div>
    </section>
  )
}
