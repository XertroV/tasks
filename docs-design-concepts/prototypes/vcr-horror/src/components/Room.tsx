import { BackSide } from 'three'

export function Room() {
    return (
        <group>
            {/* Room Box - Inverted so we are inside */}
            {/* 4m width, 2.7m height, 5m depth */}
            {/* Center of room at [0, 1.35, -0.5] to align floor at 0 */}
            <mesh position={[0, 1.35, -0.5]} scale={[4, 2.7, 5]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                    color="#222"
                    side={BackSide}
                    roughness={0.8}
                />
            </mesh>

            {/* Floor - Separate mesh for texture potential */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -0.5]}>
                <planeGeometry args={[4, 5]} />
                <meshStandardMaterial color="#3d2d20" roughness={0.9} />
            </mesh>
        </group>
    )
}
