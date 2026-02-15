export interface DeviceCapabilities {
  hasWebGL2: boolean;
  isMobile: boolean;
  isLowEnd: boolean;
  maxTextureSize: number;
  estimatedGPU: 'high' | 'medium' | 'low';
  touchCapable: boolean;
}

function detectMobile(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUA = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768;
  return isMobileUA || (isTouchScreen && isSmallScreen);
}

function detectWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return gl !== null;
  } catch {
    return false;
  }
}

function detectMaxTextureSize(): number {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      return gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }
  } catch {
    // Ignore
  }
  return 4096;
}

function estimateGPUPerformance(): 'high' | 'medium' | 'low' {
  const maxTextureSize = detectMaxTextureSize();

  if (maxTextureSize >= 16384) {
    return 'high';
  }

  if (maxTextureSize >= 8192) {
    return 'medium';
  }

  return 'low';
}

function detectLowEnd(): boolean {
  const gpu = estimateGPUPerformance();
  const isMobile = detectMobile();

  if (gpu === 'low') return true;
  if (isMobile && gpu === 'medium') return true;

  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  if (hardwareConcurrency <= 2) return true;

  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (deviceMemory !== undefined && deviceMemory <= 4) return true;

  return false;
}

export function detectDeviceCapabilities(): DeviceCapabilities {
  const hasWebGL2 = detectWebGL2();
  const isMobile = detectMobile();
  const maxTextureSize = detectMaxTextureSize();
  const estimatedGPU = estimateGPUPerformance();
  const isLowEnd = detectLowEnd();
  const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return {
    hasWebGL2,
    isMobile,
    isLowEnd,
    maxTextureSize,
    estimatedGPU,
    touchCapable,
  };
}

export function getRecommendedSettings(capabilities: DeviceCapabilities) {
  return {
    enablePostProcessing: !capabilities.isLowEnd && capabilities.hasWebGL2,
    enableHorror: !capabilities.isLowEnd,
    enableVHSEffects: !capabilities.isLowEnd,
    enableCRTEffects: !capabilities.isLowEnd,
    enableShadows: capabilities.estimatedGPU === 'high',
    pixelRatio: capabilities.isLowEnd ? 0.75 : capabilities.isMobile ? 1.5 : 2,
    antialias: !capabilities.isLowEnd,
  };
}
