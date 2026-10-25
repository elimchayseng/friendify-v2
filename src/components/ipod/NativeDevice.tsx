import { useEffect, useState, type CSSProperties } from 'react'
import type { Player } from '../../lib/music'
import {
  ipodAppearance,
  ipodDefinition,
  type IpodSelection,
} from '../../lib/ipods'
import type { PlayerControls } from './PlayerUI'
import { HardwareIcon } from './Icons'

export function AlbumArtwork({
  url,
  album,
  artist,
}: {
  url?: string | null
  album: string
  artist: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [url])
  return url && !failed ? (
    <img
      className="album-artwork"
      src={url}
      alt={`${album} by ${artist}`}
      onError={() => setFailed(true)}
      draggable={false}
    />
  ) : (
    <div
      className="album-artwork artwork-unavailable"
      role="img"
      aria-label={`Artwork unavailable for ${album}`}
    >
      <span aria-hidden="true">♫</span>
      <small>Artwork unavailable</small>
    </div>
  )
}
export function DeviceSilhouette({ selection }: { selection: IpodSelection }) {
  const model = ipodDefinition(selection.model),
    finish = ipodAppearance(selection),
    s = model.screen
  return (
    <svg
      className="device-silhouette"
      viewBox={`0 0 ${model.width * 100 + 12} ${model.height * 100 + 12}`}
      aria-hidden="true"
    >
      <rect
        x="6"
        y="6"
        width={model.width * 100}
        height={model.height * 100}
        rx={model.radius * 100}
        fill={finish.color}
        stroke="#ffffff80"
        strokeWidth="2"
      />
      {s && (
        <rect
          x={6 + (model.width - s.width) * 50}
          y={6 + (model.height / 2 - s.y - s.height / 2) * 100}
          width={s.width * 100}
          height={s.height * 100}
          rx="4"
          fill={
            s.color ? '#1f2937' : model.id === 'mini2' ? '#b9c6d2' : '#c7d1ad'
          }
        />
      )}
      <circle
        cx={6 + model.width * 50}
        cy={6 + (model.height / 2 - model.wheel.y) * 100}
        r={model.wheel.radius * 100}
        fill={finish.wheel}
        stroke="#0002"
        strokeWidth="2"
      />
      <circle
        cx={6 + model.width * 50}
        cy={6 + (model.height / 2 - model.wheel.y) * 100}
        r={model.wheel.center * 100}
        fill={finish.center}
        stroke="#0003"
        strokeWidth="1.5"
      />
    </svg>
  )
}
function DeviceScreen({
  player,
  controls,
  interactive,
}: {
  player: Player
  controls: PlayerControls
  interactive: boolean
}) {
  const model = ipodDefinition(player.device.model),
    screen = model.screen!,
    track = player.selected
  const isColor = screen.color,
    portrait = screen.portrait
  const art = track && (
    <AlbumArtwork
      url={track.image_url}
      album={track.album}
      artist={track.artist}
    />
  )
  const row = (song: Player['tracks'][number]) => {
    const content = (
      <>
        <span>{song.rank}</span>
        <span>{song.name}</span>
        <b aria-hidden="true">›</b>
      </>
    )
    return (
      <li key={song.id}>
        {interactive ? (
          <button
            type="button"
            className={`device-row ${song.id === track?.id ? 'is-selected' : ''}`}
            aria-label={`${song.rank}. ${song.name} by ${song.artist}`}
            aria-pressed={song.id === track?.id}
            onClick={() => controls.onTrack(player.user.id, song.id)}
          >
            {content}
          </button>
        ) : (
          <div
            className={`device-row ${song.id === track?.id ? 'is-selected' : ''}`}
          >
            {content}
          </div>
        )}
      </li>
    )
  }
  return (
    <div
      className={`device-display ${isColor ? 'is-color' : 'is-mono'} ${portrait ? 'is-portrait' : ''} ${model.id === 'mini2' ? 'is-blue-lcd' : ''} ${player.state.detail ? 'is-detail' : ''}`}
    >
      <div className="device-status">
        <span>
          {player.state.detail
            ? 'Now Playing'
            : `${player.user.username}’s iPod`}
        </span>
        <i className="device-battery" aria-hidden="true" />
      </div>
      {player.state.detail && track ? (
        <div className="device-detail">
          {isColor && art}
          <div className="device-track-info">
            <strong>{track.name}</strong>
            <span>{track.artist}</span>
            <small>{track.album}</small>
            {interactive && (
              <button
                className="device-open"
                onClick={() => controls.onAction(player.user.id, 'play')}
              >
                ▶ Open in Spotify ↗
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="device-library">
            <ol>{player.tracks.map(row)}</ol>
            {isColor && <div className="device-art-pane">{art}</div>}
          </div>
          <div className="device-screen-footer">
            {track?.artist || 'No matching songs'}
          </div>
        </>
      )}
    </div>
  )
}
export default function NativeDevice({
  player,
  controls,
  interactive = true,
}: {
  player: Player
  controls: PlayerControls
  interactive?: boolean
}) {
  const model = ipodDefinition(player.device.model),
    finish = ipodAppearance(player.device),
    s = model.screen,
    wheel = model.wheel
  const shuffle = model.id === 'shuffle2'
  const style = {
    width: model.width * 100,
    height: model.height * 100,
    borderRadius: model.radius * 100,
    '--device-color': finish.color,
    '--wheel-color': finish.wheel,
    '--wheel-center': finish.center,
    '--wheel-ink': finish.ink,
  } as CSSProperties
  const action = (name: 'menu' | 'previous' | 'next' | 'play' | 'select') =>
    controls.onAction(player.user.id, name)
  return (
    <div
      className={`native-device native-${model.id} material-${model.material}`}
      style={style}
      data-model={model.id}
    >
      <span className="native-hold" aria-hidden="true" />
      <span className="native-jack" aria-hidden="true" />
      {s && (
        <div
          className="native-bezel"
          style={{
            width: s.width * 100 + 8,
            height: s.height * 100 + 8,
            left: (model.width - s.width) * 50 - 4,
            top: (model.height / 2 - s.y - s.height / 2) * 100 - 4,
            fontSize: s.width * 5.6,
          }}
        >
          <DeviceScreen
            player={player}
            controls={controls}
            interactive={interactive}
          />
        </div>
      )}
      <div
        className="native-wheel"
        style={{
          width: wheel.radius * 200,
          height: wheel.radius * 200,
          left: model.width * 50 - wheel.radius * 100,
          top: (model.height / 2 - wheel.y - wheel.radius) * 100,
        }}
        data-wheel-id={interactive ? player.user.id : undefined}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'group' : undefined}
        aria-label={
          interactive
            ? `${player.user.username}’s ${shuffle ? 'control pad' : 'click wheel'}`
            : undefined
        }
        onKeyDown={(event) => {
          if (
            !interactive ||
            (event.target instanceof HTMLButtonElement &&
              ['Enter', ' '].includes(event.key))
          )
            return
          if (
            [
              'ArrowUp',
              'ArrowDown',
              'ArrowLeft',
              'ArrowRight',
              'Enter',
              'Escape',
            ].includes(event.key)
          ) {
            event.preventDefault()
            event.stopPropagation()
            action(
              event.key === 'Enter'
                ? shuffle
                  ? 'play'
                  : 'select'
                : event.key === 'Escape'
                  ? 'menu'
                  : ['ArrowUp', 'ArrowLeft'].includes(event.key)
                    ? 'previous'
                    : 'next'
            )
          }
        }}
      >
        {interactive ? (
          <>
            <button
              className="native-menu"
              aria-label={
                shuffle
                  ? 'Volume is controlled in Spotify'
                  : `Back to ${player.user.username}’s top five`
              }
              disabled={shuffle}
              onClick={() => action('menu')}
            >
              {shuffle ? '+' : 'MENU'}
            </button>
            <button
              className="native-prev"
              aria-label={`Previous song on ${player.user.username}’s iPod`}
              onClick={() => action('previous')}
            >
              <HardwareIcon name="previous" />
            </button>
            <button
              className="native-next"
              aria-label={`Next song on ${player.user.username}’s iPod`}
              onClick={() => action('next')}
            >
              <HardwareIcon name="next" />
            </button>
            <button
              className="native-play"
              aria-label={
                shuffle
                  ? 'Volume is controlled in Spotify'
                  : `Open ${player.user.username}’s selected song in Spotify`
              }
              disabled={shuffle}
              onClick={() => action('play')}
            >
              {shuffle ? '−' : <HardwareIcon name="play" />}
            </button>
            <button
              className="native-center"
              style={{ width: wheel.center * 200, height: wheel.center * 200 }}
              aria-label={
                shuffle
                  ? `Open ${player.user.username}’s selected song in Spotify`
                  : `Select song on ${player.user.username}’s iPod`
              }
              onClick={() => action(shuffle ? 'play' : 'select')}
            >
              {shuffle && <HardwareIcon name="play" />}
            </button>
          </>
        ) : (
          <>
            <span className="native-menu">{shuffle ? '+' : 'MENU'}</span>
            <span className="native-prev">◀◀</span>
            <span className="native-next">▶▶</span>
            <span className="native-play">{shuffle ? '−' : '▶Ⅱ'}</span>
            <span
              className="native-center"
              style={{ width: wheel.center * 200, height: wheel.center * 200 }}
            >
              {shuffle ? '▶Ⅱ' : ''}
            </span>
          </>
        )}
      </div>
      {shuffle && interactive && (
        <button
          className="native-shuffle-switch"
          aria-label={`Shuffle ${player.user.username}’s songs`}
          aria-pressed={Boolean(player.state.shuffle)}
          onClick={() => controls.onAction(player.user.id, 'shuffle')}
        >
          ⤨
        </button>
      )}
      {!shuffle && <span className="native-dock" aria-hidden="true" />}
    </div>
  )
}
