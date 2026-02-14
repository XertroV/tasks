export function Desk() {
    return (
        <group position={[0, 0, 0]}>
            {/* Desktop Surface */}
            {/* 1.6m wide, 0.8m deep, 0.03m thick */}
            <mesh position={[0, 0.735, -1.0]} receiveShadow castShadow>
                <boxGeometry args={[1.6, 0.03, 0.8]} />
                <meshStandardMaterial color="#5d4037" roughness={0.6} />
            </mesh>

            {/* Legs (Simple) */}
            <mesh position={[-0.7, 0.36, -1.0]} receiveShadow castShadow>
                <boxGeometry args={[0.05, 0.72, 0.7]} />
                <meshStandardMaterial color="#3e2723" />
            </mesh>
            <mesh position={[0.7, 0.36, -1.0]} receiveShadow castShadow>
                <boxGeometry args={[0.05, 0.72, 0.7]} />
                <meshStandardMaterial color="#3e2723" />
            </mesh>

            {/* Modesty Panel / Back */}
            <mesh position={[0, 0.5, -1.35]} receiveShadow castShadow>
                <boxGeometry args={[1.4, 0.4, 0.02]} />
                <meshStandardMaterial color="#3e2723" />
            </mesh>
        </group>
    )
}
