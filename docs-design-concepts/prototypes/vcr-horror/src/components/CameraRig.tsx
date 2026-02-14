import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import GUI from 'lil-gui'
import * as THREE from 'three'

export function CameraRig() {
    const { camera } = useThree()
    const guiRef = useRef<GUI | null>(null)

    // Configuration object for GUI to bind to
    const params = useRef({
        posX: 0,
        posY: 1.2,
        posZ: 1.5,
        fov: 60,
        lookAtX: 0,
        lookAtY: 1.0,
        lookAtZ: -1.0,
    })

    useEffect(() => {
        // Initialize GUI
        const gui = new GUI()
        guiRef.current = gui

        gui.add(params.current, 'posX', -5, 5).name('Cam Pos X')
        gui.add(params.current, 'posY', 0, 3).name('Cam Pos Y')
        gui.add(params.current, 'posZ', -2, 5).name('Cam Pos Z')
        gui.add(params.current, 'fov', 10, 120, 1).name('FOV').onChange((v: number) => {
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.fov = v
                camera.updateProjectionMatrix()
            }
        })

        const folderLook = gui.addFolder('Look At')
        folderLook.add(params.current, 'lookAtX', -5, 5)
        folderLook.add(params.current, 'lookAtY', 0, 3)
        folderLook.add(params.current, 'lookAtZ', -5, 5)

        return () => {
            gui.destroy()
        }
    }, [camera])

    useFrame(() => {
        const p = params.current

        // Only update position if changed? 
        // For this prototype, we just enforce the GUI state every frame to allow smooth dragging
        camera.position.set(p.posX, p.posY, p.posZ)

        // Changing position or lookAt requires re-orienting
        camera.lookAt(p.lookAtX, p.lookAtY, p.lookAtZ)
    })

    return null
}
