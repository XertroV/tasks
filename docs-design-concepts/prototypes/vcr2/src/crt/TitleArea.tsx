import { Text } from '@react-three/drei';
import type { GroupProps } from '@react-three/fiber';
import { Z_ORDER } from './OffscreenBackground';

const GREEN = '#33ff33';

export interface TitleAreaProps extends GroupProps {
  title: string;
}

export function TitleArea({ title, ...groupProps }: TitleAreaProps) {
  if (!title) {
    return null;
  }

  const truncatedTitle = title.length > 50 ? `${title.slice(0, 47)}...` : title;

  return (
    <group {...groupProps}>
      <Text
        position={[0, 0.9, Z_ORDER.content + 0.05]}
        color={GREEN}
        fontSize={0.06}
        maxWidth={1.8}
        anchorX="center"
        anchorY="middle"
        font="/fonts/VT323-Regular.ttf"
      >
        {truncatedTitle}
      </Text>

      <mesh position={[0, 0.78, Z_ORDER.content + 0.02]}>
        <planeGeometry args={[1.8, 0.005]} />
        <meshBasicMaterial color={GREEN} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
