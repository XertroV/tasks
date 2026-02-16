import { useCameraStore } from '@/camera';
import { useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Group } from 'three';
import { ZapperModel } from './ZapperModel';

const DEFAULT_OFFSET = { x: 0.25, y: -0.15, z: -0.3 };
const AIM_SWAY_X = 0.02;
const AIM_SWAY_Y = 0.01;
const RECOIL_DECAY = 0.05;
const DEFAULT_RECOIL_Z = 0.02;
const DEFAULT_RECOIL_Y = 0.01;
const MUZZLE_FLASH_DECAY = 0.15;
const DEFAULT_MUZZLE_FLASH_INTENSITY = 3.0;

export interface ZapperControllerRef {
  triggerRecoil: () => void;
  triggerMuzzleFlash: () => void;
  getGroup: () => Group | null;
  isConstrained: () => boolean;
}

export interface ZapperControllerProps {
  showCable?: boolean;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
  recoilStrength?: number;
  muzzleFlashIntensity?: number;
}

export const ZapperController = forwardRef<ZapperControllerRef, ZapperControllerProps>(
  (
    {
      showCable = true,
      scale = 1,
      offsetX = DEFAULT_OFFSET.x,
      offsetY = DEFAULT_OFFSET.y,
      offsetZ = DEFAULT_OFFSET.z,
      recoilStrength = 1,
      muzzleFlashIntensity = 1,
    },
    ref
  ) => {
    const groupRef = useRef<Group>(null);
    const camera = useThree((state) => state.camera);
    const pointer = useThree((state) => state.pointer);
    const recoilRef = useRef(0);
    const muzzleFlashRef = useRef(0);
    const aimSwayRef = useRef({ x: 0, y: 0 });
    const cameraMode = useCameraStore((state) => state.mode);

    const isConstrained = () => cameraMode === 'look-behind';

    useImperativeHandle(ref, () => ({
      triggerRecoil: () => {
        recoilRef.current = 1.0;
      },
      triggerMuzzleFlash: () => {
        muzzleFlashRef.current = 1.0;
      },
      getGroup: () => groupRef.current,
      isConstrained,
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

      const constrained = isConstrained();
      const swayMultiplier = constrained ? 0.3 : 1;

      aimSwayRef.current.x +=
        (pointer.x * AIM_SWAY_X * swayMultiplier - aimSwayRef.current.x) * 0.1;
      aimSwayRef.current.y +=
        (pointer.y * AIM_SWAY_Y * swayMultiplier - aimSwayRef.current.y) * 0.1;

      const offset = new camera.constructor.prototype.constructor.Vector3(
        offsetX + aimSwayRef.current.x * 0.5,
        offsetY + aimSwayRef.current.y * 0.5,
        offsetZ
      );
      offset.applyQuaternion(camera.quaternion);
      weapon.position.copy(camera.position).add(offset);

      weapon.quaternion.copy(camera.quaternion);

      if (recoilRef.current > 0) {
        const recoilProgress = recoilRef.current;
        const recoilSin = Math.sin(recoilProgress * Math.PI);
        const recoilZ = DEFAULT_RECOIL_Z * recoilStrength;
        const recoilY = DEFAULT_RECOIL_Y * recoilStrength;

        weapon.position.z += recoilSin * recoilZ;
        weapon.position.y += recoilSin * recoilY * 0.5;

        weapon.rotation.x -= recoilSin * recoilY * 0.3;

        recoilRef.current -= RECOIL_DECAY * (delta * 60);
        if (recoilRef.current < 0) {
          recoilRef.current = 0;
        }
      }

      if (muzzleFlashRef.current > 0) {
        muzzleFlashRef.current -= MUZZLE_FLASH_DECAY * (delta * 60);
        if (muzzleFlashRef.current < 0) {
          muzzleFlashRef.current = 0;
        }
      }
    });

    return (
      <group ref={groupRef} scale={scale}>
        <ZapperModel showCable={showCable} />
        <pointLight
          position={[0, 0, -0.19]}
          color="#ffff00"
          intensity={muzzleFlashRef.current * DEFAULT_MUZZLE_FLASH_INTENSITY * muzzleFlashIntensity}
          distance={1}
          decay={2}
        />
      </group>
    );
  }
);

ZapperController.displayName = 'ZapperController';
