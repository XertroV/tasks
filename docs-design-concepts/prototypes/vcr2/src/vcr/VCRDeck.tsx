import { playButtonClick, playVcrTransport } from '@/audio';
import { ShootableTarget } from '@/lightgun';
import { Text } from '@react-three/drei';
import type { GroupProps } from '@react-three/fiber';
import { useMemo } from 'react';
import { useVCRStore } from './vcrStore';

const VCR_WIDTH = 0.42;
const VCR_HEIGHT = 0.1;
const VCR_DEPTH = 0.25;

const SLOT_WIDTH = 0.29;
const SLOT_HEIGHT = 0.026;
const SLOT_DEPTH = 0.035;

const BUTTON_WIDTH = 0.058;
const BUTTON_HEIGHT = 0.012;
const BUTTON_DEPTH = 0.028;
const BUTTON_GAP = 0.012;

const BUTTON_COUNT = 5;

export interface VCRDeckProps extends GroupProps {}

export function VCRDeck({ ...groupProps }: VCRDeckProps) {
  const displayText = useVCRStore((state) => state.displayText);

  const buttonOffsets = useMemo(() => {
    const totalWidth = BUTTON_COUNT * BUTTON_WIDTH + (BUTTON_COUNT - 1) * BUTTON_GAP;
    const startX = -totalWidth / 2 + BUTTON_WIDTH / 2;

    return Array.from(
      { length: BUTTON_COUNT },
      (_, index) => startX + index * (BUTTON_WIDTH + BUTTON_GAP)
    );
  }, []);

  return (
    <group {...groupProps}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[VCR_WIDTH, VCR_HEIGHT, VCR_DEPTH]} />
        <meshStandardMaterial color="#101010" metalness={0.12} roughness={0.78} />
      </mesh>

      <mesh position={[0, 0.008, VCR_DEPTH / 2 - 0.004]} castShadow>
        <boxGeometry args={[SLOT_WIDTH + 0.03, SLOT_HEIGHT + 0.018, 0.008]} />
        <meshStandardMaterial color="#222222" metalness={0.08} roughness={0.82} />
      </mesh>

      <mesh position={[0, 0.008, VCR_DEPTH / 2 - SLOT_DEPTH / 2 - 0.004]}>
        <boxGeometry args={[SLOT_WIDTH, SLOT_HEIGHT, SLOT_DEPTH]} />
        <meshStandardMaterial color="#050505" metalness={0} roughness={0.95} />
      </mesh>

      <mesh position={[0, -0.004, VCR_DEPTH / 2 - 0.008]}>
        <boxGeometry args={[0.18, 0.028, 0.01]} />
        <meshStandardMaterial
          color="#170b02"
          emissive="#7a3e10"
          emissiveIntensity={0.25}
          roughness={0.5}
        />
      </mesh>

      <Text
        position={[0, -0.004, VCR_DEPTH / 2 - 0.0015]}
        color="#ff9f2a"
        fontSize={0.024}
        maxWidth={0.16}
        anchorX="center"
        anchorY="middle"
        font="/fonts/VT323-Regular.ttf"
      >
        {displayText}
      </Text>

      {buttonOffsets.map((xOffset, index) => {
        const buttonActions: Record<number, { id: string; action: () => void }> = {
          0: {
            id: 'vcr-rew',
            action: () => {
              playButtonClick();
              playVcrTransport();
              useVCRStore.getState().rewind();
            },
          },
          1: {
            id: 'vcr-play',
            action: () => {
              playButtonClick();
              playVcrTransport();
              useVCRStore.getState().play();
            },
          },
          2: {
            id: 'vcr-stop',
            action: () => {
              playButtonClick();
              playVcrTransport();
              useVCRStore.getState().stop();
            },
          },
          3: {
            id: 'vcr-ff',
            action: () => {
              playButtonClick();
              playVcrTransport();
              useVCRStore.getState().fastForward();
            },
          },
          4: {
            id: 'vcr-eject',
            action: () => {
              playButtonClick();
              playVcrTransport();
              useVCRStore.getState().eject();
            },
          },
        };
        const { id, action } = buttonActions[index] ?? { id: `vcr-btn-${index}`, action: () => {} };

        return (
          <ShootableTarget key={xOffset} targetId={id} onShoot={action}>
            <mesh
              position={[
                xOffset,
                -VCR_HEIGHT / 2 + BUTTON_HEIGHT / 2 + 0.004,
                VCR_DEPTH / 2 - BUTTON_DEPTH / 2 - 0.01,
              ]}
              castShadow
            >
              <boxGeometry args={[BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_DEPTH]} />
              <meshStandardMaterial color="#1d1d1d" metalness={0.15} roughness={0.7} />
            </mesh>
          </ShootableTarget>
        );
      })}
    </group>
  );
}
