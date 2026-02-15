import type { GroupProps } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Group, Intersection } from 'three';
import { useAimingContext } from './AimingProvider';

export interface ShootableTargetProps extends Omit<GroupProps, 'id'> {
  targetId: string;
  onShoot?: (intersection: Intersection) => void;
  onTarget?: () => void;
  onUntarget?: () => void;
  children: React.ReactNode;
}

export function ShootableTarget({
  targetId,
  onShoot,
  onTarget,
  onUntarget,
  children,
  ...groupProps
}: ShootableTargetProps) {
  const groupRef = useRef<Group>(null);
  const { registerTarget, unregisterTarget } = useAimingContext();

  useEffect(() => {
    if (!groupRef.current) return;

    const target = {
      id: targetId,
      object: groupRef.current,
      onShoot: onShoot
        ? (intersection: Intersection) => {
            onShoot(intersection);
          }
        : undefined,
      onTarget,
      onUntarget,
    };

    registerTarget(target);

    return () => {
      unregisterTarget(targetId);
    };
  }, [targetId, onShoot, onTarget, onUntarget, registerTarget, unregisterTarget]);

  return (
    <group ref={groupRef} {...groupProps}>
      {children}
    </group>
  );
}
