import { describe, expect, it } from 'vitest';
import {
  BUILTIN_THEMES,
  ThemeManager,
  darkTheme,
  lightTheme,
  resolveTheme,
  validateCustomCss,
} from './index';

describe('resolveTheme', () => {
  it('system sigue la preferencia del SO', () => {
    expect(resolveTheme('system', true)).toBe(darkTheme);
    expect(resolveTheme('system', false)).toBe(lightTheme);
  });

  it('prioriza builtin, luego custom, luego fallback', () => {
    const custom = { ...darkTheme, id: 'mine', builtin: false };
    expect(resolveTheme('nord', false, [custom]).id).toBe('nord');
    expect(resolveTheme('mine', false, [custom])).toBe(custom);
    expect(resolveTheme('no-existe', true)).toBe(darkTheme);
  });
});

describe('temas builtin', () => {
  it('definen todas las variables base', () => {
    const manager = new ThemeManager();
    for (const theme of BUILTIN_THEMES) {
      expect(manager.validate(theme), theme.id).toEqual({ valid: true, missingVars: [] });
    }
  });
});

describe('validateCustomCss', () => {
  it('admite data: y rechaza URLs externas', () => {
    const css = 'a{background:url("data:image/png;base64,AA")} b{background:url(https://x.com/a.png)}';
    expect(validateCustomCss(css)).toEqual({ valid: false, invalidUrls: ['https://x.com/a.png'] });
  });

  it('admite los esquemas extra configurados', () => {
    expect(validateCustomCss('a{background:url(vela://icon.png)}', { allowedUrlSchemes: ['vela:'] }).valid)
      .toBe(true);
    expect(validateCustomCss('a{background:url(vela://icon.png)}').valid).toBe(false);
  });
});
