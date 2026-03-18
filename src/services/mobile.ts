export const isTouchDevice = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
};

export const isStandaloneApp = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
};

export const isMobileViewport = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(max-width: 767px)').matches;
};

export const shouldUseRedirectAuth = () => isTouchDevice() || isStandaloneApp();

export const getCaptureInputProps = (mode: 'camera' | 'gallery') => {
  if (mode === 'camera') {
    return {
      accept: 'image/*,.pdf',
      capture: 'environment' as const,
    };
  }

  return {
    accept: 'image/*,.pdf',
  };
};
