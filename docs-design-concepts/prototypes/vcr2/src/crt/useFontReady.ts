import { useEffect, useState } from 'react';

const FONT_PATH = '/fonts/VT323-Regular.ttf';

let fontLoaded = false;
let fontLoading = false;
const fontReadyCallbacks: (() => void)[] = [];

export function useFontReady(): boolean {
  const [ready, setReady] = useState(fontLoaded);

  useEffect(() => {
    if (fontLoaded) {
      return;
    }

    const checkFont = () => {
      if (fontLoaded) {
        setReady(true);
        return;
      }

      document.fonts.ready.then(() => {
        const testFont = new FontFace('VT323', `url(${FONT_PATH})`);
        testFont
          .load()
          .then((loaded) => {
            document.fonts.add(loaded);
            fontLoaded = true;
            setReady(true);
            for (const cb of fontReadyCallbacks) {
              cb();
            }
          })
          .catch((err) => {
            console.warn('Font load failed, using fallback:', err);
            fontLoaded = true;
            setReady(true);
          });
      });
    };

    if (!fontLoading) {
      fontLoading = true;
      checkFont();
    } else {
      fontReadyCallbacks.push(() => setReady(true));
    }
  }, []);

  return ready;
}

export function getFontPath(): string {
  return FONT_PATH;
}
