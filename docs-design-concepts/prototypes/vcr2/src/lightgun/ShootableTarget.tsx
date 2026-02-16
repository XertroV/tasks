import { useFrame } from '@react-three/fiber';
import type { GroupProps } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Color, Group, Intersection, Material, Mesh } from 'three';
import { useAimingContext } from './AimingProvider';

interface StoredMaterial {
  emissiveColor: Color | null;
  emissiveIntensity: number;
}

export interface ShootableTargetProps extends Omit<GroupProps, 'id'> {
  targetId: string;
  onShoot?: (intersection: Intersection) => void;
  onTarget?: () => void;
  onUntarget?: () => void;
  highlightColor?: string;
  highlightIntensity?: number;
  liftOnTarget?: number;
  children: React.ReactNode;
}

export function ShootableTarget({
  targetId,
  onShoot,
  onTarget,
  onUntarget,
  highlightColor = '#00ffff',
  highlightIntensity = 0.3,
  liftOnTarget = 0.005,
  children,
  ...groupProps
}: ShootableTargetProps) {
  const groupRef = useRef<Group>(null);
  const { registerTarget, unregisterTarget, currentTargetId } = useAimingContext();
  const originalMaterialsRef = useRef<Map<Mesh, StoredMaterial>>(new Map());
  const originalPositionRef = useRef<number | null>(null);
  const currentLiftRef = useRef(0);
  const onTargetRef = useRef(onTarget);
  const onUntargetRef = useRef(onUntarget);
  const onShootRef = useRef(onShoot);
  onTargetRef.current = onTarget;
  onUntargetRef.current = onUntarget;
  onShootRef.current = onShoot;

  const isCurrentlyTargeted = currentTargetId === targetId;

  useEffect(() => {
    if (!groupRef.current) return;

    const target = {
      id: targetId,
      object: groupRef.current,
      onShoot: onShootRef.current
        ? (intersection: Intersection) => {
            if (onShootRef.current) onShootRef.current(intersection);
          }
        : undefined,
      onTarget: () => {
        if (onTargetRef.current) onTargetRef.current();
      },
      onUntarget: () => {
        if (onUntargetRef.current) onUntargetRef.current();
      },
    };

    registerTarget(target);

    return () => {
      unregisterTarget(targetId);
    };
  }, [targetId, registerTarget, unregisterTarget]);

  useEffect(() => {
    if (!groupRef.current) return;

    if (isCurrentlyTargeted && originalMaterialsRef.current.size === 0) {
      groupRef.current.traverse((child) => {
        if ((child as Mesh).isMesh) {
          const mesh = child as Mesh;
          const material = mesh.material as Material & {
            emissive?: Color;
            emissiveIntensity?: number;
          };
          if (material.emissive !== undefined) {
            originalMaterialsRef.current.set(mesh, {
              emissiveColor: material.emissive.clone(),
              emissiveIntensity: material.emissiveIntensity ?? 0,
            });
          }
        }
      });
    }
  }, [isCurrentlyTargeted]);

  useEffect(() => {
    if (!groupRef.current) return;

    originalMaterialsRef.current.forEach((original, mesh) => {
      const material = mesh.material as Material & {
        emissive?: Color;
        emissiveIntensity?: number;
      };

      if (isCurrentlyTargeted) {
        if (material.emissive && typeof material.emissive.set === 'function') {
          material.emissive.set(highlightColor);
        }
        material.emissiveIntensity = highlightIntensity;
      } else {
        if (material.emissive && original.emissiveColor) {
          material.emissive.copy(original.emissiveColor);
        }
        material.emissiveIntensity = original.emissiveIntensity;
      }
    });
  }, [isCurrentlyTargeted, highlightColor, highlightIntensity]);

  useFrame((_, delta) => {
    if (!groupRef.current || liftOnTarget <= 0) return;

    const targetLift = isCurrentlyTargeted ? liftOnTarget : 0;
    currentLiftRef.current += (targetLift - currentLiftRef.current) * Math.min(1, delta * 15);

    if (originalPositionRef.current === null) {
      originalPositionRef.current = groupRef.current.position.z;
    }

    if (Math.abs(currentLiftRef.current) > 0.0001) {
      groupRef.current.position.z = (originalPositionRef.current ?? 0) + currentLiftRef.current;
    }
  });

  return (
    <group ref={groupRef} {...groupProps}>
      {children}
    </group>
  );
}
