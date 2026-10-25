export function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1.03.25c-2.81-1.71-6.34-2.1-10.5-1.15a.75.75 0 1 1-.33-1.46c4.55-1.04 8.46-.59 11.6 1.33.35.22.47.68.26 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31C14.47 12.37 9.57 11.8 5.77 13a.94.94 0 0 1-.57-1.79c4.34-1.37 9.74-.73 13.46 1.55.44.27.58.85.31 1.28Zm.13-3.41C15.25 8.33 8.9 8.12 5.22 9.24a1.13 1.13 0 1 1-.66-2.16c4.22-1.28 11.23-1.04 15.7 1.61a1.13 1.13 0 0 1-1.16 1.93Z" />
    </svg>
  )
}
export function SearchIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="m12 12 5 5" />
    </svg>
  )
}
export function HardwareIcon({
  name,
}: {
  name: 'previous' | 'next' | 'play' | 'copy' | 'flip' | 'close'
}) {
  if (name === 'copy' || name === 'flip' || name === 'close')
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {name === 'copy' ? (
          <>
            <rect x="8" y="8" width="12" height="13" rx="2" />
            <path d="M15 8V4H3v12h5" />
          </>
        ) : name === 'flip' ? (
          <>
            <path d="M5 8a8 8 0 1 1-1 7M5 8V3m0 5h5" />
            <path d="M11 8v8" />
          </>
        ) : (
          <path d="m6 6 12 12M6 18 18 6" />
        )}
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        d={
          name === 'previous'
            ? 'M5 6h2v12H5zm3 6 7-6v12zm7 0 7-6v12z'
            : name === 'next'
              ? 'M17 6h2v12h-2zM2 6l7 6-7 6zm7 0 7 6-7 6z'
              : 'm4 5 10 7-10 7zm12 1h2v12h-2zm4 0h2v12h-2z'
        }
      />
    </svg>
  )
}
