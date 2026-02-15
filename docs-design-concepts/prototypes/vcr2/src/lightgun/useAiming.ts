import { useThree } from '@react-three/fiber';
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
      if (system.currentTarget) {
        setCurrentTargetId(system.currentTarget.id);
        if (options.onTarget) {
          options.onTarget(system.currentTarget.id);
        }
      }
    };

    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('click', handleClick);

    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('click', handleClick);
      systemRef.current = null;
    };
  }, [gl.domElement, options]);

  const registerTarget = useCallback(
    (target: AimingTarget) => {
      if (systemRef.current) {
        const originalOnTarget = target.onTarget;
        const originalOnUntarget = target.onUntarget;

        target.onTarget = () => {
          setCurrentTargetId(target.id);
          if (originalOnTarget) originalOnTarget();
          if (options.onTarget) options.onTarget(target.id);
        };

        target.onUntarget = () => {
          setCurrentTargetId(null);
          if (originalOnUntarget) originalOnUntarget();
          if (options.onUntarget) options.onUntarget(target.id);
        };

        systemRef.current.registerTarget(target);
      }
    },
    [options]
  );

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
    if (options.onShoot) {
      options.onShoot(result);
    }
    return result;
  }, [options]);

  useEffect(() => {
    const system = systemRef.current;
    if (!system) return;

    const updateFrame = () => {
      system.update(camera);
    };

    const frameId = requestAnimationFrame(function loop() {
      updateFrame();
      requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [camera]);

  return {
    registerTarget,
    unregisterTarget,
    shoot,
    cursorState,
    currentTargetId,
    aimingSystem: systemRef.current,
  };
}
