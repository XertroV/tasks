const ROOM_WIDTH = 12;
const ROOM_DEPTH = 16;
const ROOM_HEIGHT = 2.74;

export function Ceiling() {
  const tubePositions = [
    { x: 3, z: -5 },
    { x: -3, z: 3 },
  ];

  return (
    <group position={[0, ROOM_HEIGHT, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial 
          color="#E8E0D0" 
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {tubePositions.map((pos, i) => (
        <mesh 
          key={`cutout-${i}`}
          position={[pos.x, -0.002, pos.z]} 
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1.3, 0.15]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}
