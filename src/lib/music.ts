import type { IpodSelection } from './ipods'
export interface Track {
  id: string
  name: string
  artist: string
  album: string
  spotify_id: string
  rank: number
  image_url?: string | null
}
export interface UserTracks {
  user: { id: string; username: string }
  tracks: Track[]
}
export interface PlayerState {
  selectedId: string | null
  detail: boolean
  flipped: boolean
  reset: number
  shuffle?: boolean
}
export interface Player {
  device: IpodSelection
  user: UserTracks['user']
  tracks: Track[]
  finish: number
  state: PlayerState
  selected: Track | null
}
export type PlayerAction =
  | 'previous'
  | 'next'
  | 'select'
  | 'menu'
  | 'play'
  | 'flip'
  | 'reset'
  | 'shuffle'
export function trackKey(track: Track) {
  return (
    track.spotify_id ||
    `${track.name.toLowerCase()}:${track.artist.toLowerCase()}`
  )
}
export function sharedKeys(users: UserTracks[]) {
  const counts = new Map<string, Set<string>>()
  users.forEach(({ user, tracks }) =>
    tracks.forEach((track) => {
      const key = trackKey(track)
      if (!counts.has(key)) counts.set(key, new Set())
      counts.get(key)!.add(user.id)
    })
  )
  return new Set(
    [...counts].filter(([, users]) => users.size > 1).map(([key]) => key)
  )
}
export function spotifyUrl(track: Track) {
  return track.spotify_id
    ? `https://open.spotify.com/track/${track.spotify_id}`
    : `https://open.spotify.com/search/${encodeURIComponent(`${track.name} ${track.artist}`)}`
}
