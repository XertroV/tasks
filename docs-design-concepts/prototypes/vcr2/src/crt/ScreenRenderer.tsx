import { useFrame, useThree } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import {
  LinearFilter,
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  Scene,
  WebGLRenderTarget,
} from 'three';

interface ScreenRendererContextValue {
  renderTarget: WebGLRenderTarget | null;
  scene: Scene | null;
  camera: OrthographicCamera | null;
}

const ScreenRendererContext = createContext<ScreenRendererContextValue>({
  renderTarget: null,
  scene: null,
  camera: null,
});

export function useScreenRenderer() {
  return useContext(ScreenRendererContext);
}

export interface ScreenRendererProps {
  children?: ReactNode;
  width?: number;
  height?: number;
}

export function ScreenRenderer({ children, width = 1024, height = 768 }: ScreenRendererProps) {
  const gl = useThree((state) => state.gl);
  const renderTarget = useRef<WebGLRenderTarget | null>(null);
  const scene = useRef<Scene | null>(null);
  const camera = useRef<OrthographicCamera | null>(null);

  useEffect(() => {
    const target = new WebGLRenderTarget(width, height, {
      minFilter: LinearFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      stencilBuffer: false,
      depthBuffer: true,
    });

    const offscreenScene = new Scene();
    const offscreenCamera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    offscreenCamera.position.set(0, 0, 1);
    offscreenCamera.lookAt(0, 0, 0);

    renderTarget.current = target;
    scene.current = offscreenScene;
    camera.current = offscreenCamera;

    return () => {
      target.dispose();
    };
  }, [width, height]);

  useFrame(() => {
    if (!renderTarget.current || !scene.current || !camera.current) {
      return;
    }

    gl.setRenderTarget(renderTarget.current);
    gl.clear(true, true, true);
    gl.render(scene.current, camera.current);
    gl.setRenderTarget(null);
  }, 1);

  const contextValue = useMemo(
    () => ({
      renderTarget: renderTarget.current,
      scene: scene.current,
      camera: camera.current,
    }),
    []
  );

  return (
    <ScreenRendererContext.Provider value={contextValue}>{children}</ScreenRendererContext.Provider>
  );
}

export function useRenderTargetTexture() {
  const { renderTarget } = useScreenRenderer();
  return renderTarget?.texture ?? null;
}
