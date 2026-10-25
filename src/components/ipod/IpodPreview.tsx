import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Player } from '../../lib/music'
import { ipodDefinition } from '../../lib/ipods'
import IpodModel, { createModelGeometry } from './IpodModel'
import StudioLighting from './StudioLighting'
import type { PlayerControls } from './PlayerUI'

function PreviewWorld({
  player,
  controls,
  reduced,
  onReady,
}: {
  player: Player
  controls: PlayerControls
  reduced: boolean
  onReady: () => void
}) {
  const { camera, size, invalidate, gl, raycaster, scene } = useThree()
  const model = ipodDefinition(player.device.model)
  const rendered = useRef('')
  useFrame(() => {
    if (rendered.current !== model.id) {
      rendered.current = model.id
      requestAnimationFrame(onReady)
    }
  })
  const geometry = useMemo(() => createModelGeometry(model), [model])
  useEffect(
    () => () => Object.values(geometry).forEach((g) => g.dispose()),
    [geometry]
  )
  useLayoutEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = Math.min(
        size.width / (model.width + 0.8),
        size.height / (model.height + 1),
        155
      )
      camera.updateProjectionMatrix()
      invalidate()
    }
  }, [camera, size, model, invalidate])
  useEffect(() => {
    const wheel = (event: WheelEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1
        ),
        camera
      )
      if (
        raycaster
          .intersectObjects(scene.children, true)
          .some((hit) => hit.object.userData.wheelId)
      ) {
        event.preventDefault()
        controls.onAction(
          player.user.id,
          event.deltaY > 0 ? 'next' : 'previous'
        )
      }
    }
    gl.domElement.addEventListener('wheel', wheel, { passive: false })
    return () => gl.domElement.removeEventListener('wheel', wheel)
  }, [gl, raycaster, scene, camera, controls, player.user.id])
  return (
    <>
      <StudioLighting />
      <IpodModel
        key={model.id}
        player={player}
        geometry={geometry}
        active={false}
        shared={false}
        reduced={reduced}
        onAction={controls.onAction}
        onTrack={controls.onTrack}
        onFocus={controls.onFocus}
      />
    </>
  )
}
export default function IpodPreview(props: {
  player: Player
  controls: PlayerControls
  reduced: boolean
  onLost: () => void
  onReady: () => void
}) {
  return (
    <Canvas
      orthographic
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 14], zoom: 90, near: 0.1, far: 100 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0, 0)
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault()
          props.onLost()
        })
      }}
    >
      <Suspense fallback={null}>
        <PreviewWorld {...props} />
      </Suspense>
    </Canvas>
  )
}
