import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import StudioLighting from './StudioLighting'
import * as THREE from 'three'
import type { Player } from '../../lib/music'
import type { PlayerControls } from './PlayerUI'
import { PlayerCaption, PlayerLabel } from './PlayerUI'
import IpodModel, { createModelGeometry } from './IpodModel'
import { IPODS, ipodDefinition, type IpodModelId } from '../../lib/ipods'
import {
  collectionZoom,
  playerPosition,
  playerDrift,
  type ViewControls,
} from './layout'
import { bindPinchZoom } from './gestures'

interface Props extends ViewControls {
  players: Player[]
  userId: string | null
  activeId: string | null
  columns: number
  reduced: boolean
  shared: boolean
  controls: PlayerControls
  onReady: () => void
  onLost: () => void
}
function PositionedPlayer({
  player,
  index,
  zoom,
  props,
  geometry,
}: {
  player: Player
  index: number
  zoom: number
  props: Props
  geometry: ReturnType<typeof createModelGeometry>
}) {
  const ref = useRef<THREE.Group>(null),
    invalidate = useThree((state) => state.invalidate)
  const { x, y } = playerPosition(index, props.players.length, props.columns)
  const initialPosition = useRef<[number, number, number]>([x, y, 0])
  const base = useRef({ x, y })
  useFrame((_, dt) => {
    if (!ref.current) return
    const delta = Math.hypot(x - base.current.x, y - base.current.y)
    if (delta > 0.0001) {
      base.current.x = props.reduced
        ? x
        : THREE.MathUtils.damp(base.current.x, x, 11, Math.min(dt, 0.06))
      base.current.y = props.reduced
        ? y
        : THREE.MathUtils.damp(base.current.y, y, 11, Math.min(dt, 0.06))
      invalidate()
    } else {
      base.current.x = x
      base.current.y = y
    }
    const drift = playerDrift(index, performance.now() * 0.001)
    ref.current.position.x = base.current.x + (props.reduced ? 0 : drift.x)
    ref.current.position.y = base.current.y + (props.reduced ? 0 : drift.y)
  })
  return (
    <group ref={ref} position={initialPosition.current}>
      {
        <Html
          center
          position={[
            0,
            ipodDefinition(player.device.model).height / 2 + 0.43,
            0,
          ]}
          zIndexRange={[10, 0]}
          style={{
            width:
              Math.max(ipodDefinition(player.device.model).width, 1.85) * zoom,
          }}
          wrapperClass="model-label"
        >
          <PlayerLabel
            player={player}
            you={player.user.id === props.userId}
            controls={props.controls}
          />
        </Html>
      }
      <IpodModel
        key={player.device.model}
        player={player}
        geometry={geometry}
        active={props.activeId === player.user.id}
        shared={props.shared}
        reduced={props.reduced}
        onAction={props.controls.onAction}
        onTrack={props.controls.onTrack}
        onFocus={props.controls.onFocus}
      />
      {
        <Html
          center
          position={[
            0,
            -ipodDefinition(player.device.model).height / 2 - 0.46,
            0,
          ]}
          zIndexRange={[10, 0]}
          style={{ width: 2.7 * zoom }}
          wrapperClass="model-caption"
        >
          <PlayerCaption player={player} controls={props.controls} />
        </Html>
      }
    </group>
  )
}
function World(props: Props) {
  const { camera, size, invalidate, gl, scene, raycaster } = useThree()
  const geometries = useMemo(
    () =>
      Object.fromEntries(
        IPODS.map((model) => [model.id, createModelGeometry(model)])
      ) as Record<IpodModelId, ReturnType<typeof createModelGeometry>>,
    []
  )
  const zoom =
    collectionZoom(
      size.width,
      size.height,
      props.columns,
      props.players.length
    ) * props.view.scale
  const current = useRef(props)
  current.current = props
  const wheelValue = useRef(0)
  useLayoutEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = zoom
      camera.updateProjectionMatrix()
      invalidate()
    }
  }, [camera, zoom, invalidate])
  useEffect(
    () => () => {
      Object.values(geometries).forEach((geometry) =>
        Object.values(geometry).forEach((g) => g.dispose())
      )
    },
    [geometries]
  )
  useEffect(() => {
    const unbind = bindPinchZoom(gl.domElement, {
      onPan: (dx, dy) => current.current.onPan(dx, dy),
      onZoom: (factor, anchor) => current.current.onZoom(factor, anchor),
    })
    return unbind
  }, [gl])
  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1
      )
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      const first = hits.find(
        (hit) => hit.object.userData.wheelId || hit.object.userData.lcdId
      )
      const wheelId = first?.object.userData.wheelId as string | undefined
      if (wheelId) {
        event.preventDefault()
        wheelValue.current += event.deltaY
        if (Math.abs(wheelValue.current) > 18) {
          current.current.controls.onAction(
            wheelId,
            wheelValue.current > 0 ? 'next' : 'previous'
          )
          wheelValue.current = 0
        }
      } else {
        event.preventDefault()
        current.current.onZoom(Math.exp(-event.deltaY * 0.002), {
          x: event.clientX - rect.left - rect.width / 2,
          y: event.clientY - rect.top - rect.height / 2,
        })
      }
    }
    const lost = (event: Event) => {
      event.preventDefault()
      current.current.onLost()
    }
    gl.domElement.addEventListener('wheel', onWheel, { passive: false })
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => {
      gl.domElement.removeEventListener('wheel', onWheel)
      gl.domElement.removeEventListener('webglcontextlost', lost)
      document.body.style.cursor = ''
    }
  }, [gl, raycaster, camera, scene])
  const drag = useRef({ x: 0, y: 0, held: false })
  return (
    <>
      <StudioLighting />
      <group position={[props.view.x / zoom, -props.view.y / zoom, 0]}>
        {props.players.map((player, index) => (
          <PositionedPlayer
            key={player.user.id}
            player={player}
            index={index}
            zoom={zoom}
            props={props}
            geometry={geometries[player.device.model]}
          />
        ))}
      </group>
      <mesh
        position={[0, 0, -1]}
        onDoubleClick={props.onFit}
        onPointerOver={() => {
          gl.domElement.style.cursor = 'grab'
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          ;(
            e.target as unknown as { setPointerCapture: (id: number) => void }
          ).setPointerCapture(e.pointerId)
          drag.current = { x: e.clientX, y: e.clientY, held: true }
          gl.domElement.style.cursor = 'grabbing'
        }}
        onPointerMove={(e) => {
          if (!drag.current.held) return
          const dx = e.clientX - drag.current.x,
            dy = e.clientY - drag.current.y
          props.onPan(dx, dy)
          drag.current.x = e.clientX
          drag.current.y = e.clientY
        }}
        onPointerUp={() => {
          drag.current.held = false
          gl.domElement.style.cursor = 'grab'
        }}
        onPointerCancel={() => {
          drag.current.held = false
        }}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
}
export default function IpodScene(props: Props) {
  return (
    <Canvas
      orthographic
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 14], zoom: 100, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0, 0)
        props.onReady()
      }}
      fallback={<span>Your browser doesn’t support 3D. Loading your songs…</span>}
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  )
}
