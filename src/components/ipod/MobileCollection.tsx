import { useEffect, useRef } from 'react'
import type { Player } from '../../lib/music'
import { spotifyUrl } from '../../lib/music'
import { ipodDefinition, IPOD_FINISHES } from '../../lib/ipods'
import { AlbumArtwork } from './NativeDevice'
import { SpotifyIcon } from './Icons'
import type { PlayerControls } from './PlayerUI'

export function MobileFriendNav({
  players,
  active,
  userId,
  reduced,
  onSelect,
  onNavigate,
}: {
  players: Player[]
  active: Player
  userId: string | null
  reduced: boolean
  onSelect: (id: string) => void
  onNavigate: (direction: number) => void
}) {
  const rail = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = rail.current
    const selected = element?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!element || !selected) return
    element.scrollTo({
      left: selected.offsetLeft - element.clientWidth / 2 + selected.clientWidth / 2,
      behavior: reduced ? 'instant' : 'smooth',
    })
  }, [active.user.id, reduced])
  return (
    <nav className="mobile-friend-nav" aria-label="Browse friends’ iPods">
      <button aria-label="Previous iPod" disabled={players.length < 2} onClick={() => onNavigate(-1)}>
        <span aria-hidden="true">←</span>
      </button>
      <div ref={rail} className="mobile-friend-rail">
        {players.map((player) => (
          <button
            key={player.user.id}
            aria-pressed={player.user.id === active.user.id}
            onClick={() => onSelect(player.user.id)}
          >
            <i style={{ background: IPOD_FINISHES[player.device.finish].color }} aria-hidden="true" />
            <span className="mobile-friend-name">{player.user.username}</span>
            {player.user.id === userId && <small>YOU</small>}
          </button>
        ))}
      </div>
      <button aria-label="Next iPod" disabled={players.length < 2} onClick={() => onNavigate(1)}>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  )
}

export function MobileTopFive({
  player,
  index,
  count,
  controls,
}: {
  player: Player
  index: number
  count: number
  controls: PlayerControls
}) {
  const model = ipodDefinition(player.device.model)
  return (
    <section className="mobile-top-five" aria-labelledby="mobile-tracks-heading">
      <div className="mobile-tracks-heading">
        <div>
          <p>{model.name} · {IPOD_FINISHES[player.device.finish].name}</p>
          <h2 id="mobile-tracks-heading">{player.user.username}’s top five</h2>
        </div>
        <span className="mobile-position" aria-label={`iPod ${index + 1} of ${count}`}>
          {String(index + 1).padStart(2, '0')}<span> / {String(count).padStart(2, '0')}</span>
        </span>
      </div>
      <ol>
        {player.tracks.map((track) => (
          <li key={track.id} className={player.selected?.id === track.id ? 'is-selected' : ''}>
            <button
              className="mobile-song-select"
              aria-pressed={player.selected?.id === track.id}
              onClick={() => controls.onTrack(player.user.id, track.id)}
            >
              <span className="mobile-song-rank">{String(track.rank).padStart(2, '0')}</span>
              <AlbumArtwork url={track.image_url} album={track.album} artist={track.artist} />
              <span className="mobile-song-copy">
                <strong>{track.name}</strong>
                <small>{track.artist}</small>
              </span>
            </button>
            <a href={spotifyUrl(track)} target="_blank" rel="noreferrer" aria-label={`Open ${track.name} in Spotify`}>
              <SpotifyIcon />
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}
