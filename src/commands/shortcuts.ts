import type { CommandRegistry } from './registry';

/** Lo que interesa de `Electron.Input` para casar un atajo. */
export interface KeyInput {
  type: string;
  control: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  code: string;
}

export interface NormalizedCombo {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  code: string;
}

export type ShortcutInvoke = (windowId: number) => Promise<void> | void;

export class InvalidShortcutError extends Error {
  constructor(readonly combo: string, reason: string) {
    super(`Atajo no válido "${combo}": ${reason}`);
    this.name = 'InvalidShortcutError';
  }
}

export class ReservedShortcutError extends Error {
  constructor(readonly combo: string) {
    super(`Atajo reservado: ${combo} no puede asignarse.`);
    this.name = 'ReservedShortcutError';
  }
}

export class DuplicateShortcutError extends Error {
  constructor(readonly combo: string, readonly existingSource: string, readonly source: string) {
    super(`Atajo duplicado: ${combo} ya estaba registrado por "${existingSource}", ahora intenta "${source}".`);
    this.name = 'DuplicateShortcutError';
  }
}

const NAMED_KEYS: Record<string, string> = {
  Tab: 'Tab',
  Enter: 'Enter',
  Return: 'Enter',
  Escape: 'Escape',
  Esc: 'Escape',
  Space: 'Space',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Del: 'Delete',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
  Up: 'ArrowUp',
  Down: 'ArrowDown',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
  ';': 'Semicolon',
  "'": 'Quote',
  '`': 'Backquote',
  '\\': 'Backslash',
  '-': 'Minus',
  '=': 'Equal',
};

/** Códigos canónicos que ya son la forma normalizada (`Comma`, `ArrowUp`…). */
const CANONICAL_CODES = new Set(Object.values(NAMED_KEYS));

function parseKey(combo: string, raw: string): string {
  const k = raw.trim();
  if (/^[0-9]$/.test(k)) return `Digit${k}`;
  if (/^[a-zA-Z]$/.test(k)) return `Key${k.toUpperCase()}`;
  if (/^F([1-9]|1[0-9]|2[0-4])$/i.test(k)) return k.toUpperCase();
  // La forma canónica (salida de normalizeShortcutString o de un
  // KeyboardEvent.code) también se acepta: normalizar es idempotente.
  if (/^Key[A-Z]$/.test(k) || /^Digit[0-9]$/.test(k) || CANONICAL_CODES.has(k)) return k;
  const named = NAMED_KEYS[k];
  if (!named) throw new InvalidShortcutError(combo, `tecla desconocida "${raw}"`);
  return named;
}

export function parseShortcut(combo: string): NormalizedCombo {
  const parts = combo.split('+').map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) {
    throw new InvalidShortcutError(combo, 'vacío');
  }
  const result: NormalizedCombo = { ctrl: false, shift: false, alt: false, meta: false, code: '' };
  for (const part of parts.slice(0, -1)) {
    const p = part.toLowerCase();
    if (p === 'ctrl' || p === 'control') result.ctrl = true;
    else if (p === 'shift') result.shift = true;
    else if (p === 'alt' || p === 'option') result.alt = true;
    else if (p === 'meta' || p === 'cmd' || p === 'super' || p === 'command') result.meta = true;
    else throw new InvalidShortcutError(combo, `modificador desconocido "${part}"`);
  }
  result.code = parseKey(combo, last);
  return result;
}

/** Forma canónica (`Ctrl+Shift+KeyP`) para comparar y guardar. */
export function comboKey(c: NormalizedCombo): string {
  const mods: string[] = [];
  if (c.ctrl) mods.push('Ctrl');
  if (c.shift) mods.push('Shift');
  if (c.alt) mods.push('Alt');
  if (c.meta) mods.push('Meta');
  mods.push(c.code);
  return mods.join('+');
}

export function normalizeShortcutString(combo: string): string {
  return comboKey(parseShortcut(combo));
}

function matchesInput(combo: NormalizedCombo, input: KeyInput): boolean {
  return (
    combo.ctrl === input.control &&
    combo.shift === input.shift &&
    combo.alt === input.alt &&
    combo.meta === input.meta &&
    combo.code === input.code
  );
}

export interface ShortcutBinding {
  combo: NormalizedCombo;
  source: string;
  invoke: ShortcutInvoke;
}

export interface ShortcutTableOptions {
  /** Combinaciones que nadie puede registrar (en cualquier notación). */
  reserved?: Iterable<string>;
}

export class ShortcutTable {
  private readonly bindings: ShortcutBinding[] = [];
  private readonly seen = new Map<string, string>();
  private readonly reserved: ReadonlySet<string>;

  constructor(options: ShortcutTableOptions = {}) {
    this.reserved = new Set([...(options.reserved ?? [])].map(normalizeShortcutString));
  }

  register(combo: string, source: string, invoke: ShortcutInvoke): void {
    const normalized = parseShortcut(combo);
    const key = comboKey(normalized);
    if (this.reserved.has(key)) {
      throw new ReservedShortcutError(combo);
    }
    const existing = this.seen.get(key);
    if (existing !== undefined) {
      throw new DuplicateShortcutError(combo, existing, source);
    }
    this.seen.set(key, source);
    this.bindings.push({ combo: normalized, source, invoke });
  }

  /** Como `register`, pero devuelve false en vez de lanzar si hay colisión. */
  tryRegister(combo: string, source: string, invoke: ShortcutInvoke): boolean {
    try {
      this.register(combo, source, invoke);
      return true;
    } catch {
      return false;
    }
  }

  isTaken(combo: string): boolean {
    const key = normalizeShortcutString(combo);
    return this.reserved.has(key) || this.seen.has(key);
  }

  match(input: KeyInput): ShortcutBinding | null {
    if (input.type !== 'keyDown') return null;
    return this.bindings.find((b) => matchesInput(b.combo, input)) ?? null;
  }

  listBindings(): ReadonlyArray<{ combo: string; source: string }> {
    return this.bindings.map((b) => ({ combo: comboKey(b.combo), source: b.source }));
  }
}

export interface RegisterCommandShortcutsOptions<Ctx> {
  /**
   * Atajos del usuario por id de comando: clave ausente → `defaultShortcut`;
   * string → ese atajo; null → sin atajo.
   */
  custom?: Record<string, string | null>;
  buildContext: (windowId: number) => Ctx;
  /** Se llama cuando un atajo no se puede registrar (ocupado o inválido). */
  onConflict?: (combo: string, commandId: string) => void;
}

/**
 * Registra en la tabla el atajo efectivo de cada comando. La app registra
 * antes sus combinaciones fijas para que ganen ante un conflicto.
 */
export function registerCommandShortcuts<Ctx>(
  table: ShortcutTable,
  registry: CommandRegistry<Ctx, string>,
  options: RegisterCommandShortcutsOptions<Ctx>,
): void {
  const custom = options.custom ?? {};
  for (const cmd of registry.list()) {
    const effective = cmd.id in custom ? custom[cmd.id] : cmd.defaultShortcut;
    if (!effective) continue;
    const ok = table.tryRegister(effective, cmd.id, async (windowId) => {
      await registry.execute(cmd.id, options.buildContext(windowId));
    });
    if (!ok) options.onConflict?.(effective, cmd.id);
  }
}

/** Lo que interesa de `WebContents` para escuchar el teclado. */
export interface InputEventSource {
  on(event: 'before-input-event', listener: (event: { preventDefault(): void }, input: KeyInput) => void): unknown;
  removeListener(
    event: 'before-input-event',
    listener: (event: { preventDefault(): void }, input: KeyInput) => void,
  ): unknown;
}

export interface AttachShortcutsOptions {
  /** true = dejar pasar la tecla al renderer aunque tenga atajo. */
  passThrough?: (input: KeyInput, windowId: number) => boolean;
  /** Para lógica de soltar tecla (p. ej. confirmar un MRU al soltar Ctrl). */
  onKeyUp?: (input: KeyInput, windowId: number) => void;
  onError?: (source: string, error: unknown) => void;
}

/**
 * Engancha la tabla a un WebContents. `getTable` se evalúa en cada pulsación,
 * así que la tabla puede sustituirse en caliente. Devuelve la función que
 * desengancha.
 */
export function attachShortcuts(
  getTable: () => ShortcutTable | null,
  source: InputEventSource,
  resolveWindowId: () => number | null,
  options: AttachShortcutsOptions = {},
): () => void {
  const handler = (event: { preventDefault(): void }, input: KeyInput): void => {
    if (input.type === 'keyUp') {
      if (!options.onKeyUp) return;
      const windowId = resolveWindowId();
      if (windowId !== null) options.onKeyUp(input, windowId);
      return;
    }
    const binding = getTable()?.match(input);
    if (!binding) return;
    const windowId = resolveWindowId();
    if (windowId === null) return;
    if (options.passThrough?.(input, windowId)) return;
    event.preventDefault();
    void Promise.resolve()
      .then(() => binding.invoke(windowId))
      .catch((err: unknown) => options.onError?.(binding.source, err));
  };
  source.on('before-input-event', handler);
  return () => {
    source.removeListener('before-input-event', handler);
  };
}
