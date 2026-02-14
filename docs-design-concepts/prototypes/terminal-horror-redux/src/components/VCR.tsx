import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VCRProps {
  position: [number, number, number];
}

export default function VCR({ position }: VCRProps) {
  const displayRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (displayRef.current) {
      const material = displayRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 2) * 0.1;
    }
  });
  
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.1, 0.25]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      
      <mesh position={[0, 0.051, 0]}>
        <boxGeometry args={[0.38, 0.02, 0.22]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
      </mesh>
      
      <mesh position={[0, 0.03, 0.13]}>
        <boxGeometry args={[0.15, 0.02, 0.01]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      
      <mesh position={[-0.15, 0.03, 0.13]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial 
          color="#00FF00" 
          emissive="#00FF00" 
          emissiveIntensity={0.5} 
        />
      </mesh>
      
      <mesh ref={displayRef} position={[0.08, 0.03, 0.13]}>
        <planeGeometry args={[0.08, 0.025]} />
        <meshStandardMaterial 
          color="#000033" 
          emissive="#00FFFF" 
          emissiveIntensity={0.3} 
        />
      </mesh>
      
      {[-0.12, -0.04, 0.04, 0.12].map((x, i) => (
        <mesh key={i} position={[x, 0.03, 0.14]} castShadow>
          <boxGeometry args={[0.03, 0.015, 0.01]} />
          <meshStandardMaterial color="#333333" roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}
