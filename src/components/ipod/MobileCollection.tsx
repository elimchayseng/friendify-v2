import type { Player } from '../../lib/music'
import { spotifyUrl } from '../../lib/music'
import { AlbumArtwork } from './NativeDevice'
import type { PlayerControls } from './PlayerUI'

export function MobileFriendNav({
  players,
  active,
  userId,
  onSelect,
  onNavigate,
}: {
  players: Player[]
  active: Player
  userId: string | null
  onSelect: (id: string) => void
  onNavigate: (direction: number) => void
}) {
  return (
    <nav className="mobile-friend-nav" aria-label="Browse friends’ iPods">
      <button
        aria-label="Previous iPod"
        disabled={players.length < 2}
        onClick={() => onNavigate(-1)}
      >
        <span aria-hidden="true">←</span>
      </button>
      <div className="mobile-friend-select">
        <select
          aria-label="Choose a friend’s iPod"
          value={active.user.id}
          onChange={(event) => onSelect(event.target.value)}
        >
          {players.map((player) => (
            <option key={player.user.id} value={player.user.id}>
              {player.user.username}
              {player.user.id === userId ? ' (you)' : ''}
            </option>
          ))}
        </select>
        <span aria-hidden="true">⌄</span>
      </div>
      <button
        aria-label="Next iPod"
        disabled={players.length < 2}
        onClick={() => onNavigate(1)}
      >
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  )
}

export function MobileTopFive({
  player,
  controls,
}: {
  player: Player
  controls: PlayerControls
}) {
  return (
    <section className="mobile-top-five" aria-labelledby="mobile-tracks-heading">
      <div className="mobile-tracks-heading">
        <h2 id="mobile-tracks-heading">{player.user.username}’s top five</h2>
      </div>
      <ol>
        {player.tracks.map((track) => (
          <li
            key={track.id}
            className={player.selected?.id === track.id ? 'is-selected' : ''}
          >
            <a
              className="mobile-song-link"
              href={spotifyUrl(track)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${track.name} by ${track.artist} in Spotify`}
              onClick={() => controls.onTrack(player.user.id, track.id)}
            >
              <span className="mobile-song-rank">
                {String(track.rank).padStart(2, '0')}
              </span>
              <AlbumArtwork
                url={track.image_url}
                album={track.album}
                artist={track.artist}
              />
              <span className="mobile-song-copy">
                <strong>{track.name}</strong>
                <small>{track.artist}</small>
              </span>
              <span className="mobile-song-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}
