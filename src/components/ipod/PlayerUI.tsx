import type { Player, PlayerAction } from '../../lib/music'
import { ipodDefinition, IPOD_FINISHES } from '../../lib/ipods'
import { HardwareIcon } from './Icons'

export interface PlayerControls {
  onAction: (id: string, action: PlayerAction) => void
  onTrack: (id: string, trackId: string) => void
  onFocus: (id: string) => void
  onCopy: (id: string) => void
  onInspect?: (id: string) => void
}
export function PlayerLabel({
  player,
  you,
  controls,
}: {
  player: Player
  you: boolean
  controls: PlayerControls
}) {
  return (
    <div className="person-header">
      <button
        className="person-name"
        onClick={() => (controls.onInspect || controls.onFocus)(player.user.id)}
        onFocus={(event) => {
          controls.onFocus(player.user.id)
          if (event.currentTarget.matches(':focus-visible'))
            controls.onInspect?.(player.user.id)
        }}
        aria-label={`Focus ${player.user.username}’s iPod`}
        title={`Zoom to ${player.user.username}’s iPod`}
      >
        <span
          className="person-avatar"
          style={{
            background: ['#dbded0', '#d2e0e4', '#e5cfd4', '#dce3ce', '#e4dece'][
              player.finish % 5
            ],
          }}
        >
          {player.user.username.slice(0, 1).toUpperCase()}
        </span>
        <span>{player.user.username}</span>
        {you && <span className="you">YOU</span>}
        <span className="inspect-cue" aria-hidden="true">
          ↗
        </span>
      </button>
      <button
        className="person-copy"
        aria-label={`Copy ${player.user.username}’s top five`}
        onClick={() => controls.onCopy(player.user.id)}
      >
        <HardwareIcon name="copy" />
      </button>
    </div>
  )
}
export function PlayerCaption({
  player,
  controls,
}: {
  player: Player
  controls: PlayerControls
}) {
  const model = ipodDefinition(player.device.model)
  const finish = IPOD_FINISHES[player.device.finish]
  return (
    <div className="person-caption">
      <span
        style={{ background: finish.color, borderColor: '#ffffff66' }}
        className={`finish-dot ${['cream', 'blue', 'rose', 'sage', 'gold'][player.finish % 5]}-dot`}
      />
      <span>
        {model.name} · {finish.name}
      </span>
      <i className="caption-divider" />

      <button
        className="inspect-button"
        onClick={() => controls.onAction(player.user.id, 'flip')}
        aria-label={`${player.state.flipped ? 'Face front' : 'Turn over'} ${player.user.username}’s iPod`}
      >
        <HardwareIcon name="flip" />
        {player.state.flipped ? 'Face front' : 'Turn over'}
      </button>
    </div>
  )
}
