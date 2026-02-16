import { HorrorEntity } from '@/horror';
import { useContentStore } from '@/stores/contentStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { useFrame, useThree } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  LinearFilter,
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  Scene,
  WebGLRenderTarget,
} from 'three';
import { MenuView } from './MenuView';
import { PageView } from './PageView';

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
      depthBuffer: true, // Required for proper z-ordering of overlapping 2D UI elements
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

  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const contextValue = useMemo(
    () => ({
      renderTarget: renderTarget.current,
      scene: scene.current,
      camera: camera.current,
    }),
    [ready]
  );

  return (
    <ScreenRendererContext.Provider value={contextValue}>{children}</ScreenRendererContext.Provider>
  );
}

export function useRenderTargetTexture() {
  const { renderTarget } = useScreenRenderer();
  return renderTarget?.texture ?? null;
}

export interface ScreenContentProps {
  children?: ReactNode;
}

export function ScreenContent({ children }: ScreenContentProps) {
  const { scene } = useScreenRenderer();
  const currentPageId = useNavigationStore((state) => state.currentPageId);
  const currentPage = useContentStore((state) => state.currentPage);

  if (!scene) {
    return null;
  }

  const showMenu = currentPageId === null || currentPageId === 'menu';

  return (
    <primitive object={scene}>
      {children}
      {showMenu ? <MenuView /> : <PageView page={currentPage} />}
      <HorrorEntity />
    </primitive>
  );
}
