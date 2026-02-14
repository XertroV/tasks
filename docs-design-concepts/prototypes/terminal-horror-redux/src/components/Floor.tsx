import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import '../shaders/CarpetMaterial';

const ROOM_WIDTH = 12;
const ROOM_DEPTH = 16;

export default function Floor() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH, 100, 100]} />
      <carpetMaterial ref={materialRef} />
    </mesh>
  );
}
