import { useCameraStore } from '@/camera';
import { useEntityDebugControls, useHorrorDebugControls } from '@/horror';
import { EntityOpacityController } from '@/horror/EntityOpacityController';
import { LevaPanel, LevaStoreProvider, folder, useControls, useCreateStore } from 'leva';
import { type ReactNode, useEffect, useRef, useState } from 'react';

const hiddenControl = {
  value: 0,
  render: () => false,
};

export function useSharedLevaStore() {
  return useCreateStore();
}

interface DebugLevaProps {
  store?: ReturnType<typeof useCreateStore>;
}

export function DebugLeva({ store }: DebugLevaProps) {
  const [hidden, setHidden] = useState(false);
  const mode = useCameraStore((state) => state.mode);
  const setMode = useCameraStore((state) => state.setMode);
  const isTransitioning = useCameraStore((state) => state.isTransitioning);
  const entityControllerRef = useRef<EntityOpacityController | null>(null);

  if (!entityControllerRef.current) {
    entityControllerRef.current = new EntityOpacityController();
  }

  useHorrorDebugControls(undefined, store);
  useEntityDebugControls(entityControllerRef, store);

  useControls(
    () => ({
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
    }),
    { store }
  );

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

  return (
    <LevaPanel
      store={store}
      collapsed
      hidden={hidden}
      oneLineLabels
      titleBar={{ drag: false, filter: false }}
    />
  );
}

export function LevaProvider({
  store,
  children,
}: { store?: ReturnType<typeof useCreateStore>; children: ReactNode }) {
  if (!store) return <>{children}</>;
  return <LevaStoreProvider store={store}>{children as React.ReactElement}</LevaStoreProvider>;
}
