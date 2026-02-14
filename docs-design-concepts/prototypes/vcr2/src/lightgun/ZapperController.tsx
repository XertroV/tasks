import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Group } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ZapperModel } from './ZapperModel';

const WEAPON_OFFSET = { x: 0.25, y: -0.15, z: -0.3 };
const AIM_SWAY_X = 0.02;
const AIM_SWAY_Y = 0.01;
const RECOIL_DECAY = 0.05;
const RECOIL_Z = 0.02;
const RECOIL_Y = 0.01;

export interface ZapperControllerRef {
  triggerRecoil: () => void;
  getGroup: () => Group | null;
}

export interface ZapperControllerProps {
  showCable?: boolean;
}

export const ZapperController = forwardRef<ZapperControllerRef, ZapperControllerProps>(
  ({ showCable = true }, ref) => {
    const groupRef = useRef<Group>(null);
    const camera = useThree((state) => state.camera);
    const pointer = useThree((state) => state.pointer);
    const recoilRef = useRef(0);
    const aimSwayRef = useRef({ x: 0, y: 0 });

    useImperativeHandle(ref, () => ({
      triggerRecoil: () => {
        recoilRef.current = 1.0;
      },
      getGroup: () => groupRef.current,
    }));

    useEffect(() => {
      if (!groupRef.current) return;

      groupRef.current.traverse((child) => {
        if ('layers' in child) {
          child.layers.set(1);
        }
      });
    }, []);

    useFrame((_, delta) => {
      if (!groupRef.current) return;

      const weapon = groupRef.current;

      aimSwayRef.current.x += (pointer.x * AIM_SWAY_X - aimSwayRef.current.x) * 0.1;
      aimSwayRef.current.y += (pointer.y * AIM_SWAY_Y - aimSwayRef.current.y) * 0.1;

      const offset = new camera.constructor.prototype.constructor.Vector3(
        WEAPON_OFFSET.x + aimSwayRef.current.x * 0.5,
        WEAPON_OFFSET.y + aimSwayRef.current.y * 0.5,
        WEAPON_OFFSET.z
      );
      offset.applyQuaternion(camera.quaternion);
      weapon.position.copy(camera.position).add(offset);

      weapon.quaternion.copy(camera.quaternion);

      if (recoilRef.current > 0) {
        const recoilProgress = recoilRef.current;
        const recoilSin = Math.sin(recoilProgress * Math.PI);

        weapon.position.z += recoilSin * RECOIL_Z;
        weapon.position.y += recoilSin * RECOIL_Y * 0.5;

        weapon.rotation.x -= recoilSin * RECOIL_Y * 0.3;

        recoilRef.current -= RECOIL_DECAY * (delta * 60);
        if (recoilRef.current < 0) {
          recoilRef.current = 0;
        }
      }
    });

    return (
      <group ref={groupRef}>
        <ZapperModel showCable={showCable} />
      </group>
    );
  }
);

ZapperController.displayName = 'ZapperController';
