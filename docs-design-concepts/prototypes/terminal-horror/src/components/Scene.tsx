import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { TerminalScreen } from './TerminalScreen';
import { TheEntity } from './TheEntity';
import { Room } from './Room';
import { Floor } from './Floor';
import { Ceiling } from './Ceiling';
import { FluorescentTube } from './FluorescentTube';
import { playHorrorSound } from '../utils/audio';
import { FisheyeEffect } from './FisheyeEffect';

function TerminalModel() {
  return (
    <group position={[0, -0.3, -6]}>
      {/* Monitor Case */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.95, 1.1]} />
        <meshStandardMaterial color="#D4C4A8" roughness={0.8} metalness={0.1} />
      </mesh>
      
      {/* Monitor Bezel */}
      <mesh position={[0, 0.5, 0.52]}>
        <boxGeometry args={[1.0, 0.85, 0.02]} />
        <meshStandardMaterial color="#C0B0900" roughness={0.9} />
      </mesh>

      {/* Screen Background */}
      <mesh position={[0, 0.5, 0.54]}>
        <planeGeometry args={[0.85, 0.65]} />
        <meshBasicMaterial color="black" />
      </mesh>

      {/* Screen Content */}
      <Html 
        transform 
        occlude="blending"
        position={[0, 0.5, 0.55]} 
        scale={0.1} 
        style={{ 
          width: '800px', 
          height: '600px', 
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        <TerminalScreen />
      </Html>

      {/* Monitor Stand */}
      <mesh position={[0, -0.1, 0]} castShadow>
        <boxGeometry args={[0.3, 0.2, 0.25]} />
        <meshStandardMaterial color="#C0B090" roughness={0.8} />
      </mesh>
    </group>
  );
}

function HorrorEvent({ active }: { active: boolean }) {
  const [showMonster, setShowMonster] = useState(false);
  const audioPlayed = useRef(false);

  useEffect(() => {
    if (active && !audioPlayed.current) {
      const timer = setTimeout(() => {
        setShowMonster(true);
        playHorrorSound();
        audioPlayed.current = true;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [active]);
  
  return showMonster ? (
    <group position={[0, 1.2, 4]} rotation={[0, Math.PI, 0]}>
       <group position={[0, 0, 0]}>
          <TheEntity />
       </group>
       
       <Text 
         position={[0, -0.5, 0]} 
         fontSize={0.3} 
         color="#ff0000"
         anchorX="center"
         anchorY="middle"
         font={undefined}
       >
         DON'T LOOK BACK
       </Text>
    </group>
  ) : null;
}

function CameraController({ trigger }: { trigger: boolean }) {
  useFrame(({ camera }) => {
    if (trigger) {
       const qEnd = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
       camera.quaternion.slerp(qEnd, 0.04);
    }
  });
  return null;
}

export default function Scene() {
  const [scared, setScared] = useState(false);

  useEffect(() => {
    const SCARE_WINDOW_MIN = 18000;
    const SCARE_WINDOW_MAX = 28000;
    const scareTime = SCARE_WINDOW_MIN + Math.random() * (SCARE_WINDOW_MAX - SCARE_WINDOW_MIN);
    const timer = setTimeout(() => {
      setScared(true);
    }, scareTime);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-screen bg-black">
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        gl={{ antialias: true }}
        camera={{ position: [0, 1.4, 4], fov: 75 }}
      >
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#0A0A0A', 5, 18]} />
        
        <PerspectiveCamera makeDefault position={[0, 1.4, 4]} fov={75} />
        <CameraController trigger={scared} />

        <ambientLight intensity={0.03} color="#1A1A2E" />
        
        {/* Main fluorescent (stable) - above terminal area */}
        <FluorescentTube 
          position={[3, 2.6, -5]} 
          flickering={false} 
          intensity={4}
        />
        
        {/* Second fluorescent (flickering) - opposite corner */}
        <FluorescentTube 
          position={[-3, 2.6, 3]} 
          flickering={true} 
          intensity={3.5}
        />

        {/* Screen glow */}
        <pointLight 
          position={[0, 1, -5.5]} 
          intensity={0.6} 
          distance={3} 
          decay={2} 
          color="#33ff33" 
        />

        {/* Room structure */}
        <Room />
        <Floor />
        <Ceiling />

        {/* Terminal */}
        <TerminalModel />
        
        {/* Horror event */}
        <HorrorEvent active={scared} />

        <FisheyeEffect strength={0.15} />
      </Canvas>
      
      <div className="absolute top-4 left-4 text-white/30 font-mono text-sm pointer-events-none select-none">
        Prototype: Terminal Horror v0.2 - Phase 1
      </div>
    </div>
  );
}
