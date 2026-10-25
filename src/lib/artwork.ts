import type { Track } from './music'

const images = new Map<string, Promise<HTMLImageElement | null>>()
export function loadArtwork(url: string): Promise<HTMLImageElement | null> {
  if (!images.has(url))
    images.set(
      url,
      new Promise((resolve) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.onload = () => resolve(image)
        image.onerror = () => resolve(null)
        image.src = url
      })
    )
  return images.get(url)!
}
export function drawArtwork(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  track: Track | null,
  x: number,
  y: number,
  size: number
) {
  if (image) {
    const crop = Math.min(image.naturalWidth, image.naturalHeight)
    ctx.drawImage(
      image,
      (image.naturalWidth - crop) / 2,
      (image.naturalHeight - crop) / 2,
      crop,
      crop,
      x,
      y,
      size,
      size
    )
    return
  }
  ctx.fillStyle = '#dce1e7'
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = '#8b97a7'
  ctx.font = `${size * 0.4}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('♫', x + size / 2, y + size * 0.42)
  ctx.font = `${Math.max(8, size * 0.075)}px Arial`
  ctx.fillText(
    track ? 'Artwork unavailable' : 'No track selected',
    x + size / 2,
    y + size * 0.8
  )
  ctx.textAlign = 'left'
}
