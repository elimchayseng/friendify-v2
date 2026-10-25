import type { Player } from '../../lib/music'
import { spotifyUrl } from '../../lib/music'
import { ipodDefinition } from '../../lib/ipods'
import { AlbumArtwork } from './NativeDevice'
import { HardwareIcon } from './Icons'
import type { PlayerControls } from './PlayerUI'
export default function MusicFallback({
  players,
  controls,
}: {
  players: Player[]
  controls: PlayerControls
}) {
  return (
    <div className="music-fallback" data-renderer="accessible">
      <div className="fallback-notice" role="status">
        <span>3D couldn’t start. Your music is available below.</span>
        <button onClick={() => window.location.reload()}>Retry 3D ↗</button>
      </div>
      <div className="fallback-players">
        {players.map((player) => (
          <article
            className="fallback-player"
            key={player.user.id}
            data-model={player.device.model}
          >
            <header>
              <div>
                <h2>{player.user.username}</h2>
                <span>{ipodDefinition(player.device.model).name}</span>
              </div>
              <button
                aria-label={`Copy ${player.user.username}’s top five`}
                onClick={() => controls.onCopy(player.user.id)}
              >
                <HardwareIcon name="copy" />
              </button>
            </header>
            <ol>
              {player.tracks.map((track) => (
                <li key={track.id}>
                  <a
                    href={spotifyUrl(track)}
                    target="_blank"
                    rel="noreferrer"
                    onFocus={() => controls.onFocus(player.user.id)}
                    onClick={() => controls.onTrack(player.user.id, track.id)}
                  >
                    <span>{track.rank}</span>
                    <AlbumArtwork
                      url={track.image_url}
                      album={track.album}
                      artist={track.artist}
                    />
                    <div>
                      <strong>{track.name}</strong>
                      <small>{track.artist}</small>
                    </div>
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </div>
  )
}
