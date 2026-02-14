import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { ScreenContent } from './ScreenContent'
import { Mesh, PlaneGeometry } from 'three'
import { RenderTexture, PerspectiveCamera } from '@react-three/drei'

export function CRTMonitor() {
    const meshRef = useRef<Mesh>(null)

    // Create a curved plane geometry to act as the screen
    // This provides physical curvature while maintaining standard planar UV mapping
    // so the text texture doesn't distort or zoom in like it would on a Sphere pole.
    const screenGeometry = useMemo(() => {
        // 4:3 aspect ratio roughly matching the casing hole
        const geo = new PlaneGeometry(1.0, 0.75, 32, 32)
        const pos = geo.attributes.position

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i)
            const y = pos.getY(i)

            // Bulge calculation:
            // Z decreases as x/y increase (moving away from center)
            // Center (0,0) stays at 0. Edges curve backward.
            // This creates a convex shape pointing at the camera.
            const curvature = 0.35
            const z = -curvature * (x * x + y * y)
            pos.setZ(i, z)
        }

        geo.computeVertexNormals()
        return geo
    }, [])

    useFrame((state) => {
        // Subtle breathing/vibration
        if (meshRef.current) {
            meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.002
        }
    })

    return (
        <group>
            {/* Monitor Casing */}
            <mesh ref={meshRef} position={[0, -0.1, 0]}>
                <boxGeometry args={[1.2, 0.9, 1.0]} />
                <meshStandardMaterial color="#2a2a2a" roughness={0.7} metalness={0.1} />
            </mesh>

            {/* Screen Area */}
            <group position={[0, -0.05, 0.51]} scale={[0.92, 0.8, 1]}>
                {/* Glass Reflection Layer & Raycast Target */}
                <mesh name="CRTScreen" position={[0, 0, 0.05]} geometry={screenGeometry}>
                    <meshStandardMaterial roughness={0.4} metalness={0.1} emissive="black" emissiveIntensity={1}>
                        <RenderTexture attach="map" anisotropy={16}>
                            <color attach="background" args={['black']} />
                            <PerspectiveCamera makeDefault manual aspect={1.0 / 0.75} position={[0, 0, 4]} />
                            {/* Lighting for the render texture scene */}
                            <ambientLight intensity={1.5} />
                            <ScreenContent />
                        </RenderTexture>
                    </meshStandardMaterial>
                </mesh>
            </group>

            {/* Stand/Base */}
            <mesh position={[0, -0.6, 0]}>
                <cylinderGeometry args={[0.3, 0.4, 0.2, 32]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>
        </group>
    )
}

