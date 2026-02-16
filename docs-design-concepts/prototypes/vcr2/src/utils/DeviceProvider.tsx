import {
  type DeviceCapabilities,
  detectDeviceCapabilities,
  getRecommendedSettings,
} from '@/utils/deviceCapabilities';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface DeviceContextValue {
  capabilities: DeviceCapabilities;
  settings: ReturnType<typeof getRecommendedSettings>;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function useDeviceCapabilities() {
  const ctx = useContext(DeviceContext);
  if (!ctx) {
    throw new Error('useDeviceCapabilities must be used within DeviceProvider');
  }
  return ctx;
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);

  useEffect(() => {
    const caps = detectDeviceCapabilities();
    setCapabilities(caps);
  }, []);

  const value = useMemo(() => {
    if (!capabilities) {
      return {
        capabilities: {
          hasWebGL2: true,
          isMobile: false,
          isLowEnd: false,
          maxTextureSize: 4096,
          estimatedGPU: 'medium' as const,
          touchCapable: false,
        },
        settings: getRecommendedSettings({
          hasWebGL2: true,
          isMobile: false,
          isLowEnd: false,
          maxTextureSize: 4096,
          estimatedGPU: 'medium',
          touchCapable: false,
        }),
      };
    }
    return {
      capabilities,
      settings: getRecommendedSettings(capabilities),
    };
  }, [capabilities]);

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function WebGL2Fallback() {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const caps = detectDeviceCapabilities();
    if (!caps.hasWebGL2) {
      setShowFallback(true);
    }
  }, []);

  if (!showFallback) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#33ff33',
        fontFamily: 'monospace',
        fontSize: 16,
        padding: 20,
        textAlign: 'center',
        zIndex: 99999,
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>WebGL2 Required</h1>
      <p style={{ maxWidth: 400, lineHeight: 1.6 }}>
        This experience requires WebGL2 support. Please try a different browser or device that
        supports modern web graphics.
      </p>
      <p style={{ marginTop: 20, opacity: 0.7, fontSize: 14 }}>
        Supported browsers: Chrome 56+, Firefox 51+, Safari 15+, Edge 79+
      </p>
    </div>
  );
}
