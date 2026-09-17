import type { Theme } from './types';
import { resolveTheme, BUILTIN_THEMES, getThemeById } from './themes';
import { THEME_VARS } from './variables';

export const FONT_FAMILIES: Record<string, string> = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  inter: '"Inter", system-ui, sans-serif',
  'jetbrains-mono': '"JetBrains Mono", "Fira Code", monospace',
  'sf-pro': '"SF Pro Display", system-ui, sans-serif',
};

export interface TitleBarColors {
  color: string;
  symbolColor: string;
}

export interface ThemeManagerOptions {
  /**
   * Se invoca tras aplicar un tema o cambiar el glassmorphism con los colores
   * que debe tomar el marco nativo (overlay DWM en Windows). La app decide si
   * aplica a su plataforma.
   */
  onTitleBarColors?: (colors: TitleBarColors) => void;
  /** id del `<style>` donde se inyecta el CSS custom. */
  customCssElementId?: string;
}

/**
 * Aplica temas `--vela-*` sobre `document.documentElement`. No sabe de dónde
 * salen las preferencias: la app las lee de su almacenamiento y llama a
 * `setTheme`, `applyFontSize`, etc.
 */
export class ThemeManager {
  private currentThemeId = 'system';
  private mediaQuery: MediaQueryList | null = null;
  private boundOnSchemeChange: (() => void) | null = null;
  private customThemes: Theme[] = [];
  private glassmorphismEnabled = false;
  private glassmorphismIntensity = 60;
  private glassmorphismOpacity = 60;
  private readonly onTitleBarColors: ((colors: TitleBarColors) => void) | undefined;
  private readonly customCssElementId: string;

  constructor(options: ThemeManagerOptions = {}) {
    this.onTitleBarColors = options.onTitleBarColors;
    this.customCssElementId = options.customCssElementId ?? 'vela-custom-css';
  }

  /** Escucha `prefers-color-scheme` para el tema `system`. */
  initialize(): void {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.boundOnSchemeChange = () => {
      if (this.currentThemeId === 'system') {
        this.applyById('system');
      }
    };
    this.mediaQuery.addEventListener('change', this.boundOnSchemeChange);
  }

  setTheme(themeId: string): void {
    this.applyById(themeId);
  }

  setCustomThemes(themes: Theme[]): void {
    this.customThemes = themes;
    // Reaplicar si el tema activo es uno de los custom recién actualizados.
    if (this.customThemes.some((t) => t.id === this.currentThemeId)) {
      this.applyById(this.currentThemeId);
    }
  }

  findTheme(id: string): Theme | undefined {
    return getThemeById(id) ?? this.customThemes.find((t) => t.id === id);
  }

  private applyById(themeId: string): void {
    this.currentThemeId = themeId;
    this.applyTheme(this.getCurrentTheme());
  }

  applyGlassmorphism(enabled: boolean, intensity: number, opacity: number): void {
    this.glassmorphismEnabled = enabled;
    this.glassmorphismIntensity = intensity;
    this.glassmorphismOpacity = opacity;
    const root = document.documentElement;
    if (enabled) {
      this.applyGlassVars(root);
    } else {
      // Restaurar los valores propios del tema (Midnight/Nord/etc. definen su propio blur).
      const theme = this.getCurrentTheme();
      root.style.setProperty('--sidebar-backdrop-filter', theme.variables['--sidebar-backdrop-filter'] ?? 'none');
      root.style.setProperty('--sidebar-background-opacity', theme.variables['--sidebar-background-opacity'] ?? '1');
      root.style.removeProperty('--vela-html-bg');
    }
    this.emitTitleBarColors();
  }

  applyTheme(theme: Theme): void {
    const root = document.documentElement;

    Object.entries(theme.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Con el glassmorphism activo, sus valores mandan sobre los del tema.
    if (this.glassmorphismEnabled) {
      this.applyGlassVars(root);
    } else {
      root.style.removeProperty('--vela-html-bg');
    }

    document.body.dataset['theme'] = theme.id;
    this.emitTitleBarColors();
  }

  private applyGlassVars(root: HTMLElement): void {
    const blurPx = Math.round(16 + (this.glassmorphismIntensity / 100) * 8);
    // opacity: 0 = muy transparente (0.20), 100 = casi sólido (0.85)
    const bgOpacity = (0.20 + (this.glassmorphismOpacity / 100) * 0.65).toFixed(2);
    root.style.setProperty('--sidebar-backdrop-filter', `blur(${blurPx}px) saturate(1.8)`);
    root.style.setProperty('--sidebar-background-opacity', bgOpacity);
    // html transparente para que el material del SO pase a través.
    root.style.setProperty('--vela-html-bg', 'transparent');
  }

  private emitTitleBarColors(): void {
    if (!this.onTitleBarColors) return;
    const computed = getComputedStyle(document.documentElement);
    const theme = this.getCurrentTheme();
    const symbolColor = computed.getPropertyValue('--vela-titlebar-fg').trim()
      || theme.variables['--vela-titlebar-fg']
      || '#e0e0e0';
    // Con glassmorphism el overlay es transparente para que el acrílico pase
    // también por los botones nativos.
    const color = this.glassmorphismEnabled
      ? '#00000000'
      : (computed.getPropertyValue('--vela-titlebar-bg').trim()
          || theme.variables['--vela-titlebar-bg']
          || '#1a1a1a');
    this.onTitleBarColors({ color, symbolColor });
  }

  applyFontFamily(familyKey: string): void {
    const value = FONT_FAMILIES[familyKey] ?? FONT_FAMILIES['system']!;
    document.documentElement.style.setProperty('--vela-font-family', value);
  }

  applyFontSize(size: number): void {
    const clamped = Math.max(12, Math.min(18, size));
    document.documentElement.style.setProperty('--vela-font-size', `${clamped}px`);
  }

  applyCustomCss(css: string): void {
    document.getElementById(this.customCssElementId)?.remove();
    if (!css.trim()) return;
    const style = document.createElement('style');
    style.id = this.customCssElementId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  getCurrentThemeId(): string {
    return this.currentThemeId;
  }

  getCurrentTheme(): Theme {
    const prefersDark = this.mediaQuery?.matches ?? false;
    return resolveTheme(this.currentThemeId, prefersDark, this.customThemes);
  }

  listThemes(): Theme[] {
    return [...BUILTIN_THEMES, ...this.customThemes];
  }

  /** Comprueba que el tema define todas las variables base de `THEME_VARS`. */
  validate(theme: Theme): { valid: boolean; missingVars: string[] } {
    const missingVars = Object.keys(THEME_VARS).filter((k) => !(k in theme.variables));
    return { valid: missingVars.length === 0, missingVars };
  }

  destroy(): void {
    if (this.mediaQuery && this.boundOnSchemeChange) {
      this.mediaQuery.removeEventListener('change', this.boundOnSchemeChange);
    }
  }
}
