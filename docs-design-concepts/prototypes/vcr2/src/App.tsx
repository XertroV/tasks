import { Canvas } from '@react-three/fiber';
import './App.css';
import { Room } from '@/room';
import type { RoomSurfaceMaterials } from '@/room/RoomGeometry';
import { useRef } from 'react';

function App() {
  const materialRefs = useRef<RoomSurfaceMaterials | null>(null);

  return (
    <div className="app">
      <Canvas camera={{ position: [0, 1.2, -2], fov: 60 }}>
        <Room
          onMaterialsReady={(materials) => {
            materialRefs.current = materials;
          }}
        />
      </Canvas>
    </div>
  );
}

export default App;
