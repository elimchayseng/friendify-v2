import type { ViewControls } from './layout'

// Native touch gestures work for both the WebGL canvas and the HTML fallback.
export function bindPinchZoom(
  element: HTMLElement,
  controls: Pick<ViewControls, 'onZoom' | 'onPan'>
) {
  const pointers = new Set<number>()
  let pinching = false
  let previous: { distance: number; x: number; y: number } | null = null
  const down = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return
    pointers.add(event.pointerId)
    if (pointers.size > 1) {
      pinching = true
      event.stopImmediatePropagation()
    }
  }
  const move = (event: PointerEvent) => {
    if (pinching && event.pointerType === 'touch')
      event.stopImmediatePropagation()
  }
  const up = (event: PointerEvent) => {
    pointers.delete(event.pointerId)
    if (!pointers.size) {
      pinching = false
      previous = null
    }
  }
  const touch = (event: TouchEvent) => {
    if (event.touches.length !== 2) return
    event.preventDefault()
    const [a, b] = Array.from(event.touches)
    const bounds = element.getBoundingClientRect()
    const next = {
      distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      x: (a.clientX + b.clientX) / 2 - bounds.left - bounds.width / 2,
      y: (a.clientY + b.clientY) / 2 - bounds.top - bounds.height / 2,
    }
    if (previous && previous.distance > 0) {
      controls.onPan(next.x - previous.x, next.y - previous.y)
      controls.onZoom(next.distance / previous.distance, next)
    }
    previous = next
  }
  element.addEventListener('pointerdown', down, true)
  element.addEventListener('pointermove', move, true)
  element.addEventListener('pointerup', up, true)
  element.addEventListener('pointercancel', up, true)
  element.addEventListener('touchstart', touch, { passive: false })
  element.addEventListener('touchmove', touch, { passive: false })
  return () => {
    element.removeEventListener('pointerdown', down, true)
    element.removeEventListener('pointermove', move, true)
    element.removeEventListener('pointerup', up, true)
    element.removeEventListener('pointercancel', up, true)
    element.removeEventListener('touchstart', touch)
    element.removeEventListener('touchmove', touch)
  }
}
