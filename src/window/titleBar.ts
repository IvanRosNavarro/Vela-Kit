import type { BrowserWindowConstructorOptions } from 'electron';
import { TITLEBAR_HEIGHT, type DesktopPlatform } from './constants';

export interface TitleBarColors {
  color: string;
  symbolColor: string;
}

const DEFAULT_COLORS: TitleBarColors = { color: '#1a1a1a', symbolColor: '#e0e0e0' };

/**
 * Opciones de `BrowserWindow` para la title bar de la familia Vela:
 * overlay nativo en Windows, semáforos integrados en macOS y barra propia
 * (con botones dibujados por `TitleBar`) en Linux.
 */
export function titleBarWindowOptions(
  platform: DesktopPlatform,
  colors: TitleBarColors = DEFAULT_COLORS,
): Pick<BrowserWindowConstructorOptions, 'titleBarStyle' | 'titleBarOverlay'> {
  if (platform === 'darwin') {
    return { titleBarStyle: 'hiddenInset' };
  }
  if (platform === 'win32') {
    return {
      titleBarStyle: 'hidden',
      titleBarOverlay: { ...colors, height: TITLEBAR_HEIGHT },
    };
  }
  return { titleBarStyle: 'hidden' };
}

/** Lo que interesa de `BrowserWindow` para seguir su estado maximizado. */
export interface MaximizableWindow {
  on(event: 'maximize' | 'unmaximize', listener: () => void): unknown;
  removeListener(event: 'maximize' | 'unmaximize', listener: () => void): unknown;
  isMaximized(): boolean;
}

/** Avisa de cada cambio de maximizado. Devuelve la función que deja de escuchar. */
export function watchMaximized(win: MaximizableWindow, onChange: (maximized: boolean) => void): () => void {
  const onMax = () => onChange(true);
  const onUnmax = () => onChange(false);
  win.on('maximize', onMax);
  win.on('unmaximize', onUnmax);
  return () => {
    win.removeListener('maximize', onMax);
    win.removeListener('unmaximize', onUnmax);
  };
}
