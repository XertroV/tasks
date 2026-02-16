import { useBootStore } from '@/boot/bootStore';
import { useCameraStore } from '@/camera';
import { IS_DEBUG } from '@/debug/isDebug';
import { ShootableTarget } from '@/lightgun';
import { Text } from '@react-three/drei';
import type { GroupProps } from '@react-three/fiber';
import { useId } from 'react';

export interface PostItNoteProps extends GroupProps {
  text?: string;
  color?: string;
  width?: number;
  height?: number;
  onShoot?: () => void;
}

export function PostItNote({
  text = 'LOOK BEHIND YOU',
  color = '#ffff88',
  width = 0.08,
  height = 0.08,
  onShoot,
  ...groupProps
}: PostItNoteProps) {
  const id = useId();

  return (
    <group {...groupProps}>
      <ShootableTarget targetId={`postit-${id}`} onShoot={onShoot}>
        <mesh rotation={[0, 0, 0.05]}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      </ShootableTarget>

      <Text
        position={[0, 0, 0.001]}
        rotation={[0, 0, 0.05]}
        color="#333333"
        fontSize={0.012}
        maxWidth={width * 0.9}
        anchorX="center"
        anchorY="middle"
        font="/fonts/VT323-Regular.ttf"
      >
        {text}
      </Text>
    </group>
  );
}

export function LookBehindYouPostIt(props: Omit<PostItNoteProps, 'text' | 'onShoot'>) {
  const setMode = useCameraStore((state) => state.setMode);

  return (
    <PostItNote
      text="LOOK BEHIND YOU"
      {...props}
      onShoot={() => {
        if (IS_DEBUG) console.log('[LookBehindYouPostIt] Triggering look-behind mode');
        setMode('look-behind');
      }}
    />
  );
}

export function LookAtScreenPostIt(props: Omit<PostItNoteProps, 'text' | 'onShoot'>) {
  const mode = useCameraStore((state) => state.mode);
  const setMode = useCameraStore((state) => state.setMode);

  if (mode !== 'look-behind') {
    return null;
  }

  return (
    <PostItNote
      text="LOOK AT SCREEN"
      {...props}
      onShoot={() => {
        if (IS_DEBUG) console.log('[LookAtScreenPostIt] Returning to normal mode');
        setMode('normal');
      }}
    />
  );
}

export function SkipBootPostIt(props: Omit<PostItNoteProps, 'text' | 'onShoot'>) {
  const currentPhase = useBootStore((state) => state.currentPhase);
  const skip = useBootStore((state) => state.skip);

  if (currentPhase === 'READY') {
    return null;
  }

  return (
    <PostItNote
      text="SKIP"
      color="#ff8888"
      {...props}
      onShoot={() => {
        if (IS_DEBUG) console.log('[SkipBootPostIt] Skipping boot sequence');
        skip();
      }}
    />
  );
}
