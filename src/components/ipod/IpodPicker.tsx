import {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  IPODS,
  IPOD_FINISHES,
  ipodDefinition,
  type IpodSelection,
} from '../../lib/ipods'
import {
  spotifyUrl,
  type Player,
  type PlayerAction,
  type PlayerState,
} from '../../lib/music'
import type { PlayerControls } from './PlayerUI'
import NativeDevice, { DeviceSilhouette, AlbumArtwork } from './NativeDevice'
import { HardwareIcon } from './Icons'
import './Devices.css'
const IpodPreview = lazy(() => import('./IpodPreview'))
interface Props {
  player: Player
  capable: boolean
  reduced: boolean
  loading: boolean
  loadError: boolean
  onRetry: () => void
  onSave: (selection: IpodSelection) => Promise<void>
  onClose: () => void
}
export default function IpodPicker({
  player,
  capable,
  reduced,
  loading,
  loadError,
  onRetry,
  onSave,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [nativeScale, setNativeScale] = useState(1)
  const [previewReady, setPreviewReady] = useState(false)
  const [selection, setSelection] = useState<IpodSelection>(player.device)
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (!touched) setSelection(player.device)
  }, [player.device, touched])
  const [state, setState] = useState<PlayerState>({
    selectedId: null,
    detail: false,
    flipped: false,
    reset: 0,
  })
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [native, setNative] = useState(!capable)
  const model = ipodDefinition(selection.model)
  useEffect(() => setPreviewReady(false), [model])
  useLayoutEffect(() => {
    const element = previewRef.current
    if (!element || !native) return
    const fit = () =>
      setNativeScale(
        Math.min(
          (element.clientWidth - 40) / (model.width * 100),
          (element.clientHeight - 30) / (model.height * 100)
        )
      )
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [model, native])
  const selected =
    player.tracks.find((track) => track.id === state.selectedId) ||
    player.tracks[0] ||
    null
  const draft: Player = { ...player, device: selection, state, selected }
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  const action = (_id: string, type: PlayerAction) => {
    if (type === 'play' || (type === 'select' && state.detail)) {
      if (selected)
        window.open(spotifyUrl(selected), '_blank', 'noopener,noreferrer')
      return
    }
    setState((current) => {
      if (type === 'shuffle') return { ...current, shuffle: !current.shuffle }
      if (type === 'previous' || type === 'next') {
        const index = player.tracks.findIndex(
          (track) => track.id === selected?.id
        )
        const next =
          player.tracks[
            (index + (type === 'previous' ? -1 : 1) + player.tracks.length) %
              player.tracks.length
          ]
        return {
          ...current,
          selectedId: next?.id || null,
          shuffle: current.shuffle,
        }
      }
      if (type === 'menu')
        return {
          ...current,
          detail: false,
          flipped: false,
          reset: current.reset + 1,
        }
      if (type === 'flip')
        return {
          ...current,
          flipped: !current.flipped,
          reset: current.reset + 1,
        }
      if (type === 'reset')
        return { ...current, flipped: false, reset: current.reset + 1 }
      return { ...current, detail: true }
    })
  }
  const controls: PlayerControls = {
    onAction: action,
    onTrack: (_id, id) =>
      setState((current) => ({ ...current, selectedId: id })),
    onFocus: () => {},
    onCopy: () => {},
  }
  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await onSave(selection)
      onClose()
    } catch (failure) {
      const value = failure as { code?: string; message?: string }
      setError(
        value.code === 'PGRST205' || value.code === '42P01'
          ? 'Account saving needs the iPod preferences database migration. Your current iPod has not changed.'
          : 'Couldn’t save your iPod. Check your connection and try again.'
      )
      setSaving(false)
    }
  }
  return (
    <dialog
      ref={dialog}
      className="ipod-picker"
      aria-labelledby="ipod-picker-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <div className="picker-heading">
        <div>
          <span className="picker-eyebrow">MAKE IT YOURS</span>
          <h2 id="ipod-picker-title">Choose your iPod.</h2>
        </div>
        <button
          className="picker-close"
          aria-label="Close iPod picker"
          disabled={saving}
          onClick={onClose}
        >
          <HardwareIcon name="close" />
        </button>
      </div>
      <div className="picker-layout">
        <div className="picker-showroom">
          <div
            ref={previewRef}
            className="picker-live-preview"
            data-preview-model={model.id}
            data-preview-ready={native || previewReady ? 'true' : 'false'}
          >
            {!native && !previewReady && (
              <div className="picker-preview-loading" role="status">
                Preparing your iPod…
              </div>
            )}
            {native ? (
              <div
                className="picker-native-preview"
                style={{
                  width: model.width * 100,
                  height: model.height * 100,
                  transform: `translate(-50%, -50%) scale(${nativeScale})`,
                }}
              >
                <NativeDevice player={draft} controls={controls} />
              </div>
            ) : (
              <Suspense fallback={null}>
                <IpodPreview
                  player={draft}
                  controls={controls}
                  reduced={reduced}
                  onLost={() => setNative(true)}
                  onReady={() => setPreviewReady(true)}
                />
              </Suspense>
            )}
          </div>
          <div className="picker-preview-actions">
            <span>
              {native ? 'Try the click wheel' : 'Drag to turn · Flick to spin'}
            </span>
            {!native && (
              <button onClick={() => action(player.user.id, 'flip')}>
                <HardwareIcon name="flip" />
                {state.flipped ? 'Face front' : 'Turn over'}
              </button>
            )}
            <button onClick={() => action(player.user.id, 'reset')}>
              Reset
            </button>
          </div>
          <div className="picker-model-info">
            <div>
              <h3>{model.name}</h3>
              <span>
                {model.generation} · {model.year}
              </span>
            </div>
            <p>{model.description}</p>
            <div className="picker-specs">
              <span>
                {model.mm[0]} × {model.mm[1]} × {model.mm[2]} mm
              </span>
              <span>{model.capacity}</span>
              <a href={model.source} target="_blank" rel="noreferrer">
                Model reference ↗
              </a>
            </div>
          </div>
          {model.id === 'shuffle2' && selected && (
            <div className="picker-screenless-track">
              <AlbumArtwork
                url={selected.image_url}
                album={selected.album}
                artist={selected.artist}
              />
              <div>
                <span>NO SCREEN. SAME TOP FIVE.</span>
                <strong>{selected.name}</strong>
                <small>{selected.artist}</small>
              </div>
            </div>
          )}
        </div>
        <div className="picker-options">
          <fieldset className="picker-models" disabled={saving}>
            <legend>
              01 <span>Pick a model</span>
            </legend>
            {IPODS.map((option) => (
              <label
                className={`picker-model-option ${selection.model === option.id ? 'is-chosen' : ''}`}
                key={option.id}
              >
                <input
                  type="radio"
                  name="ipod-model"
                  value={option.id}
                  checked={selection.model === option.id}
                  onChange={() => {
                    setTouched(true)
                    setSelection({
                      model: option.id,
                      finish: option.defaultFinish,
                    })
                    setState((current) => ({
                      ...current,
                      detail: false,
                      flipped: false,
                      reset: current.reset + 1,
                    }))
                    setError('')
                  }}
                />
                <DeviceSilhouette
                  selection={{
                    model: option.id,
                    finish:
                      option.id === selection.model
                        ? selection.finish
                        : option.defaultFinish,
                  }}
                />
                <span>
                  <strong>{option.name}</strong>
                  <small>
                    {option.generation} <i>·</i> {option.year}
                  </small>
                </span>
                <b aria-hidden="true">
                  {selection.model === option.id ? '✓' : ''}
                </b>
              </label>
            ))}
          </fieldset>
          <fieldset className="picker-finishes" disabled={saving}>
            <legend>
              02 <span>Choose a finish</span>
              <strong>{IPOD_FINISHES[selection.finish].name}</strong>
            </legend>
            <div>
              {model.finishes.map((finish) => (
                <label
                  key={finish}
                  className={`picker-swatch ${finish === selection.finish ? 'is-chosen' : ''}`}
                  title={IPOD_FINISHES[finish].name}
                >
                  <input
                    type="radio"
                    name="ipod-finish"
                    value={finish}
                    aria-label={IPOD_FINISHES[finish].name}
                    checked={selection.finish === finish}
                    onChange={() => {
                      setTouched(true)
                      setSelection({ ...selection, finish })
                    }}
                  />
                  <span style={{ background: IPOD_FINISHES[finish].color }} />
                  {selection.finish === finish && <b aria-hidden="true">✓</b>}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
      <div className="picker-footer">
        <div>
          <span>Saved to your account. Your friends will see your choice.</span>
          {loading && <span role="status">Loading your saved iPod…</span>}
          {loadError && (
            <span role="alert">
              Couldn’t load your saved iPod.{' '}
              <button onClick={onRetry}>Try again</button>
            </span>
          )}
          {error && (
            <p className="picker-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <button className="picker-cancel" disabled={saving} onClick={onClose}>
          Cancel
        </button>
        <button
          className="picker-save"
          disabled={saving || loading || loadError}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'This is my iPod'}
          <span aria-hidden="true">{saving ? '◌' : '↗'}</span>
        </button>
      </div>
    </dialog>
  )
}
