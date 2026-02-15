import { useCameraStore } from '@/camera';
import { Text } from '@react-three/drei';
import type { GroupProps } from '@react-three/fiber';

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
  return (
    <group {...groupProps}>
      {/* Post-it note paper */}
      <mesh rotation={[0, 0, 0.05]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Hand-written text */}
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
        console.log('[LookBehindYouPostIt] Triggering look-behind mode');
        setMode('look-behind');
      }}
    />
  );
}
