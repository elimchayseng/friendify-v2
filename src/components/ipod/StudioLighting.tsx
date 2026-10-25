import { Environment, Lightformer } from '@react-three/drei'
export default function StudioLighting() {
  return (
    <>
      <ambientLight intensity={1.25} />
      <directionalLight position={[-5, 7, 9]} intensity={3.4} color="#fffdf3" />
      <directionalLight
        position={[6, -3, 5]}
        intensity={0.65}
        color="#e1efff"
      />
      <Environment resolution={128} frames={1} environmentIntensity={0.8}>
        <color attach="background" args={['#d5d3ca']} />
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#fffef5"
          position={[-5, 3, 6]}
          scale={[8, 4, 1]}
          rotation={[0, Math.PI / 5, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.7}
          color="#fff"
          position={[5, -2, 4]}
          scale={[2, 9, 1]}
          rotation={[0, -Math.PI / 5, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          color="#d9e9ef"
          position={[0, 5, -5]}
          scale={[7, 2, 1]}
          rotation={[0, Math.PI, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.4}
          color="#d1c6af"
          position={[0, -5, -3]}
          scale={[10, 3, 1]}
          rotation={[0, Math.PI, 0]}
        />
      </Environment>
    </>
  )
}
