import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

interface FluorescentTubeProps {
  position: [number, number, number];
  flickering?: boolean;
  intensity?: number;
}

export function FluorescentTube({ 
  position, 
  flickering = false, 
  intensity: baseIntensity = 3 
}: FluorescentTubeProps) {
  const [intensity, setIntensity] = useState(baseIntensity);
  const [emissiveIntensity, setEmissiveIntensity] = useState(0.6);
  const blackoutRef = useRef(0);
  const dramaticDropRef = useRef(0);

  useFrame(({ clock }) => {
    if (!flickering) return;

    const t = clock.elapsedTime;

    const slowDrift = Math.sin(t * 0.3) * 0.05;
    const fastFlicker = Math.sin(t * 47) * 0.03;
    const microFlicker = Math.sin(t * 120) * 0.02;

    if (Math.random() > 0.997) {
      dramaticDropRef.current = -0.5;
    }
    dramaticDropRef.current *= 0.92;

    if (Math.random() > 0.9995) {
      blackoutRef.current = 12;
    }
    if (blackoutRef.current > 0) {
      blackoutRef.current -= 1;
    }

    const drop = dramaticDropRef.current;
    const blackout = blackoutRef.current > 0 ? -0.85 : 0;

    const newIntensity = Math.max(
      0.1,
      baseIntensity + slowDrift + fastFlicker + microFlicker + drop + blackout
    );
    setIntensity(newIntensity);
    setEmissiveIntensity(0.4 + newIntensity / baseIntensity * 0.3);
  });

  const color = '#E8E4D8';
  const agedColor = '#D8D4C8';

  return (
    <group position={position}>
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[1.2, 0.05, 0.12]} />
        <meshStandardMaterial 
          color="#3a3a3a" 
          roughness={0.6} 
          metalness={0.7}
        />
      </mesh>

      <mesh position={[0.62, 0, 0]}>
        <boxGeometry args={[0.04, 0.04, 0.1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} metalness={0.6} />
      </mesh>
      <mesh position={[-0.62, 0, 0]}>
        <boxGeometry args={[0.04, 0.04, 0.1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} metalness={0.6} />
      </mesh>

      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.019, 0.019, 1.1, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.95}
        />
      </mesh>

      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1.08, 12]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.3} />
      </mesh>

      <spotLight
        position={[0, -0.1, 0]}
        angle={1.2}
        penumbra={0.5}
        intensity={intensity * 15}
        color={flickering ? agedColor : color}
        distance={10}
        decay={1.5}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
    </group>
  );
}
