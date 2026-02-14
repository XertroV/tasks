import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function TheEntity() {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    
    if (coreRef.current) {
      const heartbeat = Math.sin(t * 3) * 0.5 + 0.5;
      const pulse = 0.9 + heartbeat * 0.2;
      coreRef.current.scale.set(pulse, pulse, pulse);
    }
    
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.1;
      groupRef.current.rotation.y = t * 0.1;
    }
  });
  
  return (
    <group ref={groupRef} position={[0, 1.2, 4]} rotation={[0, Math.PI, 0]}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial 
          color="#FF0000"
          emissive="#550000"
          emissiveIntensity={3}
          roughness={0.3}
          metalness={0.7}
          wireframe
        />
        <pointLight intensity={2} color="#FF0000" distance={6} decay={2} />
      </mesh>
      
      {Array.from({ length: 35 }).map((_, i) => {
        const phi = Math.acos(-1 + (2 * i) / 35);
        const theta = Math.sqrt(35 * Math.PI) * phi;
        const length = 0.8 + Math.random() * 0.5;
        
        return (
          <mesh
            key={i}
            position={[
              Math.cos(theta) * Math.sin(phi) * length,
              Math.sin(theta) * Math.sin(phi) * length,
              Math.cos(phi) * length,
            ]}
          >
            <cylinderGeometry args={[0.01, 0.015, 0.6 + Math.random() * 0.4, 6]} />
            <meshStandardMaterial 
              color="#111111"
              emissive="#220000"
              emissiveIntensity={0.2}
            />
          </mesh>
        );
      })}
      
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={`eye-${i}`}
          position={[
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            0.3 + Math.random() * 0.3,
          ]}
        >
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial 
            color="#FFFFFF"
            emissive="#FFFFFF"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}
