import * as THREE from 'three'
import { IPODS, type IpodDefinition } from '../../lib/ipods'
import { roundedGeometry } from './textures'

export function bodyDepth(model: IpodDefinition) {
  return model.id === 'shuffle2' ? model.depth * 0.55 : model.depth
}
function capsuleBody(width: number, height: number, depth: number) {
  const shape = new THREE.Shape(),
    r = depth / 2,
    a = width / 2 - r
  shape.moveTo(-a, -r)
  shape.lineTo(a, -r)
  shape.absarc(a, 0, r, -Math.PI / 2, Math.PI / 2, false)
  shape.lineTo(-a, r)
  shape.absarc(-a, 0, r, Math.PI / 2, Math.PI * 1.5, false)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 24,
    steps: 1,
  })
  geometry.rotateX(Math.PI / 2)
  geometry.center()
  geometry.computeVertexNormals()
  return geometry
}
export function createModelGeometry(model: IpodDefinition = IPODS[0]) {
  const depth = bodyDepth(model)
  const s = model.screen
  const capsule = model.id === 'mini2' || model.id === 'nano5'
  const bevel = Math.min(0.025, depth / 8)
  return {
    camera: roundedGeometry(0.26, 0.58, 0.009, 0.125, 0.002),
    shell: capsule
      ? capsuleBody(model.width, model.height, depth)
      : roundedGeometry(
          model.width - bevel * 2,
          model.height - bevel * 2,
          model.chromeBack ? depth * 0.67 : depth - bevel * 2,
          model.radius,
          bevel
        ),
    cap: capsuleBody(model.width - 0.035, 0.045, depth - 0.035),
    back:
      model.id === 'shuffle2'
        ? roundedGeometry(
            model.width * 0.88,
            model.height * 0.74,
            0.055,
            0.06,
            0.008
          )
        : roundedGeometry(
            model.width - 0.015,
            model.height - 0.015,
            depth * 0.28,
            model.radius,
            Math.min(0.018, depth / 10)
          ),
    bezel: roundedGeometry(
      (s?.width || 0.1) + (model.id === 'nano5' ? 0.15 : 0.1),
      (s?.height || 0.1) + (model.id === 'nano5' ? 0.2 : 0.1),
      0.018,
      model.id === 'nano5' ? 0.09 : 0.055,
      0.008
    ),
    lens: roundedGeometry(
      (s?.width || 0.1) + 0.015,
      (s?.height || 0.1) + 0.015,
      0.006,
      0.025,
      0.003
    ),
  }
}
