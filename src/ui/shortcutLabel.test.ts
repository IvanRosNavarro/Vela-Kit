import { describe, expect, it } from 'vitest';
import { formatShortcut, shortcutFromKeyEvent } from './index';

const key = (code: string, mods: Partial<{ ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }> = {}) => ({
  code,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...mods,
});

describe('formatShortcut', () => {
  it('muestra el atajo según la plataforma y la notación', () => {
    expect(formatShortcut('Ctrl+Shift+P', 'win32')).toBe('Ctrl+Shift+P');
    expect(formatShortcut('Ctrl+Shift+KeyP', 'linux')).toBe('Ctrl+Shift+P');
    expect(formatShortcut('Ctrl+Comma', 'win32')).toBe('Ctrl+,');
    expect(formatShortcut('Ctrl+,', 'win32')).toBe('Ctrl+,');
    expect(formatShortcut('Meta+Shift+KeyP', 'darwin')).toBe('⌘⇧P');
    expect(formatShortcut('Cmd+Digit1', 'darwin')).toBe('⌘1');
    expect(formatShortcut('F12', 'win32')).toBe('F12');
    expect(formatShortcut('', 'win32')).toBe('');
  });
});

describe('shortcutFromKeyEvent', () => {
  it('captura combinaciones con modificadores y teclas de función', () => {
    expect(shortcutFromKeyEvent(key('KeyP', { ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+KeyP');
    expect(shortcutFromKeyEvent(key('F5'))).toBe('F5');
    expect(shortcutFromKeyEvent(key('Comma', { metaKey: true }))).toBe('Meta+Comma');
  });

  it('ignora modificadores sueltos, letras sin modificador y Shift+letra', () => {
    expect(shortcutFromKeyEvent(key('ControlLeft', { ctrlKey: true }))).toBeNull();
    expect(shortcutFromKeyEvent(key('KeyA'))).toBeNull();
    expect(shortcutFromKeyEvent(key('KeyA', { shiftKey: true }))).toBeNull();
  });
});
