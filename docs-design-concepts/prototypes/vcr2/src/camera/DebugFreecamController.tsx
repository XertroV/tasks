import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Euler, Vector3 } from 'three';
import { useCameraStore } from './cameraStore';

const PITCH_LIMIT = Math.PI / 2 - 0.05;
const BASE_SPEED = 3.2;
const BOOST_SPEED = 7.5;

export function DebugFreecamController() {
  const { camera, gl } = useThree();
  const mode = useCameraStore((state) => state.mode);
  const enabled = mode === 'freecam';

  const keysRef = useRef(new Set<string>());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      keysRef.current.clear();
      if (document.pointerLockElement === gl.domElement) {
        document.exitPointerLock();
      }
      return;
    }

    const orientation = new Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yawRef.current = orientation.y;
    pitchRef.current = orientation.x;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      keysRef.current.add(event.key.toLowerCase());
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;

      yawRef.current -= event.movementX * 0.002;
      pitchRef.current -= event.movementY * 0.002;
      pitchRef.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitchRef.current));
    };

    const handleCanvasClick = () => {
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('click', handleCanvasClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('click', handleCanvasClick);
    };
  }, [enabled, camera, gl.domElement]);

  useFrame((_, delta) => {
    if (!enabled) return;

    camera.rotation.order = 'YXZ';
    camera.rotation.x = pitchRef.current;
    camera.rotation.y = yawRef.current;
    camera.rotation.z = 0;

    const keys = keysRef.current;
    const forward = new Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0)).normalize();
    const up = new Vector3(0, 1, 0);
    const move = new Vector3();

    if (keys.has('w')) move.add(forward);
    if (keys.has('s')) move.sub(forward);
    if (keys.has('d')) move.add(right);
    if (keys.has('a')) move.sub(right);
    if (keys.has(' ') || keys.has('e')) move.add(up);
    if (keys.has('control') || keys.has('q')) move.sub(up);

    if (move.lengthSq() > 0) {
      const speed = keys.has('shift') ? BOOST_SPEED : BASE_SPEED;
      camera.position.add(move.normalize().multiplyScalar(speed * delta));
    }
  });

  return null;
}
