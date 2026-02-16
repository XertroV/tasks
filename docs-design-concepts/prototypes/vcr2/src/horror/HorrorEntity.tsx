import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { EntityOpacityController } from './EntityOpacityController';
import { useHorrorStore } from './horrorStore';

export function HorrorEntity() {
  const entityVisible = useHorrorStore((state) => state.entityVisible);
  const entityIntensity = useHorrorStore((state) => state.entityIntensity);
  const controllerRef = useRef<EntityOpacityController | null>(null);
  const [displayOpacity, setDisplayOpacity] = useState(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!controllerRef.current) {
      controllerRef.current = new EntityOpacityController();
    }
  }, []);

  useEffect(() => {
    if (!controllerRef.current) return;

    if (entityVisible) {
      controllerRef.current.flash(entityIntensity);
    } else {
      controllerRef.current.fadeOut();
    }
  }, [entityVisible, entityIntensity]);

  useFrame(() => {
    if (!controllerRef.current) return;

    const now = performance.now() / 1000;
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    controllerRef.current.update(delta);
    const state = controllerRef.current.getState();
    setDisplayOpacity(state.opacity);
  });

  if (displayOpacity < 0.01) return null;

  return (
    <group position={[0, 0, -0.5]}>
      <mesh>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={displayOpacity * 0.3}
          depthTest={false}
        />
      </mesh>
      <EntitySilhouette opacity={displayOpacity} />
    </group>
  );
}

function EntitySilhouette({ opacity }: { opacity: number }) {
  return (
    <group position={[0, -0.1, -0.4]}>
      <mesh position={[0, 0.3, 0]}>
        <circleGeometry args={[0.2, 32]} />
        <meshBasicMaterial color="#0a0a0a" transparent opacity={opacity * 0.85} depthTest={false} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <planeGeometry args={[0.35, 0.5]} />
        <meshBasicMaterial color="#080808" transparent opacity={opacity * 0.75} depthTest={false} />
      </mesh>
      <mesh position={[-0.25, 0.35, 0]} rotation={[0, 0, 0.4]}>
        <planeGeometry args={[0.15, 0.25]} />
        <meshBasicMaterial color="#0a0a0a" transparent opacity={opacity * 0.7} depthTest={false} />
      </mesh>
      <mesh position={[0.25, 0.35, 0]} rotation={[0, 0, -0.4]}>
        <planeGeometry args={[0.15, 0.25]} />
        <meshBasicMaterial color="#0a0a0a" transparent opacity={opacity * 0.7} depthTest={false} />
      </mesh>
      <mesh position={[0, 0.32, 0.01]}>
        <circleGeometry args={[0.025, 16]} />
        <meshBasicMaterial color="#1a0000" transparent opacity={opacity * 0.9} depthTest={false} />
      </mesh>
      <mesh position={[0.06, 0.32, 0.01]}>
        <circleGeometry args={[0.025, 16]} />
        <meshBasicMaterial color="#1a0000" transparent opacity={opacity * 0.9} depthTest={false} />
      </mesh>
    </group>
  );
}
