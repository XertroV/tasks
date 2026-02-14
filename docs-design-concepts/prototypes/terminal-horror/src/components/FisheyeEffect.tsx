import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

const FisheyeShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0.3 },
    resolution: { value: new THREE.Vector2() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform vec2 resolution;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5, 0.5);

      // Calculate distance from center
      vec2 delta = uv - center;
      float dist = length(delta);

      // Apply barrel distortion (fisheye effect)
      float distortion = 1.0 + dist * dist * strength;
      vec2 distortedUV = center + delta * distortion;

      // Sample with distorted coordinates
      if (distortedUV.x < 0.0 || distortedUV.x > 1.0 || distortedUV.y < 0.0 || distortedUV.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      } else {
        gl_FragColor = texture2D(tDiffuse, distortedUV);
      }
    }
  `,
};

export function FisheyeEffect({ strength = 0.3 }: { strength?: number }) {
  const { gl, scene, camera, size } = useThree();

  const [renderTarget, composer] = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    const fisheyeMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(FisheyeShader.uniforms),
      vertexShader: FisheyeShader.vertexShader,
      fragmentShader: FisheyeShader.fragmentShader,
    });

    fisheyeMaterial.uniforms.strength.value = strength;
    fisheyeMaterial.uniforms.resolution.value.set(size.width, size.height);

    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      fisheyeMaterial
    );

    const postScene = new THREE.Scene();
    postScene.add(quad);

    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    return [target, { scene: postScene, camera: postCamera, material: fisheyeMaterial }];
  }, [size.width, size.height, strength]);

  useEffect(() => {
    return () => {
      renderTarget.dispose();
      composer.material.dispose();
    };
  }, [renderTarget, composer]);

  useFrame(() => {
    // Render scene to texture
    gl.setRenderTarget(renderTarget);
    gl.render(scene, camera);

    // Apply fisheye effect and render to screen
    composer.material.uniforms.tDiffuse.value = renderTarget.texture;
    gl.setRenderTarget(null);
    gl.render(composer.scene, composer.camera);
  }, 1);

  return null;
}
