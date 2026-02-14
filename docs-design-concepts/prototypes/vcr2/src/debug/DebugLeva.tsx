import { Leva, folder, useControls } from 'leva';
import { useEffect, useState } from 'react';

const hiddenControl = {
  value: 0,
  render: () => false,
};

export function DebugLeva() {
  const [hidden, setHidden] = useState(false);

  useControls(() => ({
    VHS: folder({ _vhs: hiddenControl }, { collapsed: true }),
    CRT: folder({ _crt: hiddenControl }, { collapsed: true }),
    Room: folder({ _room: hiddenControl }, { collapsed: true }),
    Camera: folder({ _camera: hiddenControl }, { collapsed: true }),
    Lightgun: folder({ _lightgun: hiddenControl }, { collapsed: true }),
    Horror: folder({ _horror: hiddenControl }, { collapsed: true }),
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
