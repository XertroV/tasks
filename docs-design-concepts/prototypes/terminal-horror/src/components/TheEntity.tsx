import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Cable = ({ start, end, thickness = 0.02, color = '#1a1a1a' }: { start: [number, number, number], end: [number, number, number], thickness?: number, color?: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const { position, rotation, length } = useMemo(() => {
      const vStart = new THREE.Vector3(...start);
      const vEnd = new THREE.Vector3(...end);
      const distance = vStart.distanceTo(vEnd);
      const pos = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);
      
      const matrix = new THREE.Matrix4();
      matrix.lookAt(vStart, vEnd, new THREE.Object3D().up);
      // Align cylinder (Y-axis) with lookAt direction (Z-axis) by rotating 90 deg on X
      const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);
      const adjustment = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      quaternion.multiply(adjustment);
      const rot = new THREE.Euler().setFromQuaternion(quaternion);

      return { position: pos, rotation: rot, length: distance };
  }, [start, end]);

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <cylinderGeometry args={[thickness, thickness, length, 8]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
};

export const TheEntity = () => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const eyesRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (coreRef.current) {
      // Pulse the core
      const scale = 1 + Math.sin(t * 3) * 0.1;
      coreRef.current.scale.set(scale, scale, scale);
    }
    if (groupRef.current) {
        // Slight hovering motion
        groupRef.current.position.y = Math.sin(t * 0.5) * 0.1;
        // Slowly rotate
        groupRef.current.rotation.y = t * 0.1;
    }
     if (eyesRef.current) {
        // Blink eyes randomly
        eyesRef.current.children.forEach((child: any) => {
             if (Math.random() > 0.98) {
                 child.visible = !child.visible;
             }
        });
    }
  });

  // Generate some random cables radiating from center
  const cables = useMemo(() => {
      const generated = [];
      for (let i = 0; i < 30; i++) {
        const phi = Math.acos( -1 + ( 2 * i ) / 30 );
        const theta = Math.sqrt( 30 * Math.PI ) * phi;

        const start: [number, number, number] = [0, 0, 0];
        const end: [number, number, number] = [
          1.5 * Math.cos(theta) * Math.sin(phi),
          1.5 * Math.sin(theta) * Math.sin(phi),
          1.5 * Math.cos(phi)
        ];
        
        // Add some noise to end positions
        end[0] += (Math.random() - 0.5) * 0.5;
        end[1] += (Math.random() - 0.5) * 0.5;
        end[2] += (Math.random() - 0.5) * 0.5;
        
        const color = Math.random() > 0.8 ? '#330000' : '#111111';
        const thick = 0.01 + Math.random() * 0.03;

        generated.push(<Cable key={i} start={start} end={end} thickness={thick} color={color} />);
      }
      return generated;
  }, []);

  return (
    <group ref={groupRef}>
      {/* The Central Core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial 
            color="#ff0000" 
            emissive="#550000" 
            emissiveIntensity={2} 
            roughness={0.4} 
            metalness={0.6}
            wireframe={true}
        />
        <pointLight intensity={1.5} color="#ff0000" distance={5} decay={2} />
      </mesh>

      {/* The Tangle of Cables */}
      <group>
        {cables}
      </group>

      {/* Eyes in the dark (simple glowing spheres) */}
      <group ref={eyesRef}>
          <mesh position={[0.3, 0.4, 0.4]}>
             <sphereGeometry args={[0.03, 16, 16]} />
             <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.2, 0.6, 0.3]}>
             <sphereGeometry args={[0.02, 16, 16]} />
             <meshBasicMaterial color="#ffffff" />
          </mesh>
           <mesh position={[0.1, -0.3, 0.5]}>
             <sphereGeometry args={[0.02, 16, 16]} />
             <meshBasicMaterial color="#ffffff" />
          </mesh>
           <mesh position={[-0.4, -0.1, 0.2]}>
             <sphereGeometry args={[0.03, 16, 16]} />
             <meshBasicMaterial color="#ffffff" />
          </mesh>
      </group>

    </group>
  );
};
