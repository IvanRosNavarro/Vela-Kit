export type DesktopPlatform = 'win32' | 'darwin' | 'linux';

/** Alto de la title bar de la familia Vela. */
export const TITLEBAR_HEIGHT = 32;

/**
 * Ancho del overlay nativo de Windows (3 botones × 46 px a escala 100 %).
 * Windows lo escala solo en 125/150 %.
 */
export const WIN32_CONTROLS_WIDTH = 138;

/** Hueco para los semáforos de macOS con `titleBarStyle: 'hiddenInset'`. */
export const DARWIN_TRAFFIC_LIGHT_CLEARANCE = 80;
