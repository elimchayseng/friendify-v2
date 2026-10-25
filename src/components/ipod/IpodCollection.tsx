import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAllUserTracks,
  getIpodPreferences,
  saveIpodPreference,
} from '../../lib/supabase'
import {
  DEFAULT_IPOD,
  ipodDefinition,
  type IpodSelection,
} from '../../lib/ipods'
import {
  sharedKeys,
  spotifyUrl,
  trackKey,
  type Player,
  type PlayerAction,
  type PlayerState,
  type UserTracks,
} from '../../lib/music'
import type { PlayerControls } from './PlayerUI'
import MusicFallback from './MusicFallback'
import { HardwareIcon, SearchIcon } from './Icons'
import Starfield from './Starfield'
import IpodPicker from './IpodPicker'
import { AlbumArtwork } from './NativeDevice'
import { collectionZoom, playerPosition, type CollectionView } from './layout'
import { MobileFriendNav, MobileTopFive } from './MobileCollection'
import './Collection.css'
import './Space.css'
import './Mobile.css'

const IpodScene = lazy(() => import('./IpodScene'))
const mobileQuery = '(max-width: 760px), (max-width: 950px) and (max-height: 500px)'
interface Props {
  userId: string | null
  username?: string
  profileLoading?: boolean
  signingOut?: boolean
  error?: string | null
  onDismissError?: () => void
  onLogout?: () => void
}
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? (
      <p className="scene-status">Loading your song list…</p>
    ) : (
      this.props.children
    )
  }
}
function supports3D() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
const initialPlayer: PlayerState = {
  selectedId: null,
  detail: false,
  flipped: false,
  reset: 0,
}

export default function IpodCollection({
  userId,
  username,
  profileLoading,
  signingOut,
  error: externalError,
  onDismissError,
  onLogout,
}: Props) {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = (event: MediaQueryListEvent) => setReduced(event.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  const [capable, setCapable] = useState(supports3D)
  const [ready, setReady] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [shufflePanelOpen, setShufflePanelOpen] = useState(true)
  const client = useQueryClient()
  const preferences = useQuery({
    queryKey: ['ipod-preferences'],
    queryFn: getIpodPreferences,
    enabled: !profileLoading,
    retry: 1,
    staleTime: 300000,
  })
  const [filter, setFilter] = useState<'all' | 'shared' | 'you'>('all')
  const [search, setSearch] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [states, setStates] = useState<Record<string, PlayerState>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<CollectionView>({
    scale: 1,
    x: 0,
    y: 0,
  })
  const galleryRef = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(window.innerWidth)
  const [mobile, setMobile] = useState(() => window.matchMedia(mobileQuery).matches)
  const [sceneVisible, setSceneVisible] = useState(true)
  const [notice, setNotice] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [sounds, setSounds] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const helpRef = useRef<HTMLDialogElement>(null)
  const filterRef = useRef<HTMLDetailsElement>(null)
  const menuRef = useRef<HTMLDetailsElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const { data, error, isLoading, isFetching, refetch } = useQuery<
    UserTracks[]
  >({
    queryKey: ['all-user-tracks'],
    queryFn: getAllUserTracks,
    enabled: !profileLoading,
    retry: 2,
    staleTime: 300000,
  })
  const users = useMemo(
    () =>
      [...(data || [])].sort((a, b) =>
        a.user.id === userId ? -1 : b.user.id === userId ? 1 : 0
      ),
    [data, userId]
  )
  const shared = useMemo(
    () =>
      sharedKeys(
        selectedFriends.length
          ? users.filter(({ user }) => selectedFriends.includes(user.id))
          : users
      ),
    [users, selectedFriends]
  )
  const q = search.trim().toLowerCase()
  const players = useMemo<Player[]>(
    () =>
      users
        .map(({ user, tracks }, finish) => {
          const visible = tracks.filter(
            (track) =>
              (filter !== 'you' || user.id === userId) &&
              (!selectedFriends.length || selectedFriends.includes(user.id)) &&
              (filter !== 'shared' || shared.has(trackKey(track))) &&
              (!q ||
                `${user.username} ${track.name} ${track.artist} ${track.album}`
                  .toLowerCase()
                  .includes(q))
          )
          const state = states[user.id] || initialPlayer
          const selected =
            visible.find((track) => track.id === state.selectedId) ||
            visible[0] ||
            null
          const device = preferences.data?.[user.id] || DEFAULT_IPOD
          return { user, tracks: visible, finish, state, selected, device }
        })
        .filter((player) => player.tracks.length),
    [
      users,
      filter,
      userId,
      selectedFriends,
      shared,
      q,
      states,
      preferences.data,
    ]
  )
  const columns = Math.max(
    1,
    Math.min(players.length, width >= 1200 ? 5 : width >= 900 ? 4 : 3)
  )
  const active =
    players.find((player) => player.user.id === activeId) || players[0] || null
  const scenePlayers = mobile && active ? [active] : players
  const ownSource = users.find(({ user }) => user.id === userId)
  const ownDevice = preferences.data?.[userId || ''] || DEFAULT_IPOD
  const ownState = states[userId || ''] || initialPlayer
  const ownPlayer: Player | null = userId
    ? {
        user: ownSource?.user || { id: userId, username: username || 'Your' },
        tracks: ownSource?.tracks || [],
        finish: 0,
        state: ownState,
        selected:
          ownSource?.tracks.find((track) => track.id === ownState.selectedId) ||
          ownSource?.tracks[0] ||
          null,
        device: ownDevice,
      }
    : null
  const saveDevice = async (selection: IpodSelection) => {
    if (!userId) throw new Error('Sign in to choose your iPod.')
    const saved = await saveIpodPreference(userId, selection)
    client.setQueryData<Record<string, IpodSelection>>(
      ['ipod-preferences'],
      (previous) => ({ ...previous, [userId]: saved })
    )
    setNotice('Your iPod is saved. Your friends will see your choice.')
    setShufflePanelOpen(true)
  }
  const pending = isLoading || profileLoading
  const filterSummary = [
    filter === 'shared' ? 'Shared songs' : filter === 'you' ? 'Your songs' : '',
    search.trim() ? `“${search.trim()}”` : '',
    selectedFriends.length
      ? `${selectedFriends.length} ${selectedFriends.length === 1 ? 'friend' : 'friends'}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ')

  useEffect(() => {
    if (browseOpen) searchRef.current?.focus()
  }, [browseOpen])

  useEffect(() => {
    const resize = () => {
      setWidth(window.innerWidth)
      setMobile(window.matchMedia(mobileQuery).matches)
    }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  useEffect(() => {
    setViewport({ scale: 1, x: 0, y: 0 })
  }, [mobile])
  useEffect(() => {
    const stage = galleryRef.current?.querySelector('.scene-shell')
    if (!stage || !mobile) {
      setSceneVisible(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) =>
      setSceneVisible(entry.isIntersecting)
    )
    observer.observe(stage)
    return () => observer.disconnect()
  }, [mobile, ready, capable, pending, error])
  useEffect(() => {
    if (!notice) return
    const timeout = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timeout)
  }, [notice])
  useEffect(() => {
    if (helpOpen && !helpRef.current?.open) helpRef.current?.showModal()
    else if (!helpOpen && helpRef.current?.open) helpRef.current.close()
  }, [helpOpen])
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node))
        filterRef.current?.removeAttribute('open')
      if (!menuRef.current?.contains(event.target as Node))
        menuRef.current?.removeAttribute('open')
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (menuRef.current?.open) {
        menuRef.current.removeAttribute('open')
        menuRef.current.querySelector('summary')?.focus()
      }
      filterRef.current?.removeAttribute('open')
      const browse = document.getElementById('collection-browse')
      if (browse && !browse.hidden && !document.querySelector('dialog[open]')) {
        setBrowseOpen(false)
        document.querySelector<HTMLButtonElement>('.browse-toggle')?.focus()
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [])
  useEffect(
    () => () => {
      void audio.current?.close()
    },
    []
  )
  const tick = useCallback(() => {
    if (!sounds) return
    try {
      const context = audio.current || (audio.current = new AudioContext())
      void context.resume()
      const oscillator = context.createOscillator(),
        gain = context.createGain()
      oscillator.type = 'square'
      oscillator.frequency.value = 1600
      gain.gain.setValueAtTime(0.025, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.015)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.016)
    } catch {
      /* Sound is an optional enhancement. */
    }
  }, [sounds])
  const update = (id: string, apply: (state: PlayerState) => PlayerState) =>
    setStates((previous) => ({
      ...previous,
      [id]: apply(previous[id] || initialPlayer),
    }))
  const onAction = (id: string, action: PlayerAction) => {
    const player = players.find((player) => player.user.id === id)
    if (!player) return
    setActiveId(id)
    if (action === 'play' || (action === 'select' && player.state.detail)) {
      if (player.selected)
        window.open(
          spotifyUrl(player.selected),
          '_blank',
          'noopener,noreferrer'
        )
      return
    }
    if (action === 'previous' || action === 'next') {
      const index = player.tracks.findIndex(
        (track) => track.id === player.selected?.id
      )
      const selected =
        action === 'next' && player.state.shuffle && player.tracks.length > 1
          ? player.tracks.filter((track) => track.id !== player.selected?.id)[
              Math.floor(Math.random() * (player.tracks.length - 1))
            ]
          : player.tracks[
              (index + (action === 'next' ? 1 : -1) + player.tracks.length) %
                player.tracks.length
            ]
      update(id, (state) => ({ ...state, selectedId: selected.id }))
      tick()
    } else if (action === 'shuffle') {
      update(id, (state) => ({ ...state, shuffle: !state.shuffle }))
      setNotice(
        `Shuffle ${player.state.shuffle ? 'off' : 'on'} for ${player.user.username}.`
      )
      tick()
    } else if (action === 'menu')
      update(id, (state) => ({ ...state, detail: false, flipped: false }))
    else if (action === 'select')
      update(id, (state) => ({ ...state, detail: true }))
    else if (action === 'flip')
      update(id, (state) => ({
        ...state,
        flipped: !state.flipped,
        reset: state.reset + 1,
      }))
    else if (action === 'reset')
      update(id, (state) => ({
        ...state,
        flipped: false,
        reset: state.reset + 1,
      }))
  }
  const onTrack = (id: string, trackId: string) => {
    const player = players.find((player) => player.user.id === id)
    if (!player) return
    setActiveId(id)
    update(id, (state) => ({
      ...state,
      selectedId: trackId,
      detail: player.selected?.id === trackId ? true : false,
    }))
    tick()
  }
  const onFocus = (id: string) => {
    setShufflePanelOpen(true)
    setActiveId(id)
  }
  const copy = async (id?: string) => {
    const groups = id
      ? players.filter((player) => player.user.id === id)
      : players
    const text = groups
      .map(({ user, tracks }) =>
        [
          `🎧 ${user.id === userId ? 'My' : `${user.username}’s`} Top Tracks`,
          ...tracks.map(
            (track) => `${track.rank}. ${track.name} — ${track.artist}`
          ),
        ].join('\n')
      )
      .join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Top tracks copied. Ready for the group chat.')
    } catch {
      setNotice(
        'Couldn’t copy tracks. Please allow clipboard access and try again.'
      )
    }
  }
  const invite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setNotice('Invite link copied. Send it to someone with good taste.')
    } catch {
      setNotice('Share this page’s address to invite a friend.')
    }
  }
  const onPan = useCallback((dx: number, dy: number) => {
    setViewport((current) => ({
      ...current,
      x: Math.max(
        -window.innerWidth * 3,
        Math.min(window.innerWidth * 3, current.x + dx)
      ),
      y: Math.max(
        -window.innerHeight * 3,
        Math.min(window.innerHeight * 3, current.y + dy)
      ),
    }))
  }, [])
  const onZoom = useCallback((factor: number, anchor = { x: 0, y: 0 }) => {
    setViewport((current) => {
      const scale = Math.max(0.65, Math.min(3.5, current.scale * factor))
      const ratio = scale / current.scale
      return {
        scale,
        x: anchor.x - (anchor.x - current.x) * ratio,
        y: anchor.y - (anchor.y - current.y) * ratio,
      }
    })
  }, [])
  const fitAll = useCallback(() => setViewport({ scale: 1, x: 0, y: 0 }), [])
  const resetView = () => {
    fitAll()
    if (mobile && active) onAction(active.user.id, 'reset')
  }
  const inspect = (id: string) => {
    setShufflePanelOpen(true)
    setActiveId(id)
    if (mobile) {
      setViewport({ scale: 1, x: 0, y: 0 })
      return
    }
    const gallery = galleryRef.current
    const index = players.findIndex((player) => player.user.id === id)
    if (!gallery || index < 0) return
    const base = collectionZoom(
      gallery.clientWidth,
      gallery.clientHeight -
        parseFloat(getComputedStyle(gallery).paddingBottom),
      columns,
      players.length
    )
    const chosenModel = ipodDefinition(players[index].device.model)
    const scale = Math.max(
      1,
      Math.min(
        3.5,
        Math.min(
          gallery.clientWidth / (chosenModel.width + 1),
          (gallery.clientHeight -
            parseFloat(getComputedStyle(gallery).paddingBottom)) /
            (chosenModel.height + 1.3),
          chosenModel.id === 'shuffle2' ? 180 : 130
        ) / base
      )
    )
    const position = playerPosition(index, players.length, columns)
    setViewport({
      scale,
      x: -position.x * base * scale,
      y: position.y * base * scale,
    })
  }
  const controls: PlayerControls = {
    onAction,
    onTrack,
    onFocus,
    onInspect: inspect,
    onCopy: (id) => {
      void copy(id)
    },
  }
  const navigate = (direction: number) => {
    const index = players.findIndex(
      (player) => player.user.id === active?.user.id
    )
    const next = players[(index + direction + players.length) % players.length]
    if (next) inspect(next.user.id)
  }
  const lose3D = useCallback(() => {
    setCapable(false)
    setNotice('3D is unavailable. Your music is still here.')
  }, [])
  const chooseFilter = (next: 'all' | 'shared' | 'you') => {
    setFilter(next)
    setViewport({ scale: 1, x: 0, y: 0 })
  }
  const clearFilters = () => {
    setSearch('')
    setSelectedFriends([])
    chooseFilter('all')
  }
  const closePicker = () => {
    setPickerOpen(false)
    requestAnimationFrame(() => {
      const trigger = mobile
        ? menuRef.current?.querySelector('summary')
        : document.querySelector<HTMLButtonElement>('.choose-ipod-button')
      trigger?.focus({ preventScroll: true })
    })
  }

  return (
    <div
      className={`app collection-app ${mobile ? 'mobile-collection' : ''} ${!mobile && viewport.scale < 1.35 && players.length > 3 ? 'is-overview' : ''}`}
      onKeyDown={(event) => {
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          helpOpen ||
          pickerOpen ||
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement
        )
          return
        if (['+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault()
          if (event.key === '0') fitAll()
          else onZoom(event.key === '-' ? 1 / 1.25 : 1.25)
        }
      }}
    >
      <Starfield />
      <a href="#collection-main" className="skip-link">
        Skip to your collection
      </a>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Friendify home">
          <span className="logo-box" aria-hidden="true" />
          friendify
        </a>
        <div className="header-right">
          {!mobile && (
            <button
              className="choose-ipod-button"
              aria-label="Choose your iPod"
              disabled={!ownPlayer || profileLoading}
              onClick={() => setPickerOpen(true)}
            >
              <span className="mini-ipod-glyph" aria-hidden="true" />
              <span className="choose-long-label">Choose your iPod</span>
              <span className="choose-short-label">Your iPod</span>
            </button>
          )}
          <button
            className={`browse-toggle ${filterSummary ? 'has-filters' : ''}`}
            aria-label={
              browseOpen ? 'Close search and filters' : 'Search and filter iPods'
            }
            aria-expanded={browseOpen}
            aria-controls="collection-browse"
            onClick={() => {
              menuRef.current?.removeAttribute('open')
              setBrowseOpen((open) => !open)
            }}
          >
            {browseOpen ? <HardwareIcon name="close" /> : <SearchIcon />}
          </button>
          <details
            ref={menuRef}
            className="mobile-menu"
            onToggle={(event) => {
              if (event.currentTarget.open) setBrowseOpen(false)
            }}
          >
            <summary aria-label="More options">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="19" cy="12" r="1.7" />
              </svg>
            </summary>
            <div
              className="mobile-menu-panel"
              onClick={(event) => {
                if (!(event.target as Element).closest('[data-stay-open]')) {
                  menuRef.current?.removeAttribute('open')
                  menuRef.current
                    ?.querySelector('summary')
                    ?.focus({ preventScroll: true })
                }
              }}
            >
              {mobile && (
                <button
                  onClick={() => setPickerOpen(true)}
                  disabled={!ownPlayer || profileLoading}
                >
                  Choose your iPod
                  <span className="mini-ipod-glyph" aria-hidden="true" />
                </button>
              )}
              <button onClick={() => void invite()}>
                Invite a friend <span aria-hidden="true">↗</span>
              </button>
              <button
                onClick={() => void copy(mobile ? active?.user.id : undefined)}
                disabled={!players.length}
              >
                {mobile ? 'Copy this top five' : 'Copy tracks'}
                <HardwareIcon name="copy" />
              </button>
              {capable && active && !pending && !error && (
                <>
                  <div
                    className="menu-view-controls"
                    role="group"
                    aria-label="View controls"
                  >
                    <button
                      aria-label="Zoom out"
                      data-stay-open
                      disabled={viewport.scale <= 0.65}
                      onClick={() => onZoom(1 / 1.25)}
                    >
                      −
                    </button>
                    <button
                      aria-label="Zoom in"
                      data-stay-open
                      disabled={viewport.scale >= 3.5}
                      onClick={() => onZoom(1.25)}
                    >
                      +
                    </button>
                    <button onClick={resetView}>
                      {mobile ? 'Reset iPod' : 'Fit all'}
                    </button>
                  </div>
                  <button onClick={() => onAction(active.user.id, 'flip')}>
                    {active.state.flipped ? 'Face front' : 'Turn over'}
                    <HardwareIcon name="flip" />
                  </button>
                </>
              )}
              <button onClick={() => setHelpOpen(true)}>
                Controls <span aria-hidden="true">?</span>
              </button>
              <button onClick={onLogout} disabled={signingOut}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </details>
        </div>
      </header>
      <div
        className="collection-toolbar"
        id="collection-browse"
        hidden={!browseOpen}
        role="search"
        aria-label="Search and filters"
      >
        <div className="controls">
          <div className="segments" role="group" aria-label="Collection filter">
            {(
              [
                ['all', 'Everyone'],
                ['shared', 'Shared songs'],
                ['you', 'Just me'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => chooseFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="search">
            <SearchIcon />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setViewport({ scale: 1, x: 0, y: 0 })
              }}
              placeholder="Find a friend or song"
              aria-label="Find a friend or song"
            />
          </div>
          <div className="utility-controls">
            <details ref={filterRef} className="friend-filter">
              <summary>
                Friends
                {selectedFriends.length ? ` (${selectedFriends.length})` : ''}
                <span aria-hidden="true">⌄</span>
              </summary>
              <fieldset>
                <legend className="sr-only">Choose friends to show</legend>
                <label>
                  <input
                    type="checkbox"
                    checked={!selectedFriends.length}
                    onChange={() => {
                      setSelectedFriends([])
                      setViewport({ scale: 1, x: 0, y: 0 })
                    }}
                  />
                  Everyone
                </label>
                {users.map(({ user }) => (
                  <label key={user.id}>
                    <input
                      type="checkbox"
                      checked={selectedFriends.includes(user.id)}
                      onChange={() => {
                        setSelectedFriends((previous) =>
                          previous.includes(user.id)
                            ? previous.filter((id) => id !== user.id)
                            : [...previous, user.id]
                        )
                        setViewport({ scale: 1, x: 0, y: 0 })
                      }}
                    />
                    {user.username}
                    {user.id === userId ? ' (you)' : ''}
                  </label>
                ))}
              </fieldset>
            </details>
          </div>
        </div>
      </div>
      {filterSummary && !browseOpen && (
        <div className="active-collection-filter">
          <button onClick={() => setBrowseOpen(true)}>{filterSummary}</button>
          <button
            aria-label="Clear filters"
            onClick={() => {
              clearFilters()
              document.querySelector<HTMLButtonElement>('.browse-toggle')?.focus()
            }}
          >
            <HardwareIcon name="close" />
          </button>
        </div>
      )}
      <main
        ref={galleryRef}
        className="main collection-main"
        id="collection-main"
      >
        <h1 className="sr-only">Friends’ top five songs</h1>
        {mobile && active && !pending && !error && (
          <MobileFriendNav
            players={players}
            active={active}
            userId={userId}
            onSelect={inspect}
            onNavigate={navigate}
          />
        )}
        {pending ? (
          <div className="collection-state" role="status">
            <span className="mini-player-loader" aria-hidden="true" />
            <h2>Syncing your collection.</h2>
            <p>Finding your friends’ favorite songs…</p>
          </div>
        ) : error ? (
          <div className="collection-state" role="alert">
            <span className="logo-box" aria-hidden="true" />
            <h2>Sync interrupted.</h2>
            <p>
              We couldn’t load the songs. Check your connection and try again.
            </p>
            <button
              className="aqua-button"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Trying again…' : 'Try again'}
            </button>
          </div>
        ) : !players.length ? (
          <div className="collection-state">
            <span className="logo-box" aria-hidden="true" />
            <h2>
              {search
                ? 'No songs on that frequency.'
                : filter === 'shared'
                  ? 'Your next shared favorite is out there.'
                  : filter === 'you'
                    ? 'Your first five are on their way.'
                    : 'Your collection starts here.'}
            </h2>
            <p>
              {search
                ? 'Try another friend, artist, or song.'
                : filter === 'shared'
                  ? 'Explore everyone’s iPods to discover something new.'
                  : 'Listen to a little more music on Spotify and come back for your top five.'}
            </p>
            {(search || filter !== 'all' || selectedFriends.length > 0) && (
              <button
                className="aqua-button"
                onClick={() => {
                  setSearch('')
                  chooseFilter('all')
                  setSelectedFriends([])
                }}
              >
                Show everyone
              </button>
            )}
          </div>
        ) : capable ? (
          <div
            className="scene-shell"
            data-renderer={ready ? 'webgl' : 'loading'}
            tabIndex={0}
            role="group"
            aria-label={
              mobile
                ? `Interactive ${active?.user.username || 'friend'}’s iPod. Drag to turn, pinch to zoom, or browse the song list below. Use left and right arrows to switch friends.`
                : '3D iPod collection. Select a device, use up and down arrows to browse, Enter to select, Escape for MENU, I to turn over, and R to reset.'
            }
            onKeyDown={(event) => {
              if (
                (event.target instanceof HTMLButtonElement &&
                  ![
                    'ArrowUp',
                    'ArrowDown',
                    'ArrowLeft',
                    'ArrowRight',
                    'Escape',
                    'i',
                    'I',
                    'r',
                    'R',
                  ].includes(event.key)) ||
                event.target instanceof HTMLInputElement
              )
                return
              if (!active) return
              if (
                [
                  'ArrowUp',
                  'ArrowDown',
                  'ArrowLeft',
                  'ArrowRight',
                  'Enter',
                  'Escape',
                  'i',
                  'I',
                  'r',
                  'R',
                ].includes(event.key)
              ) {
                event.preventDefault()
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                  navigate(event.key === 'ArrowRight' ? 1 : -1)
                  return
                }
                onAction(
                  active.user.id,
                  event.key === 'ArrowUp'
                    ? 'previous'
                    : event.key === 'ArrowDown'
                      ? 'next'
                      : event.key === 'Enter'
                        ? 'select'
                        : event.key === 'Escape'
                          ? 'menu'
                          : event.key.toLowerCase() === 'i'
                            ? 'flip'
                            : event.key.toLowerCase() === 'r'
                              ? 'reset'
                              : 'menu'
                )
              }
            }}
          >
            <SceneBoundary onError={lose3D}>
              <Suspense
                fallback={
                  <div className="scene-status" role="status">
                    <span className="mini-player-loader" />
                    Preparing your iPods…
                  </div>
                }
              >
                <IpodScene
                  players={scenePlayers}
                  userId={userId}
                  activeId={activeId}
                  columns={mobile ? 1 : columns}
                  focused={mobile}
                  reduced={reduced || pickerOpen || helpOpen || !sceneVisible}
                  shared={filter === 'shared'}
                  controls={controls}
                  view={viewport}
                  onPan={onPan}
                  onZoom={onZoom}
                  onFit={fitAll}
                  onReady={() => setReady(true)}
                  onLost={lose3D}
                />
              </Suspense>
            </SceneBoundary>
            {!mobile && (
              <div className="sr-only" aria-label="Songs in this collection">
                {players.map((player) => (
                  <section key={player.user.id}>
                    <h2>{player.user.username}’s top five</h2>
                    <ol>
                      {player.tracks.map((track) => (
                        <li key={track.id}>
                          {track.rank}. {track.name} by {track.artist}
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            )}
            <div className="keyboard-controls">
              <span>Click wheel</span>
              {active && (
                <>
                  <button
                    onClick={() => onAction(active.user.id, 'previous')}
                    aria-label="Previous song"
                  >
                    <HardwareIcon name="previous" />
                  </button>
                  <button onClick={() => onAction(active.user.id, 'select')}>
                    Select
                  </button>
                  <button onClick={() => onAction(active.user.id, 'menu')}>
                    MENU
                  </button>
                  <button
                    onClick={() => onAction(active.user.id, 'next')}
                    aria-label="Next song"
                  >
                    <HardwareIcon name="next" />
                  </button>
                  <a
                    href={active.selected ? spotifyUrl(active.selected) : '#'}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Spotify ↗
                  </a>
                </>
              )}
            </div>
          </div>
        ) : (
          <MusicFallback players={scenePlayers} controls={controls} />
        )}
        {capable &&
          !mobile &&
          active?.device.model === 'shuffle2' &&
          shufflePanelOpen &&
          !pending &&
          !error && (
            <aside
              className="shuffle-companion"
              aria-label={`${active.user.username}’s Shuffle top five`}
            >
              <div className="shuffle-panel-heading">
                <div>
                  <span>SCREENLESS, STILL YOUR TOP FIVE</span>
                  <h2>{active.user.username}’s shuffle</h2>
                </div>
                <button
                  aria-label="Close Shuffle top five"
                  onClick={() => setShufflePanelOpen(false)}
                >
                  <HardwareIcon name="close" />
                </button>
              </div>
              <ol>
                {active.tracks.map((track) => (
                  <li key={track.id}>
                    <button
                      aria-pressed={active.selected?.id === track.id}
                      onClick={() => onTrack(active.user.id, track.id)}
                    >
                      <span>{track.rank}</span>
                      <div>
                        <strong>{track.name}</strong>
                        <small>{track.artist}</small>
                      </div>
                      <span aria-hidden="true">
                        {active.selected?.id === track.id ? '▶' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {active.selected && (
                <a
                  href={spotifyUrl(active.selected)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <AlbumArtwork
                    url={active.selected.image_url}
                    album={active.selected.album}
                    artist={active.selected.artist}
                  />
                  <span>Open {active.selected.name} in Spotify ↗</span>
                </a>
              )}
            </aside>
          )}
        {mobile && capable && active && !pending && !error && (
          <MobileTopFive
            player={active}
            controls={controls}
          />
        )}
      </main>
      <div className="sr-only" role="status" aria-live="polite">
        {active?.selected
          ? `${active.user.username}: number ${active.selected.rank}, ${active.selected.name} by ${active.selected.artist}. ${active.state.detail ? 'Track details open.' : ''}`
          : ''}
      </div>
      <div
        className={`toast ${notice || externalError ? 'visible' : ''}`}
        role={externalError ? 'alert' : 'status'}
        aria-live="polite"
      >
        {(notice || externalError) && (
          <>
            <span>{externalError || notice}</span>
            <button
              className="dismiss-notice"
              onClick={() => {
                setNotice('')
                onDismissError?.()
              }}
              aria-label="Dismiss notification"
            >
              <HardwareIcon name="close" />
            </button>
          </>
        )}
      </div>
      {pickerOpen && ownPlayer && (
        <IpodPicker
          player={ownPlayer}
          capable={capable}
          reduced={reduced}
          loading={preferences.isLoading}
          loadError={preferences.isError}
          onRetry={() => {
            void preferences.refetch()
          }}
          onSave={saveDevice}
          onClose={closePicker}
        />
      )}
      <dialog
        ref={helpRef}
        className="collection-dialog"
        onCancel={() => setHelpOpen(false)}
        aria-labelledby="help-title"
      >
        <button
          className="dialog-close"
          aria-label="Close controls"
          onClick={() => setHelpOpen(false)}
        >
          <HardwareIcon name="close" />
        </button>
        <span className="logo-box" aria-hidden="true" />
        <h2 id="help-title">Meet your click wheel.</h2>
        <dl>
          <div>
            <dt>Explore</dt>
            <dd>
              {mobile ? (
                'Use the name selector or arrows to switch iPods. Pinch the device area to zoom. More options contains zoom buttons and Reset iPod.'
              ) : (
                <>Scroll or pinch your trackpad to zoom. Drag empty space to pan,
                or click a friend’s name to move closer. Fit all in More options brings everyone
                back into view.</>
              )}
            </dd>
          </div>
          <div>
            <dt>Browse</dt>
            <dd>
              Scroll over a wheel or drag your finger around its ring. The left
              and right buttons also move between songs.
            </dd>
          </div>
          <div>
            <dt>Select</dt>
            <dd>
              Press the center for track details. Press it again, or use play,
              to open the song in Spotify. MENU returns to the top five.
            </dd>
          </div>
          <div>
            <dt>Inspect</dt>
            <dd>
              Drag the body to turn an iPod in your hand, or use Turn over to
              see its engraved back. More options also has a Turn over button.
              On phones, tap a song in the list to open it in Spotify.
            </dd>
          </div>
          <div>
            <dt>Keyboard</dt>
            <dd>
              Focus the collection. ↑ ↓ browse songs, Enter selects, Esc
              returns, I turns the device over, and R resets its position. ← →
              jump between friends. + and − zoom, and 0 fits the whole
              collection. When 3D is unavailable, the song list provides direct
              Spotify links.
            </dd>
          </div>
        </dl>
        <label className="sound-setting">
          <input
            type="checkbox"
            checked={sounds}
            onChange={() => setSounds(!sounds)}
          />
          Click-wheel sound
        </label>
        <button className="aqua-button" onClick={() => setHelpOpen(false)}>
          Back to the collection
        </button>
      </dialog>
    </div>
  )
}
