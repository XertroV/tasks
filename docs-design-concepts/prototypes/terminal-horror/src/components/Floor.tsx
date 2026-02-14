import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import '../shaders/CarpetMaterial';

declare module '@react-three/fiber' {
  interface ThreeElements {
    carpetMaterial: any;
  }
}

const ROOM_WIDTH = 12;
const ROOM_DEPTH = 16;

export function Floor() {
  const materialRef = useRef<any>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });

  const geometry = useMemo(() => {
    const segmentsX = 80;
    const segmentsZ = 100;
    const geo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH, segmentsX, segmentsZ);
    const positions = geo.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 1];
      const seed = x * 127.1 + z * 311.7;
      const displacement = (Math.sin(seed) * 43758.5453) % 1;
      positions[i + 2] += Math.abs(displacement) * 0.015;
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]} 
      receiveShadow
    >
      <primitive object={geometry} />
      <carpetMaterial ref={materialRef} />
    </mesh>
  );
}
