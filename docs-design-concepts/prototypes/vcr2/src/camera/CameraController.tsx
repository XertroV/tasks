import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import type { OrthographicCamera, PerspectiveCamera } from 'three';
import { CAMERA_CONFIG, getCameraPosition, getCameraTarget, useCameraStore } from './cameraStore';

export function CameraController() {
  const { camera } = useThree();
  const mode = useCameraStore((state) => state.mode);
  const horrorOverrides = useCameraStore((state) => state.horrorOverrides);
  const isTransitioning = useCameraStore((state) => state.isTransitioning);

  const targetPositionRef = useRef(new Vector3());
  const targetLookAtRef = useRef(new Vector3());
  const breathTimeRef = useRef(0);

  useEffect(() => {
    if (camera && 'fov' in camera) {
      const perspCam = camera as PerspectiveCamera;
      perspCam.fov = CAMERA_CONFIG.fov;
      perspCam.near = CAMERA_CONFIG.near;
      perspCam.far = CAMERA_CONFIG.far;
      perspCam.updateProjectionMatrix();
    }
  }, [camera]);

  useEffect(() => {
    targetPositionRef.current.copy(getCameraPosition(mode));
    targetLookAtRef.current.copy(getCameraTarget(mode));
  }, [mode]);

  useFrame((_, delta) => {
    if (!camera) return;

    if ('isOrthographicCamera' in camera && (camera as OrthographicCamera).isOrthographicCamera) {
      return;
    }

    breathTimeRef.current += delta;

    const basePos = targetPositionRef.current.clone();
    const baseLook = targetLookAtRef.current.clone();

    const breathing = CAMERA_CONFIG.breathing;
    const t = breathTimeRef.current;
    const breathOffset =
      Math.sin(t * 0.2 * Math.PI * 2) * breathing.amplitude * 0.5 +
      Math.sin(t * 0.33 * Math.PI * 2) * breathing.amplitude * 0.3 +
      Math.sin(t * 0.5 * Math.PI * 2) * breathing.amplitude * 0.2;
    const rotationOffset =
      Math.sin(t * 0.15 * Math.PI * 2) * breathing.rotationAmplitude * 0.6 +
      Math.sin(t * 0.27 * Math.PI * 2) * breathing.rotationAmplitude * 0.4;

    const targetPos = basePos.clone();
    const targetLook = baseLook.clone();

    targetPos.y += breathOffset;

    if (horrorOverrides) {
      if (horrorOverrides.shakeIntensity > 0) {
        const shake = horrorOverrides.shakeIntensity * 0.01;
        targetPos.x += (Math.random() - 0.5) * shake;
        targetPos.y += (Math.random() - 0.5) * shake;
      }

      if (horrorOverrides.driftIntensity > 0) {
        const drift = Math.sin(breathTimeRef.current * 0.3) * horrorOverrides.driftIntensity * 0.02;
        targetPos.x += drift;
      }

      if (horrorOverrides.zoomIntensity > 0) {
        const zoom = horrorOverrides.zoomIntensity * 0.5;
        targetPos.z += zoom;
      }

      targetLook.add(horrorOverrides.targetOffset);
    }

    const lerpFactor = isTransitioning ? 0.05 : 0.1;
    camera.position.lerp(targetPos, lerpFactor);

    const currentLookAt = new Vector3();
    camera.getWorldDirection(currentLookAt);
    currentLookAt.add(camera.position);

    currentLookAt.lerp(targetLook, lerpFactor);
    camera.lookAt(targetLook);

    if (rotationOffset !== 0) {
      camera.rotation.z += rotationOffset;
    }
  });

  return null;
}
