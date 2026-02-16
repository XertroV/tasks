import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AimingSystem,
  type AimingTarget,
  type CursorState,
  type ShootResult,
} from './AimingSystem';

export interface UseAimingOptions {
  onTarget?: (targetId: string) => void;
  onUntarget?: (targetId: string) => void;
  onShoot?: (result: ShootResult) => void;
}

export interface UseAimingReturn {
  registerTarget: (target: AimingTarget) => void;
  unregisterTarget: (id: string) => void;
  shoot: () => ShootResult;
  cursorState: CursorState;
  currentTargetId: string | null;
  aimingSystem: AimingSystem | null;
}

export function useAiming(options: UseAimingOptions = {}): UseAimingReturn {
  const { camera, gl } = useThree();
  const systemRef = useRef<AimingSystem | null>(null);
  const [cursorState, setCursorState] = useState<CursorState>('idle');
  const [currentTargetId, setCurrentTargetId] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const system = new AimingSystem();
    systemRef.current = system;

    system.setOnCursorStateChange((state) => {
      setCursorState(state);
    });

    const handleMouseMove = (event: MouseEvent) => {
      system.updateMouse(event, gl.domElement);
    };

    const handleClick = () => {
      const result = system.shoot();
      if (result.hit && optionsRef.current.onTarget) {
        setCurrentTargetId(result.targetId ?? null);
        optionsRef.current.onTarget(result.targetId ?? '');
      }
      if (optionsRef.current.onShoot) {
        optionsRef.current.onShoot(result);
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        system.updateTouch(event.touches[0], gl.domElement);
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      event.preventDefault();
      const result = system.shoot();
      if (result.hit && optionsRef.current.onTarget) {
        setCurrentTargetId(result.targetId ?? null);
        optionsRef.current.onTarget(result.targetId ?? '');
      }
      if (optionsRef.current.onShoot) {
        optionsRef.current.onShoot(result);
      }
    };

    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('click', handleClick);
    gl.domElement.addEventListener('touchmove', handleTouchMove, { passive: true });
    gl.domElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('click', handleClick);
      gl.domElement.removeEventListener('touchmove', handleTouchMove);
      gl.domElement.removeEventListener('touchend', handleTouchEnd);
      systemRef.current = null;
    };
  }, [gl.domElement]);

  useFrame(() => {
    if (systemRef.current) {
      systemRef.current.update(camera);
    }
  });

  const registerTarget = useCallback((target: AimingTarget) => {
    if (systemRef.current) {
      const originalOnTarget = target.onTarget;
      const originalOnUntarget = target.onUntarget;

      target.onTarget = () => {
        setCurrentTargetId(target.id);
        if (originalOnTarget) originalOnTarget();
        if (optionsRef.current.onTarget) optionsRef.current.onTarget(target.id);
      };

      target.onUntarget = () => {
        setCurrentTargetId(null);
        if (originalOnUntarget) originalOnUntarget();
        if (optionsRef.current.onUntarget) optionsRef.current.onUntarget(target.id);
      };

      systemRef.current.registerTarget(target);
    }
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    if (systemRef.current) {
      systemRef.current.unregisterTarget(id);
    }
  }, []);

  const shoot = useCallback((): ShootResult => {
    if (!systemRef.current) {
      return { hit: false };
    }

    const result = systemRef.current.shoot();
    if (optionsRef.current.onShoot) {
      optionsRef.current.onShoot(result);
    }
    return result;
  }, []);

  return {
    registerTarget,
    unregisterTarget,
    shoot,
    cursorState,
    currentTargetId,
    aimingSystem: systemRef.current,
  };
}
