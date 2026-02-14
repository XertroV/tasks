import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { CameraRig } from './components/CameraRig'
import { EffectComposer, Noise, Vignette, Bloom } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

function App() {
    return (
        <Canvas
            dpr={[1, 2]}
            gl={{ antialias: false, pixelRatio: window.devicePixelRatio }}
        >
            <color attach="background" args={['#020202']} />

            {/* CameraRig controls the camera now */}
            <CameraRig />

            <Scene />

            <EffectComposer>
                <Noise opacity={0.15} blendFunction={BlendFunction.OVERLAY} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
                <Bloom luminanceThreshold={0.5} mipmapBlur intensity={0.5} radius={0.8} />
            </EffectComposer>
        </Canvas>
    )
}

export default App
