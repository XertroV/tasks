import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import '../shaders/WallpaperMaterial';

declare module '@react-three/fiber' {
  interface ThreeElements {
    wallpaperMaterial: any;
  }
}

const ROOM_WIDTH = 12;
const ROOM_DEPTH = 16;
const ROOM_HEIGHT = 2.74;

export function Room() {
  const materialRef = useRef<any>(null);
  const materialRef2 = useRef<any>(null);
  const materialRef3 = useRef<any>(null);
  const materialRef4 = useRef<any>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (materialRef.current) materialRef.current.uTime = time;
    if (materialRef2.current) materialRef2.current.uTime = time;
    if (materialRef3.current) materialRef3.current.uTime = time;
    if (materialRef4.current) materialRef4.current.uTime = time;
  });

  return (
    <group position={[0, ROOM_HEIGHT / 2, 0]}>
      <mesh position={[0, 0, -ROOM_DEPTH / 2]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <wallpaperMaterial ref={materialRef} side={THREE.FrontSide} />
      </mesh>
      
      <mesh position={[0, 0, ROOM_DEPTH / 2]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <wallpaperMaterial ref={materialRef2} side={THREE.FrontSide} />
      </mesh>
      
      <mesh position={[-ROOM_WIDTH / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <wallpaperMaterial ref={materialRef3} side={THREE.FrontSide} />
      </mesh>
      
      <mesh position={[ROOM_WIDTH / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <wallpaperMaterial ref={materialRef4} side={THREE.FrontSide} />
      </mesh>
    </group>
  );
}
