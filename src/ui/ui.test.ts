import { afterEach, describe, expect, it, vi } from 'vitest';
import { fuzzyFilter, fuzzyMatch, highlightMatch, toast, useToastStore, TOAST_TIMEOUT_MS } from './index';

describe('fuzzy', () => {
  it('ordena exacto > prefijo > subcadena > dispersa', () => {
    const items = [{ t: 'xx open site' }, { t: 'open' }, { t: 'opener' }, { t: 'o_p_e_n' }];
    expect(fuzzyFilter(items, 'open', (i) => i.t).map((i) => i.t)).toEqual(['open', 'opener', 'xx open site', 'o_p_e_n']);
  });

  it('devuelve posiciones para resaltar', () => {
    const m = fuzzyMatch('cs', 'Conectar sitio');
    expect(m.match).toBe(true);
    expect(highlightMatch('Conectar sitio', m.positions).filter((p) => p.highlighted).map((p) => p.text))
      .toEqual(['C', 's']);
    expect(fuzzyMatch('zz', 'Conectar').match).toBe(false);
  });
});

describe('toasts', () => {
  afterEach(() => {
    vi.useRealTimers();
    useToastStore.setState({ toasts: [] });
  });

  it('se añaden y caducan solos', () => {
    vi.useFakeTimers();
    const id = toast('Subida completada', 'success');
    expect(useToastStore.getState().toasts).toEqual([{ id, message: 'Subida completada', variant: 'success' }]);
    vi.advanceTimersByTime(TOAST_TIMEOUT_MS);
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('info por defecto y conserva la acción', () => {
    const onClick = vi.fn();
    toast('Abrir carpeta', undefined, onClick);
    const [t] = useToastStore.getState().toasts;
    expect(t?.variant).toBe('info');
    t?.onClick?.();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
