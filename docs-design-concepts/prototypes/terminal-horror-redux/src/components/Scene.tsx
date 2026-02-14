import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useControls, folder } from 'leva';
import { Suspense } from 'react';
import * as THREE from 'three';
import Room from './Room';
import Floor from './Floor';
import Ceiling from './Ceiling';
import FluorescentTube from './FluorescentTube';
import VCR from './VCR';
import CRTScreen from './CRTScreen';
import Lightgun from './Lightgun';
import VHSMonitor from './VHSMonitor';
import TheEntity from './TheEntity';

function SceneContent({ controls, crtControls }: { controls: any; crtControls: any }) {
  const { camera, scene } = useThree();
  
  // Update camera position and FOV reactively
  useFrame(() => {
    camera.position.set(controls.cameraX, controls.cameraY, controls.cameraZ);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = controls.fov;
      camera.updateProjectionMatrix();
    }
    
    // Update fog
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = controls.fogNear;
      scene.fog.far = controls.fogFar;
    }
  });
  
  return (
    <>
      <fog attach="fog" args={['#0A0A0A', controls.fogNear, controls.fogFar]} />
      
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.1}
        target={[0, 1, controls.tvZ]}
      />
      
      <ambientLight intensity={0.03} color="#1A1A2E" />
      
      {controls.roomLights && (
        <>
          <FluorescentTube position={[2, 2.6, -2]} flickering={false} intensity={4} />
          <FluorescentTube position={[-2, 2.6, 0]} flickering={true} intensity={3.5} />
        </>
      )}
      
      <Suspense fallback={null}>
        <Room />
        <Floor />
        <Ceiling />
        <VCR position={[0, 0.5, controls.tvZ]} />
        <CRTScreen 
          position={[0, controls.tvY, controls.tvZ]} 
          crtControls={crtControls}
        />
      </Suspense>
      
      <TheEntity />
    </>
  );
}

export default function Scene() {
  const controls = useControls('Scene', {
    camera: folder({
      cameraX: { value: 0, min: -10, max: 10, step: 0.1 },
      cameraY: { value: 1.6, min: 0, max: 3, step: 0.1, label: 'Camera Y' },
      cameraZ: { value: 3.5, min: -5, max: 10, step: 0.1, label: 'Camera Z' },
      fov: { value: 45, min: 20, max: 120, step: 1, label: 'FOV' },
    }),
    tv: folder({
      tvZ: { value: -3.5, min: -8, max: 0, step: 0.1, label: 'TV Z' },
      tvY: { value: 1.2, min: 0, max: 2, step: 0.1, label: 'TV Y' },
    }),
    lighting: folder({
      roomLights: { value: true, label: 'Room lights' },
      fogNear: { value: 4, min: 0, max: 20, step: 0.5, label: 'Fog near' },
      fogFar: { value: 15, min: 5, max: 30, step: 0.5, label: 'Fog far' },
    }),
  });

  const crtControls = useControls('CRT Effects', {
    barrelDistortion: { value: 0.12, min: 0, max: 0.5, step: 0.01, label: 'Barrel' },
    vignette: { value: 0.9, min: 0, max: 2, step: 0.1, label: 'Vignette' },
    noiseIntensity: { value: 0.25, min: 0, max: 1, step: 0.05, label: 'Noise' },
    chromaticAberration: { value: 2.0, min: 0, max: 5, step: 0.1, label: 'Chroma' },
    scanlines: { value: true, label: 'Scanlines' },
    paused: { value: true, label: 'Pause jitter' },
  });

  return (
    <div className="w-full h-screen bg-black">
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        gl={{ antialias: true }}
        camera={{ position: [0, 1.6, 3.5], fov: 45 }}
      >
        <color attach="background" args={['#050505']} />
        <SceneContent controls={controls} crtControls={crtControls} />
      </Canvas>
      
      <VHSMonitor />
      <Lightgun />
      
      <div className="absolute top-4 left-4 text-white/50 font-mono text-xs pointer-events-none select-none space-y-1">
        <div className="text-green-400/70">Terminal Horror Redux v0.2</div>
        <div className="text-white/30">VCR + Lightgun Prototype</div>
        <div className="mt-2 text-white/20">
          <div>Drag to orbit</div>
          <div>Scroll to zoom</div>
          <div>Right-drag to pan</div>
        </div>
      </div>
    </div>
  );
}
