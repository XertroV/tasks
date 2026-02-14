import { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import {
  AimingSystem,
  type AimingTarget,
  type ShootResult,
  type CursorState,
} from './AimingSystem';

interface AimingContextValue {
  registerTarget: (target: AimingTarget) => void;
  unregisterTarget: (id: string) => void;
  shoot: () => ShootResult;
  cursorState: CursorState;
  currentTargetId: string | null;
}

const AimingContext = createContext<AimingContextValue | null>(null);

export interface AimingProviderProps {
  children: ReactNode;
  onShoot?: (result: ShootResult) => void;
}

export function AimingProvider({ children, onShoot }: AimingProviderProps) {
  const { camera, gl } = useThree();
  const systemRef = useRef<AimingSystem | null>(null);
  const [cursorState, setCursorState] = useState<CursorState>('idle');
  const [currentTargetId, setCurrentTargetId] = useState<string | null>(null);

  useEffect(() => {
    const system = new AimingSystem();
    systemRef.current = system;

    system.setOnCursorStateChange(setCursorState);

    const handleMouseMove = (event: MouseEvent) => {
      system.updateMouse(event, gl.domElement);
    };

    gl.domElement.addEventListener('mousemove', handleMouseMove);

    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
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
      };

      target.onUntarget = () => {
        setCurrentTargetId(null);
        if (originalOnUntarget) originalOnUntarget();
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
    if (onShoot) {
      onShoot(result);
    }
    return result;
  }, [onShoot]);

  const value: AimingContextValue = {
    registerTarget,
    unregisterTarget,
    shoot,
    cursorState,
    currentTargetId,
  };

  return <AimingContext.Provider value={value}>{children}</AimingContext.Provider>;
}

export function useAimingContext(): AimingContextValue {
  const context = useContext(AimingContext);
  if (!context) {
    throw new Error('useAimingContext must be used within AimingProvider');
  }
  return context;
}
