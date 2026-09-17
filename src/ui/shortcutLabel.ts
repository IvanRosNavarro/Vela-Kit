export type ShortcutPlatform = 'win32' | 'darwin' | 'linux';

const MAC_SYMBOLS: Record<string, string> = { Ctrl: '⌃', Shift: '⇧', Alt: '⌥', Meta: '⌘' };

const KEY_LABELS: Record<string, string> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
  Delete: 'Supr',
  Backspace: '⌫',
  Enter: '↵',
  Space: 'Espacio',
};

function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return KEY_LABELS[code] ?? code;
}

/**
 * Texto legible de un atajo en cualquier notación (`Ctrl+Shift+P`,
 * `Ctrl+Shift+KeyP`): `Ctrl+Shift+P` en Windows/Linux, `⌃⇧P` en macOS.
 */
export function formatShortcut(combo: string, platform: ShortcutPlatform): string {
  const parts = combo.split('+').map((p) => p.trim()).filter(Boolean);
  const key = parts.pop();
  if (!key) return '';
  const mods = parts.map((m) => {
    const lower = m.toLowerCase();
    if (lower === 'control' || lower === 'ctrl') return 'Ctrl';
    if (lower === 'cmd' || lower === 'command' || lower === 'super' || lower === 'meta') return 'Meta';
    if (lower === 'option' || lower === 'alt') return 'Alt';
    return m.charAt(0).toUpperCase() + m.slice(1);
  });
  const label = key.length === 1 ? key.toUpperCase() : keyLabel(key);
  if (platform === 'darwin') return `${mods.map((m) => MAC_SYMBOLS[m] ?? m).join('')}${label}`;
  return [...mods.map((m) => (m === 'Meta' ? 'Win' : m)), label].join('+');
}

/** Lo que interesa de un `KeyboardEvent` para capturar un atajo. */
export interface KeyEventLike {
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

const MODIFIER_CODES = new Set(['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);

/**
 * Convierte una pulsación en un atajo canónico (`Ctrl+Shift+KeyP`) o null si
 * solo son modificadores o no lleva modificador (salvo teclas de función).
 */
export function shortcutFromKeyEvent(event: KeyEventLike): string | null {
  if (MODIFIER_CODES.has(event.code) || !event.code) return null;
  const isFunctionKey = /^F([1-9]|1[0-9]|2[0-4])$/.test(event.code);
  const mods: string[] = [];
  if (event.ctrlKey) mods.push('Ctrl');
  if (event.shiftKey) mods.push('Shift');
  if (event.altKey) mods.push('Alt');
  if (event.metaKey) mods.push('Meta');
  if (mods.length === 0 && !isFunctionKey) return null;
  // Solo Shift + una letra escribiría una mayúscula: no es un atajo útil.
  if (mods.length === 1 && mods[0] === 'Shift' && !isFunctionKey) return null;
  return [...mods, event.code].join('+');
}
