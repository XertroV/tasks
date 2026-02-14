export default function Ceiling() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.74, 0]}>
      <planeGeometry args={[12, 16]} />
      <meshStandardMaterial color="#E8E4D8" roughness={0.9} />
    </mesh>
  );
}
