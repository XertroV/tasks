import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, SoftShadows } from '@react-three/drei'
import * as THREE from 'three'

// Volumetric Light Shader
const VolumetricLightMaterial = {
  uniforms: {
    uIntensity: { value: 1.0 },
    uColor: { value: new THREE.Color('#ffaa44') }
  },
  vertexShader: `
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uIntensity;
    uniform vec3 uColor;
    varying vec3 vPosition;

    void main() {
      // Create a gradient that fades out as we go down (negative Y relative to cone center)
      // Cone height is roughly 10 units, centered at 0. Top is ~5, bottom ~-5.
      // We want bright at top, fading to nothing at bottom.
      
      float fade = smoothstep(-4.0, 4.0, vPosition.y); 
      float opacity = uIntensity * fade * 0.15;

      // Soften edges
      float edgeFade = 1.0 - smoothstep(0.0, 1.0, length(vPosition.xz) / (2.5 * (1.0 - (vPosition.y + 5.0)/10.0)));
      
      gl_FragColor = vec4(uColor, opacity);
    }
  `
}

function VolumetricLight({ materialRef }: { materialRef: React.MutableRefObject<THREE.ShaderMaterial> }) {
  // Position the cone so the tip is at the light source
  // Lamp is at [2, 4, 2]. Cone needs to point down.
  // Height 8, Top radius 0.1, Bottom radius 3
  
  return (
    <mesh position={[2, 0, 2]} rotation={[0, 0, 0]}>
      <cylinderGeometry args={[0.1, 4, 8, 32, 1, true]} />
      <shaderMaterial
        ref={materialRef}
        attach="material"
        args={[VolumetricLightMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function Lamp({ volumetricMaterialRef }: { volumetricMaterialRef: React.MutableRefObject<THREE.ShaderMaterial> }) {
  const lightRef = useRef<THREE.PointLight>(null!)
  const [baseIntensity] = useState(1.5)

  useFrame(() => {
    if (lightRef.current) {
      // Random flicker effect
      const flicker = Math.random() > 0.95 ? (Math.random() - 0.5) * 0.8 : 0
      const newIntensity = THREE.MathUtils.lerp(
        lightRef.current.intensity,
        baseIntensity + flicker,
        0.1
      )
      
      lightRef.current.intensity = newIntensity
      
      // Sync volumetric light intensity
      if (volumetricMaterialRef.current) {
         volumetricMaterialRef.current.uniforms.uIntensity.value = newIntensity
         // Add subtle movement to the "dust" in the light by shifting color slightly or just intensity
      }
    }
  })

  return (
    <pointLight
      ref={lightRef}
      position={[2, 4, 2]}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.001}
      color="#ffaa44"
      decay={2}
      distance={20}
    />
  )
}

function Desk() {
  return (
    <mesh position={[0, -1, 0]} receiveShadow castShadow rotation={[-0.1, 0, 0]}>
      <boxGeometry args={[10, 0.5, 6]} />
      <meshStandardMaterial color="#5c4033" roughness={0.8} />
    </mesh>
  )
}

function Dust() {
  const count = 1000
  const mesh = useRef<THREE.InstancedMesh>(null!)
  
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100
      const factor = 20 + Math.random() * 100
      const speed = 0.01 + Math.random() / 200
      const xFactor = -50 + Math.random() * 100
      const yFactor = -50 + Math.random() * 100
      const zFactor = -50 + Math.random() * 100
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 })
    }
    return temp
  }, [count])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame(() => {
    particles.forEach((particle, i) => {
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle
      t = particle.t += speed / 2
      const s = Math.cos(t)
      
      dummy.position.set(
        (particle.mx / 10) + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        (particle.my / 10) + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        (particle.my / 10) + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
      )
      dummy.scale.set(s, s, s)
      dummy.rotation.set(s * 5, s * 5, s * 5)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.02, 0]} />
      <meshStandardMaterial color="#fffacd" transparent opacity={0.6} />
    </instancedMesh>
  )
}

function CameraRig() {
  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Breathing sway
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(t / 4) * 0.2, 0.05)
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 3 + Math.cos(t / 4) * 0.1, 0.05)
    state.camera.lookAt(0, 0, 0)
  })
  return <PerspectiveCamera makeDefault position={[0, 3, 5]} fov={50} />
}

export default function Scene() {
  const volumetricMaterialRef = useRef<THREE.ShaderMaterial>(null!)

  return (
    <div className="absolute inset-0 -z-10 bg-[#C8B860]">
      <Canvas shadows dpr={[1, 2]}>
        <color attach="background" args={['#C8B860']} />
        <fogExp2 attach="fog" args={['#C8B860', 0.15]} />
        
        <ambientLight intensity={0.2} color="#C8B860" />
        <Lamp volumetricMaterialRef={volumetricMaterialRef} />
        <VolumetricLight materialRef={volumetricMaterialRef} />
        
        <Desk />
        <Dust />
        <CameraRig />
        
        <SoftShadows size={10} samples={10} focus={0.5} />
      </Canvas>
    </div>
  )
}
