import { useRef } from 'react'
import { Group } from 'three'

export function Zapper() {
    const group = useRef<Group>(null)

    return (
        <group ref={group} dispose={null}>
            {/* Main Body (Grey) */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.03, 0.08, 0.2]} />
                <meshStandardMaterial color="#888888" roughness={0.5} />
            </mesh>

            {/* Handle (Grey, angled) */}
            <mesh position={[0, -0.06, 0.05]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.028, 0.1, 0.04]} />
                <meshStandardMaterial color="#888888" roughness={0.5} />
            </mesh>

            {/* Barrel (Orange/Red - NES Zapper distinct) */}
            <mesh position={[0, 0, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.1, 16]} />
                <meshStandardMaterial color="#ff4400" roughness={0.2} />
            </mesh>

            {/* Trigger Guard */}
            <mesh position={[0, -0.04, 0.02]} rotation={[0, 0, 0]}>
                <boxGeometry args={[0.01, 0.01, 0.04]} />
                <meshStandardMaterial color="#333" />
            </mesh>
        </group>
    )
}
