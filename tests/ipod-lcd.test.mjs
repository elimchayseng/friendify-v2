import { test } from 'node:test'
import assert from 'node:assert/strict'
import { IPODS } from '../src/lib/ipods.ts'
import { createLCD, drawLCD, drawColorLCD } from '../src/components/ipod/textures.ts'

test('LCD textures have their final dimensions before the first render and never resize', t => {
  // Simulate the immutable allocation made by WebGL before React drawing effects run.
  const context = new Proxy({}, {
    get: (_, name) => {
      if (name === 'measureText') return text => ({ width: text.length * 16 })
      if (name === 'createLinearGradient') return () => ({ addColorStop() {} })
      return () => {}
    },
    set: () => true,
  })
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  t.after(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
    else delete globalThis.document
  })
  globalThis.document = {
    createElement: () => ({ getContext: () => context }),
  }

  const track = { id: 'song', rank: 1, name: 'Test song', artist: 'Artist', album: 'Album' }
  for (const model of IPODS.filter(model => model.screen)) {
    const target = createLCD(model.screen)
    const dimensions = model.screen.color
      ? [640, model.screen.portrait ? 1002 : 480]
      : [1024, 840]
    assert.deepEqual([target.canvas.width, target.canvas.height], dimensions, model.id)
    Object.defineProperties(target.canvas, {
      width: { writable: false },
      height: { writable: false },
    })

    const player = {
      device: { model: model.id, finish: model.defaultFinish },
      user: { id: 'user', username: 'Listener' },
      tracks: [track], selected: track, state: { detail: false },
    }
    const initialVersion = target.texture.version
    for (const detail of [false, true, false]) {
      player.state.detail = detail
      if (model.screen.color) {
        drawColorLCD(target, player, Boolean(model.screen.portrait), null)
        drawColorLCD(target, player, Boolean(model.screen.portrait), {
          naturalWidth: 300, naturalHeight: 300,
        })
      } else drawLCD(target, player, false)
    }
    assert.ok(target.texture.version > initialVersion, `${model.id} uploads redraws`)
    target.texture.dispose()
  }
})
