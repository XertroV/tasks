import { forwardRef, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import type { GroupProps } from '@react-three/fiber';
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';

const BARREL_COLOR = '#E85D04';
const BARREL_TIP_COLOR = '#3A3A3A';
const GRIP_COLOR = '#1A1A1A';
const TRIGGER_GUARD_COLOR = '#333333';
const TRIGGER_COLOR = '#4A4A4A';
const CABLE_COLOR = '#0A0A0A';

export interface ZapperModelProps extends GroupProps {
  showCable?: boolean;
  cableEnd?: [number, number, number];
}

export const ZapperModel = forwardRef<Group, ZapperModelProps>(
  ({ showCable = true, cableEnd = [-0.3, -0.15, -0.8], ...groupProps }, ref) => {
    const triggerRef = useRef<Mesh>(null);
    const groupRef = useRef<Group>(null);

    const cableCurve = useMemo(() => {
      const start = new Vector3(0, -0.12, -0.08);
      const endVec = new Vector3(...cableEnd);
      const mid = new Vector3().lerpVectors(start, endVec, 0.5);
      mid.y -= 0.1;

      return new CatmullRomCurve3([start, mid, endVec]);
    }, [cableEnd]);

    const cableGeometry = useMemo(() => {
      return new TubeGeometry(cableCurve, 12, 0.004, 6, false);
    }, [cableCurve]);

    return (
      <group ref={ref} {...groupProps}>
        <group ref={groupRef}>
          {/* Barrel */}
          <mesh position={[0, 0, -0.09]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.018, 0.18, 12]} />
            <meshStandardMaterial color={BARREL_COLOR} roughness={0.4} metalness={0.2} />
          </mesh>

          {/* Barrel tip */}
          <mesh position={[0, 0, -0.185]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.019, 0.019, 0.01, 12]} />
            <meshStandardMaterial color={BARREL_TIP_COLOR} roughness={0.6} metalness={0.3} />
          </mesh>

          {/* Barrel sight */}
          <mesh position={[0, 0.012, -0.12]}>
            <boxGeometry args={[0.004, 0.006, 0.04]} />
            <meshStandardMaterial color={BARREL_COLOR} roughness={0.4} metalness={0.2} />
          </mesh>

          {/* Grip */}
          <group position={[0, -0.045, 0.02]} rotation={[0.4, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.025, 0.08, 0.03]} />
              <meshStandardMaterial color={GRIP_COLOR} roughness={0.8} />
            </mesh>
            {/* Grip ridges */}
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[0, 0.025 - i * 0.02, 0.016]}>
                <boxGeometry args={[0.025, 0.003, 0.002]} />
                <meshStandardMaterial color="#2A2A2A" roughness={0.9} />
              </mesh>
            ))}
          </group>

          {/* Trigger guard */}
          <mesh position={[0, -0.035, -0.02]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.02, 0.003, 8, 12, Math.PI]} />
            <meshStandardMaterial color={TRIGGER_GUARD_COLOR} roughness={0.7} metalness={0.3} />
          </mesh>

          {/* Trigger */}
          <mesh ref={triggerRef} position={[0, -0.038, -0.015]}>
            <boxGeometry args={[0.008, 0.015, 0.004]} />
            <meshStandardMaterial color={TRIGGER_COLOR} roughness={0.6} metalness={0.4} />
          </mesh>

          {/* Cable */}
          {showCable && (
            <mesh geometry={cableGeometry}>
              <meshStandardMaterial color={CABLE_COLOR} roughness={0.9} />
            </mesh>
          )}
        </group>
      </group>
    );
  }
);

ZapperModel.displayName = 'ZapperModel';

export function useTriggerRef() {
  return useRef<Mesh>(null);
}
