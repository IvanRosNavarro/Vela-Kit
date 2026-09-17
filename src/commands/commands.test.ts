import type { WebContents } from 'electron';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod';
import {
  CommandRegistry,
  DuplicateShortcutError,
  InvalidCommandArgsError,
  InvalidShortcutError,
  ReservedShortcutError,
  ShortcutTable,
  UnknownCommandError,
  attachShortcuts,
  createCommandDefiner,
  normalizeShortcutString,
  registerCommandShortcuts,
  type InputEventSource,
  type KeyInput,
} from './index';

interface Ctx {
  windowId: number;
}

const defineCommand = createCommandDefiner<Ctx, 'site' | 'view'>();

const key = (code: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  type: 'keyDown',
  control: false,
  shift: false,
  alt: false,
  meta: false,
  code,
  ...mods,
});

describe('CommandRegistry', () => {
  it('infiere y valida los args con el schema', async () => {
    const run = vi.fn();
    const registry = new CommandRegistry<Ctx, 'site' | 'view'>();
    const cmd = defineCommand({
      id: 'site.open',
      title: 'Abrir sitio',
      category: 'site',
      argsSchema: z.object({ siteId: z.string(), readOnly: z.boolean().optional() }),
      run: (ctx, args) => {
        expectTypeOf(args.siteId).toEqualTypeOf<string>();
        run(ctx.windowId, args);
      },
    });
    registry.register(cmd);

    await registry.execute('site.open', { windowId: 1 }, { siteId: 'a' });
    expect(run).toHaveBeenCalledWith(1, { siteId: 'a' });
    await expect(registry.execute('site.open', { windowId: 1 }, { siteId: 3 }))
      .rejects.toBeInstanceOf(InvalidCommandArgsError);
  });

  it('sin args prueba con {} y rechaza ids desconocidos o duplicados', async () => {
    const registry = new CommandRegistry<Ctx>();
    const run = vi.fn();
    registry.register(defineCommand({
      id: 'view.refresh',
      title: 'Refrescar',
      category: 'view',
      argsSchema: z.object({ hard: z.boolean().optional() }),
      run,
    }));
    await registry.execute('view.refresh', { windowId: 2 });
    expect(run).toHaveBeenCalledWith({ windowId: 2 }, {});
    await expect(registry.execute('nope', { windowId: 2 })).rejects.toBeInstanceOf(UnknownCommandError);
    expect(() => registry.register(defineCommand({ id: 'view.refresh', title: 'x', category: 'view', run: () => {} })))
      .toThrow();
  });
});

describe('atajos', () => {
  it('normaliza notaciones equivalentes', () => {
    expect(normalizeShortcutString('control+shift+p')).toBe('Ctrl+Shift+KeyP');
    expect(normalizeShortcutString('Cmd+,')).toBe('Meta+Comma');
    expect(normalizeShortcutString('Alt+1')).toBe('Alt+Digit1');
    expect(() => normalizeShortcutString('Ctrl+Hyper+X')).toThrow(InvalidShortcutError);
    expect(() => normalizeShortcutString('')).toThrow(InvalidShortcutError);
  });

  it('normalizar es idempotente y acepta códigos de KeyboardEvent', () => {
    for (const combo of ['Ctrl+Shift+P', 'Cmd+,', 'Alt+1', 'Ctrl+Up', 'F5', 'Ctrl+Shift+Tab']) {
      const once = normalizeShortcutString(combo);
      expect(normalizeShortcutString(once)).toBe(once);
    }
    expect(normalizeShortcutString('Ctrl+Shift+KeyP')).toBe('Ctrl+Shift+KeyP');
    expect(normalizeShortcutString('Meta+Comma')).toBe('Meta+Comma');
    expect(normalizeShortcutString('Ctrl+ArrowUp')).toBe('Ctrl+ArrowUp');
    expect(() => normalizeShortcutString('Ctrl+Keyp')).toThrow(InvalidShortcutError);
  });

  it('respeta reservados y duplicados', () => {
    const table = new ShortcutTable({ reserved: ['ctrl+shift+p'] });
    expect(() => table.register('Ctrl+Shift+P', 'x', () => {})).toThrow(ReservedShortcutError);
    table.register('Ctrl+K', 'a', () => {});
    expect(() => table.register('control+k', 'b', () => {})).toThrow(DuplicateShortcutError);
    expect(table.tryRegister('Ctrl+K', 'b', () => {})).toBe(false);
    expect(table.isTaken('Ctrl+K')).toBe(true);
    expect(table.match(key('KeyK', { control: true }))?.source).toBe('a');
    expect(table.match({ ...key('KeyK', { control: true }), type: 'keyUp' })).toBeNull();
  });

  it('registra los atajos efectivos de los comandos', async () => {
    const registry = new CommandRegistry<Ctx>();
    const runA = vi.fn();
    registry.register(defineCommand({ id: 'a', title: 'A', category: 'view', defaultShortcut: 'Ctrl+A', run: runA }));
    registry.register(defineCommand({ id: 'b', title: 'B', category: 'view', defaultShortcut: 'Ctrl+B', run: () => {} }));
    registry.register(defineCommand({ id: 'c', title: 'C', category: 'view', defaultShortcut: 'Ctrl+C', run: () => {} }));
    const table = new ShortcutTable();
    table.register('Ctrl+D', 'fijo', () => {});
    const onConflict = vi.fn();

    registerCommandShortcuts(table, registry, {
      custom: { b: null, c: 'Ctrl+D' },
      buildContext: (windowId) => ({ windowId }),
      onConflict,
    });

    expect(table.listBindings().map((b) => b.source)).toEqual(['fijo', 'a']);
    expect(onConflict).toHaveBeenCalledWith('Ctrl+D', 'c');
    await table.match(key('KeyA', { control: true }))?.invoke(7);
    expect(runA.mock.calls[0]?.[0]).toEqual({ windowId: 7 });
  });

  it('attachShortcuts intercepta, deja pasar y desengancha', async () => {
    type Listener = Parameters<InputEventSource['on']>[1];
    let listener: Listener | null = null;
    const source: InputEventSource = {
      on: (_e, l) => { listener = l; },
      removeListener: () => { listener = null; },
    };
    const invoke = vi.fn();
    const table = new ShortcutTable();
    table.register('Ctrl+K', 'k', invoke);
    table.register('Escape', 'esc', invoke);

    const detach = attachShortcuts(() => table, source, () => 3, {
      passThrough: (input) => input.code === 'Escape',
    });

    const prevent = vi.fn();
    listener!({ preventDefault: prevent }, key('KeyK', { control: true }));
    listener!({ preventDefault: prevent }, key('Escape'));
    await Promise.resolve();
    await Promise.resolve();
    expect(prevent).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(3);
    expect(invoke).toHaveBeenCalledTimes(1);

    detach();
    expect(listener).toBeNull();
  });

  it('un WebContents de Electron sirve como InputEventSource', () => {
    expectTypeOf<WebContents>().toMatchTypeOf<InputEventSource>();
  });
});
