// Both renderers use the same world-to-pixel scale and device centers.
export const PLAYER_SPACING = 3.57
export const ROW_SPACING = 5.9

export interface CollectionView {
  scale: number
  x: number
  y: number
}

export interface ViewControls {
  view: CollectionView
  onPan: (dx: number, dy: number) => void
  onZoom: (factor: number, anchor?: { x: number; y: number }) => void
  onFit: () => void
}

export function playerPosition(index: number, count: number, columns: number) {
  const row = Math.floor(index / columns)
  const rowCount = Math.min(columns, count - row * columns)
  return {
    x: ((index % columns) - (rowCount - 1) / 2) * PLAYER_SPACING,
    y: ((Math.ceil(count / columns) - 1) / 2 - row) * ROW_SPACING,
  }
}

export function playerDrift(index: number, time: number) {
  const phase = index * 1.73
  return {
    x: Math.cos(time * 0.45 + phase) * 0.045,
    y: Math.sin(time * 0.7 + phase) * 0.11,
  }
}

export function collectionZoom(
  width: number,
  height: number,
  columns: number,
  count: number
) {
  const rows = Math.max(1, Math.ceil(count / columns))
  return Math.min(
    width / (columns * PLAYER_SPACING + 0.65),
    height / (rows * ROW_SPACING + 0.6),
    102
  )
}
