import { drawArtwork } from '../../lib/artwork'
import * as THREE from 'three'
import type { Player } from '../../lib/music'
import type { IpodScreen } from '../../lib/ipods'

function textureCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return { canvas, context, texture }
}
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let end = text.length
  while (end > 0 && ctx.measureText(`${text.slice(0, end)}…`).width > max) end--
  return `${text.slice(0, end)}…`
}
export function createLCD(screen: IpodScreen | null) {
  // WebGL texture storage cannot be resized after its first upload.
  return screen?.color
    ? textureCanvas(640, screen.portrait ? 1002 : 480)
    : textureCanvas(1024, 840)
}
export function drawLCD(
  target: ReturnType<typeof createLCD>,
  player: Player,
  shared: boolean
) {
  const { context: ctx, texture } = target
  const mini = player.device.model === 'mini2'
  ctx.setTransform(2, 0, 0, 2, 0, 0)
  ctx.clearRect(0, 0, 512, 420)
  const gradient = ctx.createLinearGradient(0, 0, 512, 420)
  gradient.addColorStop(0, mini ? '#dce4ec' : '#d2dbbc')
  gradient.addColorStop(0.6, mini ? '#c4d0dc' : '#c7d1ad')
  gradient.addColorStop(1, mini ? '#afbfce' : '#bac8a0')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 420)
  ctx.fillStyle = '#28382a'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 28px "Courier New", monospace'
  ctx.fillText(fit(ctx, `${player.user.username}’s iPod`, 410), 18, 30)
  ctx.strokeStyle = '#42563a'
  ctx.lineWidth = 2
  ctx.strokeRect(453, 21, 36, 16)
  ctx.fillRect(456, 24, 27, 10)
  ctx.fillRect(491, 26, 4, 6)
  ctx.fillStyle = '#657b4e'
  ctx.fillRect(0, 58, 512, 2)
  if (player.state.detail && player.selected) {
    const track = player.selected
    ctx.fillStyle = '#536744'
    ctx.font = '20px "Courier New", monospace'
    ctx.fillText('Selected track', 20, 88)
    ctx.textAlign = 'right'
    ctx.fillText(`${track.rank} of 5`, 491, 88)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#28382a'
    ctx.font = 'bold 36px "Courier New", monospace'
    const words = track.name.split(' ')
    let line = '',
      y = 156
    for (const word of words) {
      if (ctx.measureText(`${line} ${word}`).width > 470 && line) {
        ctx.fillText(fit(ctx, line, 470), 20, y)
        line = word
        y += 41
        if (y > 215) break
      } else line += `${line ? ' ' : ''}${word}`
    }
    if (y <= 215) ctx.fillText(fit(ctx, line, 470), 20, y)
    ctx.font = 'bold 25px "Courier New", monospace'
    ctx.fillText(fit(ctx, track.artist, 470), 20, 267)
    ctx.font = '20px "Courier New", monospace'
    ctx.fillText(fit(ctx, track.album, 470), 20, 303)
    ctx.fillStyle = '#6b7f53'
    ctx.fillRect(20, 345, 472, 1)
    ctx.fillStyle = '#354b2c'
    ctx.font = '20px "Courier New", monospace'
    ctx.fillText('▶ Open in Spotify', 20, 375)
    ctx.textAlign = 'right'
    ctx.fillText('MENU ↩', 491, 375)
    ctx.textAlign = 'left'
  } else {
    player.tracks.slice(0, 5).forEach((track, index) => {
      const y = 75 + index * 54,
        selected = player.selected?.id === track.id
      if (selected) {
        ctx.fillStyle = '#354e71'
        ctx.fillRect(7, y - 2, 498, 51)
      }
      ctx.fillStyle = selected ? '#e0eaca' : '#28382a'
      ctx.font = '21px "Courier New", monospace'
      ctx.fillText(String(track.rank), 17, y + 23)
      ctx.font = 'bold 27px "Courier New", monospace'
      ctx.fillText(fit(ctx, track.name, 420), 47, y + 23)
      if (selected) {
        ctx.font = 'bold 34px Arial'
        ctx.fillText('›', 482, y + 21)
      }
      if (shared) {
        ctx.fillStyle = selected ? '#e0eaca' : '#28382a'
        ctx.fillRect(470, y + 18, 4, 4)
      }
    })
    ctx.fillStyle = '#42513b'
    ctx.font = '19px "Courier New", monospace'
    ctx.fillText(
      fit(ctx, player.selected?.artist || 'No matching songs', 470),
      18,
      391
    )
  }
  ctx.fillStyle = '#253b1710'
  for (let y = 0; y < 420; y += 3) ctx.fillRect(0, y, 512, 1)
  texture.needsUpdate = true
}
export function createWheelTexture(
  color = '#e7e8df',
  dark = false,
  shuffle = false
) {
  const target = textureCanvas(512, 512),
    ctx = target.context
  const gradient = ctx.createLinearGradient(0, 0, 512, 512)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, color)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)
  ctx.fillStyle = dark ? '#c7cbd0' : '#747d77'
  ctx.font = 'bold 23px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(shuffle ? '+' : 'MENU', 256, 65)
  const triangle = (x: number, y: number, direction: number) => {
    ctx.beginPath()
    ctx.moveTo(x + direction * 16, y - 15)
    ctx.lineTo(x - direction * 9, y)
    ctx.lineTo(x + direction * 16, y + 15)
    ctx.fill()
  }
  triangle(69, 256, 1)
  triangle(90, 256, 1)
  ctx.fillRect(46, 241, 4, 30)
  triangle(443, 256, -1)
  triangle(422, 256, -1)
  ctx.fillRect(462, 241, 4, 30)
  if (shuffle) {
    ctx.font = 'bold 45px Arial'
    ctx.fillText('−', 256, 447)
  } else {
    triangle(246, 447, -1)
    ctx.fillRect(270, 432, 5, 30)
    ctx.fillRect(282, 432, 5, 30)
  }
  return target.texture
}
export function createBackTexture(name: string) {
  const target = textureCanvas(1024, 768),
    ctx = target.context
  ctx.clearRect(0, 0, 1024, 768)
  ctx.fillStyle = '#606568'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '500 110px Arial'
  ctx.fillText('♫', 512, 185)
  ctx.font = '600 76px Arial'
  ctx.fillText('friendify', 512, 306)
  ctx.font = '49px "Courier New", monospace'
  ctx.fillText(fit(ctx, `${name}’s iPod`, 920), 512, 451)
  ctx.font = '20px "Courier New", monospace'
  ctx.fillText('A PERSONAL COLLECTION', 512, 523)
  ctx.font = '18px "Courier New", monospace'
  ctx.fillText('5 SONGS · LAST 4 WEEKS', 512, 663)
  return target.texture
}
export function roundedGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevel = 0.025
) {
  const x = -width / 2,
    y = -height / 2,
    r = radius,
    s = new THREE.Shape()
  s.moveTo(x + r, y)
  s.lineTo(x + width - r, y)
  s.quadraticCurveTo(x + width, y, x + width, y + r)
  s.lineTo(x + width, y + height - r)
  s.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  s.lineTo(x + r, y + height)
  s.quadraticCurveTo(x, y + height, x, y + height - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  const geometry = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSegments: 5,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 18,
  })
  geometry.center()
  const positions = geometry.getAttribute('position'),
    uv = geometry.getAttribute('uv')
  for (let i = 0; i < positions.count; i++)
    uv.setXY(
      i,
      positions.getX(i) / width + 0.5,
      positions.getY(i) / height + 0.5
    )
  geometry.computeVertexNormals()
  return geometry
}
export function createMetalNormalTexture() {
  const target = textureCanvas(256, 512),
    ctx = target.context,
    image = ctx.createImageData(256, 512)
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 256; x++) {
      const grain = Math.sin(y * 17.13 + x * 0.07) * 0.002
      const nx = (x / 255 - 0.5) * 0.35 + grain,
        ny = (y / 511 - 0.5) * 0.13,
        nz = Math.sqrt(1 - nx * nx - ny * ny),
        i = (y * 256 + x) * 4
      image.data[i] = Math.round((nx * 0.5 + 0.5) * 255)
      image.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      image.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255)
      image.data[i + 3] = 255
    }
  ctx.putImageData(image, 0, 0)
  target.texture.colorSpace = THREE.NoColorSpace
  return target.texture
}

export function drawColorLCD(
  target: ReturnType<typeof createLCD>,
  player: Player,
  portrait: boolean,
  artwork: HTMLImageElement | null
) {
  const { context: ctx, texture } = target
  const width = 640,
    height = portrait ? 1002 : 480
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  const bar = ctx.createLinearGradient(0, 0, 0, 56)
  bar.addColorStop(0, '#fafafa')
  bar.addColorStop(1, '#b9c0c9')
  ctx.fillStyle = bar
  ctx.fillRect(0, 0, width, 56)
  ctx.fillStyle = '#202630'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 29px Arial'
  ctx.fillText(
    fit(
      ctx,
      player.state.detail ? 'Now Playing' : `${player.user.username}’s iPod`,
      505
    ),
    17,
    29
  )
  ctx.strokeStyle = '#38414a'
  ctx.lineWidth = 3
  ctx.strokeRect(567, 19, 45, 19)
  ctx.fillStyle = '#6daa55'
  ctx.fillRect(571, 23, 32, 11)
  ctx.fillStyle = '#38414a'
  ctx.fillRect(615, 24, 4, 9)
  const track = player.selected
  if (player.state.detail && track) {
    const size = portrait ? 500 : 284,
      x = portrait ? 70 : 24,
      y = portrait ? 98 : 91
    drawArtwork(ctx, artwork, track, x, y, size)
    const tx = portrait ? 34 : 334,
      ty = portrait ? 650 : 140,
      max = portrait ? 572 : 286
    ctx.fillStyle = '#171b21'
    ctx.font = 'bold 34px Arial'
    ctx.fillText(fit(ctx, track.name, max), tx, ty)
    ctx.font = '27px Arial'
    ctx.fillStyle = '#596473'
    ctx.fillText(fit(ctx, track.artist, max), tx, ty + 48)
    ctx.font = '23px Arial'
    ctx.fillText(fit(ctx, track.album, max), tx, ty + 89)
    ctx.fillStyle = '#c1c8d2'
    ctx.fillRect(25, height - 78, 590, 8)
    ctx.fillStyle = '#397bc6'
    ctx.fillRect(25, height - 78, 160, 8)
    ctx.fillStyle = '#505b6b'
    ctx.font = '22px Arial'
    ctx.fillText('▶ Open in Spotify', 25, height - 30)
  } else {
    const listWidth = portrait ? 640 : 355
    const rowHeight = portrait ? 89 : 67
    player.tracks.slice(0, 5).forEach((song, index) => {
      const y = 65 + index * rowHeight,
        selected = song.id === track?.id
      if (selected) {
        const gradient = ctx.createLinearGradient(0, y, 0, y + rowHeight)
        gradient.addColorStop(0, '#61acec')
        gradient.addColorStop(1, '#1b65b8')
        ctx.fillStyle = gradient
        ctx.fillRect(0, y, listWidth, rowHeight)
      }
      ctx.fillStyle = selected ? '#fff' : '#20262e'
      ctx.font = `${selected ? 'bold' : 'normal'} ${portrait ? 32 : 28}px Arial`
      ctx.fillText(
        fit(ctx, `${song.rank}  ${song.name}`, listWidth - 55),
        15,
        y + rowHeight / 2
      )
      if (selected) {
        ctx.font = '36px Arial'
        ctx.fillText('›', listWidth - 30, y + rowHeight / 2)
      }
    })
    if (portrait) {
      drawArtwork(ctx, artwork, track, 150, 568, 340)
      ctx.fillStyle = '#485361'
      ctx.font = '25px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(fit(ctx, track?.artist || '', 590), 320, 952)
      ctx.textAlign = 'left'
    } else {
      ctx.fillStyle = '#eef0f3'
      ctx.fillRect(355, 56, 285, height - 56)
      drawArtwork(ctx, artwork, track, 374, 100, 248)
      ctx.fillStyle = '#647080'
      ctx.font = '21px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(fit(ctx, track?.artist || '', 252), 497, 383)
      ctx.textAlign = 'left'
      ctx.fillStyle = '#6d7682'
      ctx.font = '20px Arial'
      ctx.fillText('5 songs', 17, 450)
    }
  }
  texture.needsUpdate = true
}
