import { Z_ORDER } from '@/crt/OffscreenBackground';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdditiveBlending, CanvasTexture } from 'three';
import type { CanvasTexture as CanvasTextureType } from 'three';
import { EntityOpacityController } from './EntityOpacityController';
import {
  corruptTimecode,
  generateEntityMessage,
  generateStaticFace,
  getChannelBleed,
} from './corruptedText';
import { useHorrorStore } from './horrorStore';

export interface EntityMessageData {
  text: string;
  timestamp: number;
  duration: number;
}

export interface ScreenEntityProps {
  position?: [number, number, number];
  showDebugFace?: boolean;
}

function createProceduralFaceTexture(intensity: number): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new CanvasTexture(document.createElement('canvas'));

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#080808';
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2, size * 0.35, size * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  const eyeY = size * 0.4;
  const eyeSpacing = size * 0.15;

  ctx.fillStyle = '#1a0000';
  ctx.beginPath();
  ctx.ellipse(size / 2 - eyeSpacing, eyeY, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(size / 2 + eyeSpacing, eyeY, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  if (intensity > 0.5) {
    ctx.fillStyle = '#3a0000';
    ctx.beginPath();
    ctx.arc(size / 2 - eyeSpacing, eyeY, size * 0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size / 2 + eyeSpacing, eyeY, size * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }

  if (intensity > 0.7) {
    ctx.strokeStyle = '#2a0000';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(size / 2 - eyeSpacing - 20, eyeY - 10 + i * 10);
      ctx.lineTo(size / 2 - eyeSpacing + 20, eyeY - 10 + i * 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size / 2 + eyeSpacing - 20, eyeY - 10 + i * 10);
      ctx.lineTo(size / 2 + eyeSpacing + 20, eyeY - 10 + i * 10);
      ctx.stroke();
    }
  }

  const mouthY = size * 0.65;
  ctx.fillStyle = '#0a0000';
  ctx.beginPath();
  ctx.ellipse(size / 2, mouthY, size * 0.1, size * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();

  const noiseAmount = Math.floor(intensity * 1000);
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < noiseAmount; i++) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    const idx = (y * size + x) * 4;
    const val = Math.random() > 0.5 ? 20 : 0;
    data[idx] = val;
    data[idx + 1] = 0;
    data[idx + 2] = 0;
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function ScreenEntity({
  position = [0, 0.1, -0.4],
  showDebugFace = false,
}: ScreenEntityProps) {
  const entityVisible = useHorrorStore((state) => state.entityVisible);
  const entityIntensity = useHorrorStore((state) => state.entityIntensity);
  const phase = useHorrorStore((state) => state.phase);
  const controllerRef = useRef<EntityOpacityController | null>(null);
  const [displayOpacity, setDisplayOpacity] = useState(0);
  const [currentMessage, setCurrentMessage] = useState<EntityMessageData | null>(null);
  const lastTimeRef = useRef(0);
  const faceTextureRef = useRef<CanvasTextureType | null>(null);
  const messageTimerRef = useRef<number>(0);

  useEffect(() => {
    if (!controllerRef.current) {
      controllerRef.current = new EntityOpacityController();
    }
  }, []);

  useEffect(() => {
    if (!controllerRef.current) return;

    if (entityVisible) {
      controllerRef.current.flash(entityIntensity);
      messageTimerRef.current = window.setTimeout(() => {
        setCurrentMessage({
          text: generateEntityMessage(entityIntensity),
          timestamp: Date.now(),
          duration: 3000 + Math.random() * 2000,
        });
      }, 500);
    } else {
      controllerRef.current.fadeOut();
      setCurrentMessage(null);
      clearTimeout(messageTimerRef.current);
    }

    return () => clearTimeout(messageTimerRef.current);
  }, [entityVisible, entityIntensity]);

  useEffect(() => {
    return () => {
      if (faceTextureRef.current) {
        faceTextureRef.current.dispose();
      }
    };
  }, []);

  useFrame(() => {
    if (!controllerRef.current) return;

    const now = performance.now() / 1000;
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    controllerRef.current.update(delta);
    const state = controllerRef.current.getState();
    setDisplayOpacity(state.opacity);

    if (currentMessage && Date.now() - currentMessage.timestamp > currentMessage.duration) {
      setCurrentMessage(null);
    }

    if (entityVisible && displayOpacity > 0.1) {
      if (!faceTextureRef.current || Math.random() < 0.01) {
        if (faceTextureRef.current) {
          faceTextureRef.current.dispose();
        }
        faceTextureRef.current = createProceduralFaceTexture(entityIntensity);
      }
    }
  });

  if (displayOpacity < 0.01 && !showDebugFace) return null;

  const opacity = showDebugFace ? Math.max(displayOpacity, 0.3) : displayOpacity;

  return (
    <group position={position}>
      {faceTextureRef.current && (
        <mesh position={[0, 0.1, Z_ORDER.entity]} scale={[0.4, 0.4, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={faceTextureRef.current}
            transparent
            opacity={opacity * 0.9}
            depthTest={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}

      {currentMessage && (
        <Text
          position={[0, -0.3, Z_ORDER.entity + 0.01]}
          color="#aa0000"
          fontSize={0.04}
          anchorX="center"
          anchorY="middle"
          font="/fonts/VT323-Regular.ttf"
          material-transparent
          material-opacity={opacity * 0.8}
        >
          {currentMessage.text}
        </Text>
      )}

      {phase !== 'DORMANT' && showDebugFace && (
        <AsciiFace opacity={opacity} intensity={entityIntensity} />
      )}
    </group>
  );
}

function AsciiFace({ opacity, intensity }: { opacity: number; intensity: number }) {
  const [faceRows, setFaceRows] = useState<string[]>([]);

  useFrame(() => {
    if (Math.random() < 0.1) {
      setFaceRows(generateStaticFace(intensity));
    }
  });

  return (
    <group position={[0, 0, Z_ORDER.entity + 0.02]}>
      {faceRows.map((row, rowIndex) => (
        <Text
          key={`face-${row.slice(0, 6)}-${rowIndex}`}
          position={[0, 0.25 - rowIndex * 0.04, 0]}
          color="#ff0000"
          fontSize={0.035}
          anchorX="center"
          anchorY="middle"
          font="/fonts/VT323-Regular.ttf"
          material-transparent
          material-opacity={opacity * 0.7}
        >
          {row}
        </Text>
      ))}
    </group>
  );
}

export function CorruptedTimecodeDisplay({
  timecode,
  intensity,
  position,
}: {
  timecode: string;
  intensity: number;
  position: [number, number, number];
}) {
  const [corruptedTimecode, setCorruptedTimecode] = useState(timecode);

  useFrame(() => {
    if (intensity > 0.3 && Math.random() < intensity * 0.2) {
      setCorruptedTimecode(corruptTimecode(timecode, intensity));
    } else {
      setCorruptedTimecode(timecode);
    }
  });

  return (
    <Text
      position={position}
      color="#ffaa00"
      fontSize={0.045}
      anchorX="right"
      anchorY="middle"
      font="/fonts/VT323-Regular.ttf"
    >
      {corruptedTimecode}
    </Text>
  );
}

export function ChannelBleedOverlay({ intensity }: { intensity: number }) {
  const channels = useMemo(() => getChannelBleed(intensity), [intensity]);

  if (channels.length === 0) return null;

  return (
    <group position={[0.7, 0.5, Z_ORDER.osd + 0.02]}>
      {channels.map((ch) => (
        <Text
          key={`channel-${ch}`}
          position={[0, -channels.indexOf(ch) * 0.05, 0]}
          color="#ffffff"
          fontSize={0.03}
          anchorX="right"
          anchorY="middle"
          font="/fonts/VT323-Regular.ttf"
          material-transparent
          material-opacity={intensity * 0.5}
        >
          {ch}
        </Text>
      ))}
    </group>
  );
}
