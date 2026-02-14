import * as THREE from 'three'
import { useRef } from 'react'
import { Text, shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { useVCRStore } from '../store/vcrStore'

// Custom shader for CRT scanlines and vignette
const CRTShaderMaterial = shaderMaterial(
    { time: 0, resolution: new THREE.Vector2() },
    // vertex shader
    `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    // fragment shader
    `
    uniform float time;
    varying vec2 vUv;
    void main() {
      // Scanlines (sine wave based on Y UV)
      // High frequency for scanlines
      float scanline = sin(vUv.y * 600.0 + time * 2.0) * 0.04;
      
      // Vignette
      vec2 uv = vUv * (1.0 - vUv.yx); // 0..1 to curve
      float vig = uv.x * uv.y * 15.0; 
      vig = pow(vig, 0.25); // curve shape
      
      // Invert for darkness at edges
      float alpha = (1.0 - vig); 
      
      // Combine: Darken edges, add scanline darks
      // We want a black overlay with varying alpha
      // Scanlines add to alpha (making it blacker)
      
      // Soft clamp
      float finalAlpha = clamp(alpha * 0.8 + scanline, 0.0, 1.0);
      
      gl_FragColor = vec4(0.0, 0.0, 0.0, finalAlpha);
    }
    `
)

extend({ CRTShaderMaterial })

function CRTOverlay() {
    const ref = useRef<THREE.ShaderMaterial>(null)
    useFrame((state) => {
        if (ref.current) {
            ref.current.uniforms.time.value = state.clock.elapsedTime
        }
    })

    return (
        <mesh position={[0, 0, 1.0]}>
            <planeGeometry args={[6, 5]} />
            {/* @ts-ignore */}
            <cRTShaderMaterial ref={ref} transparent depthWrite={false} />
        </mesh>
    )
}

export function ScreenContent() {
    const { status, currentTime, screenFlash } = useVCRStore()

    // Format time as HH:MM:SS
    const formatTime = (t: number) => {
        const h = Math.floor(t / 3600).toString().padStart(2, '0')
        const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0')
        const s = Math.floor(t % 60).toString().padStart(2, '0')
        return `${h}:${m}:${s}`
    }

    return (
        <group>
            <CRTOverlay />

            {/* Header */}
            <group position={[0, 1.5, 0]}>
                <Text
                    position={[-2.2, 0, 0]}
                    fontSize={0.25}
                    color="#33ff33"
                    anchorX="left"
                >
                    VCR-OS v1.0
                </Text>
                <Text
                    position={[0, 0, 0]}
                    fontSize={0.25}
                    color="#33ff33"
                    anchorX="center"
                >
                    {status}
                </Text>
                <Text
                    position={[2.2, 0, 0]}
                    fontSize={0.25}
                    color="#33ff33"
                    anchorX="right"
                >
                    {formatTime(currentTime)}
                </Text>
                {/* Header Line */}
                <mesh position={[0, -0.2, 0]}>
                    <planeGeometry args={[4.6, 0.02]} />
                    <meshBasicMaterial color="#33ff33" />
                </mesh>
            </group>

            {/* Main Content */}
            <group position={[-2.2, 0, 0]}>
                {status === 'EJECTED' ? (
                    <Text position={[2.2, 0, 0]} fontSize={0.4} color="#33ff33">
                        INSERT TAPE
                    </Text>
                ) : (
                    <Text
                        fontSize={0.18}
                        color="#33ff33"
                        maxWidth={4.4}
                        lineHeight={1.4}
                        anchorX="left"
                        anchorY="middle"
                        textAlign="left"
                    >
                        {`> LOADED: TAPE_01
> SECTOR: ${Math.floor(currentTime / 10)}

> READING DATA...

> [LINK] ACCESS_MEMORY_01
> [LINK] BYPASS_SECURITY

> _`}
                    </Text>
                )}
            </group>

            {/* Big FF/RW Status Overlays */}
            {(status === 'FF' || status === 'RW') && (
                <Text fontSize={2} color="white" fillOpacity={0.15} position={[0, 0, 0.5]}>
                    {status === 'FF' ? '>>' : '<<'}
                </Text>
            )}

            {/* Flash Effect */}
            {screenFlash && (
                <mesh position={[0, 0, 2]}>
                    <planeGeometry args={[10, 10]} />
                    <meshBasicMaterial color="white" toneMapped={false} />
                </mesh>
            )}
        </group>
    )
}
