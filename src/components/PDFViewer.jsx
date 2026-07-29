export default function PDFViewer({ url }) {
  if (!url) return null

  return (
    <div className="w-full rounded-sm overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border">
        <span className="text-xs font-semibold text-muted tracking-wider uppercase">Document</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-white hover:text-muted transition-colors flex items-center gap-1.5"
        >
          Open in new tab
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
      <iframe
        src={url}
        title="Project attachment"
        className="w-full"
        style={{ height: '70vh', minHeight: '500px' }}
      />
    </div>
  )
}
