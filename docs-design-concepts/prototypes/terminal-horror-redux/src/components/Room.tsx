import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import '../shaders/WallpaperMaterial';

const ROOM_WIDTH = 12;
const ROOM_DEPTH = 16;
const ROOM_HEIGHT = 2.74;

export default function Room() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });
  
  const walls = [
    { position: [0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2], rotation: [0, 0, 0], size: [ROOM_WIDTH, ROOM_HEIGHT] },
    { position: [0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2], rotation: [0, Math.PI, 0], size: [ROOM_WIDTH, ROOM_HEIGHT] },
    { position: [-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0], rotation: [0, Math.PI / 2, 0], size: [ROOM_DEPTH, ROOM_HEIGHT] },
    { position: [ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0], rotation: [0, -Math.PI / 2, 0], size: [ROOM_DEPTH, ROOM_HEIGHT] },
  ];
  
  return (
    <group>
      {walls.map((wall, i) => (
        <mesh key={i} position={wall.position as [number, number, number]} rotation={wall.rotation as [number, number, number]}>
          <planeGeometry args={wall.size as [number, number]} />
          <wallpaperMaterial ref={materialRef} side={THREE.FrontSide} />
        </mesh>
      ))}
    </group>
  );
}
