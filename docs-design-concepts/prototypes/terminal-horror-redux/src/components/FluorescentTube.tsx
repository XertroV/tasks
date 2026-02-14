import { useState } from 'react';
import { useFrame } from '@react-three/fiber';

interface FluorescentTubeProps {
  position: [number, number, number];
  flickering?: boolean;
  intensity?: number;
}

export default function FluorescentTube({ position, flickering = false, intensity = 4 }: FluorescentTubeProps) {
  const [currentIntensity, setCurrentIntensity] = useState(intensity);
  
  useFrame(({ clock }) => {
    if (flickering) {
      const t = clock.elapsedTime;
      const flicker = 
        Math.sin(t * 120) * 0.1 +
        Math.sin(t * 47) * 0.05 +
        (Math.random() > 0.995 ? -0.8 : 0);
      setCurrentIntensity(intensity * (0.7 + flicker));
    }
  });
  
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.2, 0.05, 0.1]} />
        <meshStandardMaterial color="#E8E4D8" roughness={0.8} />
      </mesh>
      
      <mesh position={[0, -0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.019, 0.019, 1.1, 16]} />
        <meshStandardMaterial 
          color="#E8E4D8" 
          emissive="#E8E4D8" 
          emissiveIntensity={currentIntensity * 0.5 / 4}
        />
      </mesh>
      
      <rectAreaLight
        width={1.2}
        height={0.1}
        intensity={currentIntensity}
        color="#E8E4D8"
        position={[0, -0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}
