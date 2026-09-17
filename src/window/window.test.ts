import type { BrowserWindow } from 'electron';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { titleBarWindowOptions, watchMaximized, type MaximizableWindow } from './index';

describe('titleBarWindowOptions', () => {
  it('usa la estrategia de cada plataforma', () => {
    expect(titleBarWindowOptions('darwin')).toEqual({ titleBarStyle: 'hiddenInset' });
    expect(titleBarWindowOptions('linux')).toEqual({ titleBarStyle: 'hidden' });
    expect(titleBarWindowOptions('win32', { color: '#000', symbolColor: '#fff' })).toEqual({
      titleBarStyle: 'hidden',
      titleBarOverlay: { color: '#000', symbolColor: '#fff', height: 32 },
    });
  });
});

describe('watchMaximized', () => {
  it('emite los cambios y deja de escuchar', () => {
    const listeners = new Map<string, () => void>();
    const win: MaximizableWindow = {
      on: (e, l) => listeners.set(e, l),
      removeListener: (e) => listeners.delete(e),
      isMaximized: () => false,
    };
    const onChange = vi.fn();
    const stop = watchMaximized(win, onChange);
    listeners.get('maximize')?.();
    listeners.get('unmaximize')?.();
    expect(onChange.mock.calls).toEqual([[true], [false]]);
    stop();
    expect(listeners.size).toBe(0);
  });

  it('un BrowserWindow de Electron sirve como MaximizableWindow', () => {
    expectTypeOf<BrowserWindow>().toMatchTypeOf<MaximizableWindow>();
  });
});
