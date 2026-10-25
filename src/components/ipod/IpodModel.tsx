import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Player, PlayerAction } from '../../lib/music'
import { ipodDefinition, ipodAppearance } from '../../lib/ipods'
import { loadArtwork } from '../../lib/artwork'
import { bodyDepth, createModelGeometry } from './hardware'
export { createModelGeometry } from './hardware'
import {
  createBackTexture,
  createLCD,
  createMetalNormalTexture,
  drawLCD,
  createWheelTexture,
  drawColorLCD,
} from './textures'

export interface ModelProps {
  player: Player
  geometry: ReturnType<typeof createModelGeometry>
  active: boolean
  shared: boolean
  reduced: boolean
  onAction: (id: string, action: PlayerAction) => void
  onTrack: (id: string, trackId: string) => void
  onFocus: (id: string) => void
}
type Capturable = {
  setPointerCapture: (id: number) => void
  releasePointerCapture: (id: number) => void
}
const chromeNormalScale = new THREE.Vector2(1.4, 1.4)
const circleDifference = (value: number) =>
  Math.atan2(Math.sin(value), Math.cos(value))

export default function IpodModel({
  player,
  geometry,
  active,
  shared,
  reduced,
  onAction,
  onTrack,
  onFocus,
}: ModelProps) {
  const ref = useRef<THREE.Group>(null)
  const wheelRef = useRef<THREE.Group>(null)
  const centerRef = useRef<THREE.Mesh>(null)
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const model = ipodDefinition(player.device.model)
  const finish = ipodAppearance(player.device)
  const depth = bodyDepth(model),
    front = depth / 2
  const backSurface =
    model.id === 'shuffle2'
      ? front - model.depth - 0.005
      : model.chromeBack
        ? -depth * 0.49 - Math.min(0.018, depth / 10) - 0.002
        : -depth / 2 - 0.002
  const screen = model.screen
  const shuffle = model.id === 'shuffle2'
  const dark = finish.dark
  const wheelTexture = useMemo(
    () => createWheelTexture(finish.wheel, dark, shuffle),
    [finish.wheel, dark, shuffle]
  )
  useEffect(() => () => wheelTexture.dispose(), [wheelTexture])
  const [artwork, setArtwork] = useState<HTMLImageElement | null>(null)
  const artworkUrl = screen?.color ? player.selected?.image_url : null
  useEffect(() => {
    let alive = true
    setArtwork(null)
    if (artworkUrl)
      void loadArtwork(artworkUrl).then((image) => {
        if (alive) setArtwork(image)
      })
    return () => {
      alive = false
    }
  }, [artworkUrl])
  const lcd = useMemo(createLCD, [])
  const metalNormal = useMemo(createMetalNormalTexture, [])
  useEffect(() => () => metalNormal.dispose(), [metalNormal])
  const back = useMemo(
    () => createBackTexture(player.user.username),
    [player.user.username]
  )
  const pose = useRef({
    yaw: 0,
    pitch: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
    moved: false,
    velocityX: 0,
    velocityY: 0,
    lastTime: 0,
  })
  const wheel = useRef({
    held: false,
    angle: 0,
    total: 0,
    moved: false,
    startX: 0,
    startY: 0,
  })
  const centerHeld = useRef(false)
  const hovered = useRef(false)
  useEffect(() => {
    if (screen?.color)
      drawColorLCD(lcd, player, Boolean(screen.portrait), artwork)
    else drawLCD(lcd, player, shared)
    invalidate()
  }, [lcd, player, shared, invalidate, screen, artwork])
  useEffect(
    () => () => {
      lcd.texture.dispose()
    },
    [lcd]
  )
  useEffect(
    () => () => {
      back.dispose()
    },
    [back]
  )
  useEffect(() => {
    const visibleYaw = ref.current?.rotation.y ?? pose.current.yaw
    const visiblePitch = ref.current?.rotation.x ?? pose.current.pitch
    pose.current.yaw = visibleYaw + circleDifference(
      (player.state.flipped ? Math.PI : 0) - visibleYaw
    )
    pose.current.pitch = visiblePitch + circleDifference(-visiblePitch)
    pose.current.velocityX = 0
    pose.current.velocityY = 0
    invalidate()
  }, [player.state.flipped, player.state.reset, invalidate])
  useEffect(() => {
    if (reduced) {
      pose.current.velocityX = 0
      pose.current.velocityY = 0
      invalidate()
    }
  }, [reduced, invalidate])
  useFrame((_, dt) => {
    if (!ref.current) return
    const p = pose.current
    const step = Math.min(dt, 0.05)
    const spinning =
      !p.dragging && !reduced && Math.hypot(p.velocityX, p.velocityY) > 0.003
    if (spinning) {
      p.pitch += p.velocityX * step
      p.yaw += p.velocityY * step
      const friction = Math.exp(-0.65 * step)
      p.velocityX *= friction
      p.velocityY *= friction
    }
    const time = performance.now() * 0.001
    const phase = player.finish * 1.73
    const targetX =
        pose.current.pitch +
        (reduced ? 0 : active ? -0.065 : -0.018) -
        (reduced || !hovered.current ? 0 : 0.035) +
        (reduced ? 0 : Math.sin(time * 0.55 + phase) * 0.055),
      targetY =
        pose.current.yaw +
        (reduced ? 0 : active ? 0.07 : (1 - (player.finish % 3)) * 0.045) +
        (reduced || !hovered.current ? 0 : 0.065) +
        (reduced ? 0 : Math.cos(time * 0.4 + phase) * 0.1),
      targetZ = active ? 0.36 : 0
    let moving = false
    const smooth = (current: number, target: number) => {
      if (Math.abs(current - target) < 0.0001) return target
      moving = true
      return reduced
        ? target
        : THREE.MathUtils.damp(current, target, 12, Math.min(dt, 0.06))
    }
    ref.current.rotation.x = smooth(ref.current.rotation.x, targetX)
    ref.current.rotation.y = smooth(ref.current.rotation.y, targetY)
    ref.current.rotation.z = reduced ? 0 : Math.sin(time * 0.45 + phase) * 0.035
    ref.current.position.z = smooth(ref.current.position.z, targetZ)
    if (centerRef.current)
      centerRef.current.position.z = smooth(
        centerRef.current.position.z,
        centerHeld.current ? front + 0.035 : front + 0.06
      )
    if (moving || spinning || !reduced) invalidate()
  })
  const capture = (e: ThreeEvent<PointerEvent>) => {
    ;(e.target as unknown as Capturable).setPointerCapture(e.pointerId)
  }
  const release = (e: ThreeEvent<PointerEvent>) => {
    try {
      ;(e.target as unknown as Capturable).releasePointerCapture(e.pointerId)
    } catch {
      /* Capture can already be released by the browser. */
    }
  }
  const localWheelPoint = (e: ThreeEvent<PointerEvent>) => {
    const node = wheelRef.current
    if (!node) return null
    const origin = new THREE.Vector3()
    node.getWorldPosition(origin)
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(
      node.getWorldQuaternion(new THREE.Quaternion())
    )
    const point = e.ray.intersectPlane(
      new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin),
      new THREE.Vector3()
    )
    return point ? node.worldToLocal(point) : null
  }
  const bodyEvents = {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (e.button !== 0) return
      e.stopPropagation()
      capture(e)
      onFocus(player.user.id)
      Object.assign(pose.current, {
        dragging: true,
        lastX: e.clientX,
        lastY: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        velocityX: 0,
        velocityY: 0,
        lastTime: performance.now(),
      })
      gl.domElement.style.cursor = 'grabbing'
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      if (!pose.current.dragging) return
      e.stopPropagation()
      const p = pose.current
      const now = performance.now()
      const elapsed = THREE.MathUtils.clamp(
        (now - p.lastTime) / 1000,
        0.008,
        0.08
      )
      const yaw = (e.clientX - p.lastX) * 0.016
      const pitch = (e.clientY - p.lastY) * 0.012
      p.yaw += yaw
      p.pitch += pitch
      p.velocityY = THREE.MathUtils.lerp(
        p.velocityY,
        THREE.MathUtils.clamp(yaw / elapsed, -16, 16),
        0.6
      )
      p.velocityX = THREE.MathUtils.lerp(
        p.velocityX,
        THREE.MathUtils.clamp(pitch / elapsed, -12, 12),
        0.6
      )
      p.lastTime = now
      p.lastX = e.clientX
      p.lastY = e.clientY
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 4)
        p.moved = true
      invalidate()
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      if (!pose.current.dragging) return
      e.stopPropagation()
      pose.current.dragging = false
      if (reduced || performance.now() - pose.current.lastTime > 120) {
        pose.current.velocityX = 0
        pose.current.velocityY = 0
      }
      release(e)
      gl.domElement.style.cursor = 'grab'
    },
    onPointerCancel: () => {
      pose.current.dragging = false
      pose.current.velocityX = 0
      pose.current.velocityY = 0
      gl.domElement.style.cursor = 'auto'
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      hovered.current = true
      invalidate()
      gl.domElement.style.cursor = 'grab'
    },
    onPointerOut: () => {
      hovered.current = false
      invalidate()
      if (!pose.current.dragging) gl.domElement.style.cursor = 'auto'
    },
  }
  return (
    <group ref={ref} userData={{ playerId: player.user.id, model: model.id }}>
      {model.chromeBack && (
        <mesh
          geometry={geometry.back}
          position={[0, 0, -depth * 0.35]}
          {...bodyEvents}
        >
          <meshPhysicalMaterial
            color="#c5c9ca"
            metalness={1}
            normalMap={metalNormal}
            normalScale={chromeNormalScale}
            roughness={0.16}
            envMapIntensity={1.2}
            clearcoat={0.6}
          />
        </mesh>
      )}
      <mesh
        geometry={geometry.shell}
        position={[0, 0, model.chromeBack ? depth * 0.155 : 0]}
        {...bodyEvents}
      >
        <meshPhysicalMaterial
          color={finish.color}
          metalness={model.material === 'plastic' ? 0.03 : 0.78}
          normalMap={model.material === 'plastic' ? undefined : metalNormal}
          normalScale={chromeNormalScale}
          roughness={
            model.material === 'polished'
              ? 0.19
              : model.material === 'plastic'
                ? 0.22
                : 0.34
          }
          clearcoat={
            model.material === 'plastic' || model.material === 'polished'
              ? 1
              : 0.25
          }
          clearcoatRoughness={0.13}
          envMapIntensity={0.9}
        />
      </mesh>
      <mesh
        position={[
          0,
          model.id === 'nano5' ? 0.36 : model.height * 0.08,
          backSurface,
        ]}
        rotation={[0, Math.PI, 0]}
        {...bodyEvents}
      >
        <planeGeometry args={[model.width * 0.76, model.height * 0.42]} />
        <meshBasicMaterial
          map={back}
          transparent
          opacity={model.chromeBack ? 0.68 : 0.44}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {screen && (
        <>
          <mesh
            geometry={geometry.bezel}
            position={[0, screen.y, front + 0.005]}
            {...bodyEvents}
          >
            <meshStandardMaterial
              color={screen.color ? '#101318' : '#929c88'}
              metalness={0.25}
              roughness={0.4}
            />
          </mesh>
          <mesh
            position={[0, screen.y, front + 0.023]}
            userData={{ lcdId: player.user.id }}
            onPointerOver={(e) => {
              e.stopPropagation()
              gl.domElement.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              gl.domElement.style.cursor = 'auto'
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              if (e.delta > 5) return
              onFocus(player.user.id)
              if (player.state.detail) {
                onAction(player.user.id, 'select')
                return
              }
              const y =
                (1 - (e.uv?.y ?? 0.5)) *
                (screen.color ? (screen.portrait ? 1002 : 480) : 420)
              if (
                screen.color &&
                !screen.portrait &&
                (e.uv?.x || 0) > 355 / 640
              ) {
                onAction(player.user.id, 'select')
                return
              }
              const index = Math.floor(
                (y - (screen.color ? 65 : 73)) /
                  (screen.color ? (screen.portrait ? 89 : 67) : 54)
              )
              const track = player.tracks[index]
              if (track && index >= 0 && index < 5)
                onTrack(player.user.id, track.id)
            }}
          >
            <planeGeometry args={[screen.width, screen.height]} />
            <meshBasicMaterial map={lcd.texture} toneMapped={false} />
          </mesh>
          <mesh
            geometry={geometry.lens}
            position={[0, screen.y, front + 0.032]}
            raycast={() => null}
          >
            <meshPhysicalMaterial
              color="#fff"
              transparent
              opacity={0.025}
              roughness={0.12}
              clearcoat={1}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
      <group
        ref={wheelRef}
        position={[0, model.wheel.y, 0]}
        scale={[model.wheel.radius / 0.79, model.wheel.radius / 0.79, 1]}
      >
        <mesh
          position={[0, 0, front + 0.009]}
          rotation={[Math.PI / 2, 0, 0]}
          raycast={() => null}
        >
          <cylinderGeometry args={[0.797, 0.797, 0.015, 96]} />
          <meshStandardMaterial color="#bac1ad" roughness={0.65} />
        </mesh>
        <mesh
          position={[0, 0, front + 0.023]}
          userData={{ wheelId: player.user.id }}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.stopPropagation()
            capture(e)
            onFocus(player.user.id)
            const point = localWheelPoint(e)
            Object.assign(wheel.current, {
              held: true,
              angle: point ? Math.atan2(point.y, point.x) : 0,
              total: 0,
              moved: false,
              startX: e.clientX,
              startY: e.clientY,
            })
            gl.domElement.style.cursor = 'grabbing'
            invalidate()
          }}
          onPointerMove={(e) => {
            if (!wheel.current.held) return
            e.stopPropagation()
            const point = localWheelPoint(e)
            if (!point) return
            const angle = Math.atan2(point.y, point.x),
              delta = circleDifference(angle - wheel.current.angle)
            wheel.current.total -= delta
            wheel.current.angle = angle
            if (
              Math.hypot(
                e.clientX - wheel.current.startX,
                e.clientY - wheel.current.startY
              ) > 4
            )
              wheel.current.moved = true
            if (!shuffle && Math.abs(wheel.current.total) > 0.38) {
              onAction(
                player.user.id,
                wheel.current.total > 0 ? 'next' : 'previous'
              )
              wheel.current.total = 0
            }
          }}
          onPointerUp={(e) => {
            if (!wheel.current.held) return
            e.stopPropagation()
            const point = localWheelPoint(e)
            if (
              !wheel.current.moved &&
              point &&
              (!shuffle || Math.abs(point.x) > Math.abs(point.y))
            ) {
              onAction(
                player.user.id,
                Math.abs(point.x) > Math.abs(point.y)
                  ? point.x > 0
                    ? 'next'
                    : 'previous'
                  : point.y > 0
                    ? 'menu'
                    : 'play'
              )
            }
            wheel.current.held = false
            release(e)
            gl.domElement.style.cursor = 'pointer'
            invalidate()
          }}
          onPointerCancel={() => {
            wheel.current.held = false
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            gl.domElement.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            if (!wheel.current.held) gl.domElement.style.cursor = 'auto'
          }}
        >
          <ringGeometry args={[0.295, 0.79, 96]} />
          <meshStandardMaterial
            map={wheelTexture}
            roughness={0.7}
            metalness={0}
            envMapIntensity={0.3}
          />
        </mesh>
        <mesh
          ref={centerRef}
          position={[0, 0, front + 0.06]}
          rotation={[Math.PI / 2, 0, 0]}
          onPointerDown={(e) => {
            e.stopPropagation()
            capture(e)
            centerHeld.current = true
            onFocus(player.user.id)
            invalidate()
          }}
          onPointerUp={(e) => {
            e.stopPropagation()
            if (centerHeld.current && e.delta < 7)
              onAction(player.user.id, shuffle ? 'play' : 'select')
            centerHeld.current = false
            release(e)
            invalidate()
          }}
          onPointerCancel={() => {
            centerHeld.current = false
            invalidate()
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            gl.domElement.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            gl.domElement.style.cursor = 'auto'
          }}
        >
          <cylinderGeometry args={[0.287, 0.287, 0.025, 80]} />
          <meshPhysicalMaterial
            color={finish.center}
            roughness={0.4}
            clearcoat={0.6}
            metalness={0}
          />
        </mesh>
        {shuffle && (
          <group position={[0, 0, front + 0.081]}>
            <mesh position={[-0.06, 0, 0]} raycast={() => null}>
              <circleGeometry args={[0.09, 3]} />
              <meshBasicMaterial color="#68716d" />
            </mesh>
            {[0.055, 0.105].map((x) => (
              <mesh key={x} position={[x, 0, 0]} raycast={() => null}>
                <planeGeometry args={[0.025, 0.13]} />
                <meshBasicMaterial color="#68716d" />
              </mesh>
            ))}
          </group>
        )}
      </group>
      {shuffle && (
        <>
          <mesh position={[0, model.height / 2 + 0.008, 0]} {...bodyEvents}>
            <boxGeometry args={[0.15, 0.035, 0.08]} />
            <meshStandardMaterial color="#555a5c" />
          </mesh>
          <mesh
            position={[-0.38, -model.height / 2 - 0.008, 0]}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onAction(player.user.id, 'shuffle')
            }}
          >
            <boxGeometry args={[0.26, 0.035, 0.08]} />
            <meshStandardMaterial
              color={player.state.shuffle ? '#78b55b' : '#e3e6e0'}
            />
          </mesh>
          <mesh
            geometry={geometry.back}
            position={[0, 0.04, front - model.depth + 0.0275]}
            {...bodyEvents}
          >
            <meshPhysicalMaterial
              color={finish.color}
              metalness={0.85}
              roughness={0.3}
            />
          </mesh>
          <mesh
            position={[0, model.height * 0.37, front - model.depth + 0.1]}
            rotation={[0, 0, Math.PI / 2]}
            {...bodyEvents}
          >
            <cylinderGeometry args={[0.1, 0.1, model.width * 0.8, 32]} />
            <meshStandardMaterial
              color={finish.color}
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
          <mesh
            position={[0.65, model.height / 2 + 0.006, 0]}
            raycast={() => null}
          >
            <cylinderGeometry args={[0.07, 0.07, 0.018, 24]} />
            <meshStandardMaterial color="#181b1f" />
          </mesh>
          <mesh position={[0.69, 0, front + 0.012]} raycast={() => null}>
            <circleGeometry args={[0.018, 16]} />
            <meshBasicMaterial color="#a8ef59" toneMapped={false} />
          </mesh>
        </>
      )}
      {!shuffle && (
        <>
          <mesh
            position={[-model.width * 0.28, model.height / 2 + 0.012, 0]}
            {...bodyEvents}
          >
            <boxGeometry args={[0.3, 0.025, 0.07]} />
            <meshStandardMaterial color="#646969" roughness={0.5} />
          </mesh>
          <mesh
            position={[-model.width * 0.3, model.height / 2 + 0.025, 0]}
            {...bodyEvents}
          >
            <boxGeometry args={[0.19, 0.012, 0.06]} />
            <meshStandardMaterial color="#e5e5df" />
          </mesh>
          <mesh
            position={[
              model.width * 0.29,
              model.id === 'nano3' || model.id === 'nano5'
                ? -model.height / 2 - 0.009
                : model.height / 2 + 0.009,
              0,
            ]}
            raycast={() => null}
          >
            <cylinderGeometry args={[0.06, 0.06, 0.018, 32]} />
            <meshStandardMaterial color="#161a1d" />
          </mesh>
          <mesh position={[0, -model.height / 2 - 0.01, 0]} {...bodyEvents}>
            <boxGeometry
              args={[
                Math.min(0.58, model.width * 0.42),
                0.018,
                Math.min(0.13, depth * 0.7),
              ]}
            />
            <meshStandardMaterial color="#282e33" />
          </mesh>
        </>
      )}
      {model.id === 'mini2' &&
        [-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={geometry.cap}
            position={[0, side * (model.height / 2 - 0.012), 0]}
            {...bodyEvents}
          >
            <meshStandardMaterial color="#e1e4dd" roughness={0.6} />
          </mesh>
        ))}
      {model.id === 'nano5' && (
        <>
          <mesh
            geometry={geometry.camera}
            position={[0.54, -1.19, -depth / 2 - 0.015]}
            rotation={[0, Math.PI, 0]}
            {...bodyEvents}
          >
            <meshStandardMaterial
              color="#171b21"
              metalness={0.3}
              roughness={0.3}
            />
          </mesh>
          <mesh
            position={[0.54, -1.34, -depth / 2 - 0.025]}
            rotation={[0, Math.PI, 0]}
            raycast={() => null}
          >
            <circleGeometry args={[0.065, 32]} />
            <meshPhysicalMaterial
              color="#1a3651"
              metalness={0.8}
              clearcoat={1}
              roughness={0.08}
            />
          </mesh>
          <mesh
            position={[0.54, -1.02, -depth / 2 - 0.025]}
            rotation={[0, Math.PI, 0]}
            raycast={() => null}
          >
            <circleGeometry args={[0.018, 16]} />
            <meshBasicMaterial color="#aeb9c5" />
          </mesh>
        </>
      )}
    </group>
  )
}
