import { useThree, useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useVCRStore } from '../store/vcrStore'
import { Zapper } from './Zapper'

// Layer constants
const LAYER_DEFAULT = 0
const LAYER_GUN = 1

export function Lightgun() {
    const { camera, scene, pointer } = useThree()
    const raycaster = useRef(new THREE.Raycaster())
    const gunGroup = useRef<THREE.Group>(null)
    const laserRef = useRef<THREE.Mesh>(null)
    const dotRef = useRef<THREE.Mesh>(null)

    useEffect(() => {
        camera.layers.enable(LAYER_GUN)
        raycaster.current.layers.set(LAYER_DEFAULT)

        if (gunGroup.current) {
            gunGroup.current.traverse((obj) => {
                obj.layers.set(LAYER_GUN)
            })
        }
    }, [camera])

    // Track mouse with gun
    useFrame((state) => {
        if (gunGroup.current) {
            const camPos = camera.position.clone()
            const camQuat = camera.quaternion.clone()

            // Hand offset
            const handOffset = new THREE.Vector3(0.3, -0.3, -0.5)
            handOffset.x += state.pointer.x * 0.1
            handOffset.y += state.pointer.y * 0.1
            handOffset.applyQuaternion(camQuat)
            const targetPos = camPos.add(handOffset)

            gunGroup.current.position.lerp(targetPos, 0.2)

            // Aiming Logic
            raycaster.current.setFromCamera(state.pointer, camera)
            const aimIntersects = raycaster.current.intersectObjects(scene.children, true)

            let aimPoint
            if (aimIntersects.length > 0) {
                aimPoint = aimIntersects[0].point
            } else {
                // Fallback
                const targetZ = -1.0
                const dirZ = raycaster.current.ray.direction.z
                const distance = dirZ !== 0 ? (targetZ - camera.position.z) / dirZ : 5
                aimPoint = camera.position.clone().add(raycaster.current.ray.direction.multiplyScalar(distance))
            }

            // The Gun Group looks at the target.
            // Standard: -Z is local forward. 
            // If the Zapper model is built such that "Forward" is +Z or something else, we rotate the CHILD mesh.
            // Assuming Zapper faces -Z by default (barrel at -0.12).
            // If user says "it's backwards", maybe they see the back of the gun (handle)?
            // A rotation of Y=PI on the CHILD will flip it locally.

            gunGroup.current.lookAt(aimPoint)

            // --- Update Laser Visuals (Cylinder Child) ---
            // Calculate distance from Gun to AimPoint
            const gunPos = gunGroup.current.position
            const distance = gunPos.distanceTo(aimPoint)

            if (laserRef.current) {
                // The laser is a child of the group also.
                // If we flipped the Zapper model, we must flip the Laser too OR just position it correctly relative to Group Axis.
                // Group Axis -Z points to target.
                // So Laser should be along -Z.

                // Cylinder default: Y-up.
                // Rotate X -PI/2 -> Points along +Z.
                // Wait, no. points along -Z?
                // Cylinder vertical: Top is +Y, Bottom is -Y.
                // Rotate X -90deg (-PI/2):
                // Top (+Y) becomes +Z. Bottom (-Y) becomes -Z.
                // So it points along Z axis.

                // We want it to go from 0 to -distance.
                // So we need clear understanding of rotation.

                // Let's rely on standard: 
                // Rotation X: Math.PI / 2 -> Top points to -Z?
                // Let's try Rotation X: Math.PI / 2.

                laserRef.current.rotation.set(Math.PI / 2, 0, 0)

                laserRef.current.scale.set(1, distance, 1)
                // Center of cylinder is at 0. So it goes from +dist/2 to -dist/2 on local Z (after rotation).
                // We want it to start at 0 and go to -distance.
                // Center should be at -distance/2.
                laserRef.current.position.set(0, 0, -distance / 2)
            }

            // --- Update Hit Dot ---
            if (dotRef.current) {
                dotRef.current.position.copy(aimPoint)
                dotRef.current.visible = true
            }
        }
    })

    useEffect(() => {
        const handleClick = () => shoot()
        window.addEventListener('click', handleClick)
        return () => window.removeEventListener('click', handleClick)
    }, [])

    const shoot = () => {
        useVCRStore.getState().triggerScreenFlash()

        // Shoot Logic
        raycaster.current.setFromCamera(pointer, camera)
        const intersects = raycaster.current.intersectObjects(scene.children, true)

        if (intersects.length > 0) {
            const hitObject = intersects[0].object
            if (hitObject.name === 'CRTScreen') {
                useVCRStore.getState().seek(useVCRStore.getState().currentTime + 5)
            }
        }
    }

    return (
        <>
            <group ref={gunGroup}>
                {/* Inner group for model rotation correction */}
                {/* If the gun looked "backwards", rotating it PI around Y prevents staring at the handle? */}
                <group rotation={[0, Math.PI, 0]}>
                    <Zapper />
                </group>

                {/* Laser Mesh */}
                {/* Independent of Zapper model rotation, depends on GunGroup Axis (-Z) */}
                <mesh
                    ref={laserRef}
                    layers={LAYER_GUN} // Ignore raycast
                >
                    <cylinderGeometry args={[0.002, 0.002, 1, 8]} />
                    <meshBasicMaterial color="red" opacity={0.6} transparent />
                </mesh>
            </group>

            <mesh ref={dotRef} layers={LAYER_GUN}>
                <sphereGeometry args={[0.02, 16, 16]} />
                <meshBasicMaterial color="red" />
            </mesh>
        </>
    )
}
