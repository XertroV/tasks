import { CRTMonitor } from './CRTMonitor'
import { Environment, Sparkles } from '@react-three/drei'
import { Lightgun } from './Lightgun'
import { Room } from './Room'
import { Desk } from './Desk'
import { useFrame } from '@react-three/fiber'
import { useVCRStore } from '../store/vcrStore'

export function Scene() {
    useFrame((_state, delta) => {
        useVCRStore.getState().tick(delta)
    })

    return (
        <>
            <color attach="background" args={['#010101']} />

            {/* Ambient lighting for the room */}
            <ambientLight intensity={0.15} color="#4444ff" />

            {/* Point light to simulate TV glow impacting the room */}
            <pointLight position={[0, 1.0, -0.5]} intensity={1.5} distance={4} color="#aaf" />

            {/* The Room Environment */}
            <Room />

            {/* Desk positioned at z = -1.0 */}
            <group position={[0, 0, -1.0]}>
                <Desk />
            </group>

            {/* Monitor - Sitting ON the desk */}
            {/* Desk surface is at y=0.75. Monitor base is at y=0 relative to its group? */}
            {/* CRTMonitor mesh starts at -0.1 relative to group center. Adjust here. */}
            {/* Raising it to sit on top of the 0.75 desk height */}
            <group position={[0, 0.75 + 0.1, -1.0]}>
                <CRTMonitor />
            </group>

            {/* Dust particles */}
            <Sparkles count={80} scale={6} size={1.5} speed={0.2} opacity={0.3} noise={0.1} />

            <Environment preset="night" />

            {/* The player's weapon */}
            <Lightgun />
        </>
    )
}
