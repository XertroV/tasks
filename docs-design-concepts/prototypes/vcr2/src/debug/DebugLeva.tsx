import { useCameraStore } from '@/camera';
import { useEntityDebugControls, useHorrorDebugControls } from '@/horror';
import { EntityOpacityController } from '@/horror/EntityOpacityController';
import { Leva, folder, useControls } from 'leva';
import { useEffect, useRef, useState } from 'react';

const hiddenControl = {
  value: 0,
  render: () => false,
};

export function DebugLeva() {
  const [hidden, setHidden] = useState(false);
  const mode = useCameraStore((state) => state.mode);
  const setMode = useCameraStore((state) => state.setMode);
  const isTransitioning = useCameraStore((state) => state.isTransitioning);
  const entityControllerRef = useRef<EntityOpacityController | null>(null);

  if (!entityControllerRef.current) {
    entityControllerRef.current = new EntityOpacityController();
  }

  useHorrorDebugControls();
  useEntityDebugControls(entityControllerRef);

  useControls(() => ({
    VHS: folder({ _vhs: hiddenControl }, { collapsed: true }),
    CRT: folder({ _crt: hiddenControl }, { collapsed: true }),
    Room: folder({ _room: hiddenControl }, { collapsed: true }),
    Camera: folder(
      {
        mode: {
          options: ['normal', 'look-behind', 'freecam'] as const,
          value: mode,
          onChange: (v: 'normal' | 'look-behind' | 'freecam') => setMode(v),
        },
        transitioning: { value: isTransitioning, disabled: true },
      },
      { collapsed: true }
    ),
    Lightgun: folder({ _lightgun: hiddenControl }, { collapsed: true }),
    Audio: folder({ _audio: hiddenControl }, { collapsed: true }),
  }));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'F1') {
        return;
      }

      event.preventDefault();
      setHidden((currentHidden) => !currentHidden);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return <Leva collapsed hidden={hidden} oneLineLabels titleBar={{ drag: false, filter: false }} />;
}
