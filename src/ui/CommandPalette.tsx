import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { fuzzyFilter, highlightMatch } from './fuzzy';
import { formatShortcut, type ShortcutPlatform } from './shortcutLabel';

export interface PaletteItem {
  id: string;
  title: string;
  /** Texto secundario a la derecha del título (p. ej. el host de un sitio). */
  subtitle?: string;
  /** Grupo en el que se muestra cuando no hay búsqueda. */
  group?: string;
  shortcut?: string | null;
  /** Términos extra para la búsqueda que no se muestran. */
  keywords?: string[];
}

export interface CommandPaletteProps {
  items: PaletteItem[];
  onSelect: (item: PaletteItem) => void;
  onClose: () => void;
  platform: ShortcutPlatform;
  placeholder?: string;
  initialQuery?: string;
  emptyText?: string;
  /** Máximo de resultados con búsqueda (por defecto 50). */
  maxResults?: number;
}

type Row = { kind: 'header'; label: string } | { kind: 'item'; item: PaletteItem; positions: number[]; index: number };

const OVERLAY: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 400,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  paddingTop: '12vh',
  background: 'rgba(0, 0, 0, 0.5)',
};

const PANEL: CSSProperties = {
  width: 580,
  maxWidth: '92vw',
  maxHeight: '64vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: 'var(--vela-radius-lg, 12px)',
  border: '1px solid var(--vela-border)',
  background: 'var(--vela-bg-elevated)',
  color: 'var(--vela-fg)',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  fontFamily: 'var(--vela-font-family)',
};

/** Paleta de comandos de la familia Vela: búsqueda fuzzy sobre una lista de acciones. */
export function CommandPalette({
  items,
  onSelect,
  onClose,
  platform,
  placeholder = 'Escribe un comando…',
  initialQuery = '',
  emptyText = 'Sin resultados',
  maxResults = 50,
}: CommandPaletteProps) {
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const len = inputRef.current?.value.length ?? 0;
    inputRef.current?.setSelectionRange(len, len);
  }, []);

  const rows = useMemo<Row[]>(() => {
    if (query.trim()) {
      return fuzzyFilter(items, query.trim(), (i) => [i.title, ...(i.subtitle ? [i.subtitle] : []), ...(i.keywords ?? [])])
        .slice(0, maxResults)
        .map((r, index) => ({
          kind: 'item' as const,
          item: r,
          // Solo se resalta si el mejor emparejamiento fue sobre el título.
          positions: r._positions.every((p) => p < r.title.length) ? r._positions : [],
          index,
        }));
    }
    const out: Row[] = [];
    let index = 0;
    let lastGroup: string | undefined;
    for (const item of items) {
      if (item.group && item.group !== lastGroup) out.push({ kind: 'header', label: item.group });
      lastGroup = item.group;
      out.push({ kind: 'item', item, positions: [], index: index++ });
    }
    return out;
  }, [items, query, maxResults]);

  const selectable = rows.filter((r): r is Extract<Row, { kind: 'item' }> => r.kind === 'item');

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (index: number) => {
    const row = selectable[index];
    if (!row) return;
    onClose();
    onSelect(row.item);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => (selectable.length ? (a + 1) % selectable.length : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => (selectable.length ? (a - 1 + selectable.length) % selectable.length : 0));
        break;
      case 'PageDown':
        e.preventDefault();
        setActive((a) => Math.min(selectable.length - 1, a + 8));
        break;
      case 'PageUp':
        e.preventDefault();
        setActive((a) => Math.max(0, a - 8));
        break;
      case 'Enter':
        e.preventDefault();
        choose(active);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
    }
  };

  return (
    <div style={OVERLAY} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Paleta de comandos" style={PANEL} onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-controls="vela-palette-list"
          aria-activedescendant={`vela-palette-${active}`}
          spellCheck={false}
          style={{
            border: 'none',
            borderBottom: '1px solid var(--vela-border)',
            background: 'transparent',
            color: 'var(--vela-fg)',
            padding: '14px 16px',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <div ref={listRef} id="vela-palette-list" role="listbox" style={{ overflowY: 'auto', padding: '6px 0' }}>
          {selectable.length === 0 && (
            <div style={{ padding: '18px 16px', fontSize: 12, color: 'var(--vela-fg-muted)', textAlign: 'center' }}>{emptyText}</div>
          )}
          {rows.map((row, i) =>
            row.kind === 'header' ? (
              <div
                key={`h-${i}`}
                style={{
                  padding: '8px 16px 4px',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--vela-fg-muted)',
                }}
              >
                {row.label}
              </div>
            ) : (
              <div
                key={row.item.id}
                id={`vela-palette-${row.index}`}
                data-index={row.index}
                role="option"
                aria-selected={row.index === active}
                onMouseMove={() => setActive(row.index)}
                onClick={() => choose(row.index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 16px',
                  fontSize: 13,
                  cursor: 'pointer',
                  background: row.index === active ? 'var(--vela-sidebar-active-bg)' : 'transparent',
                }}
              >
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {highlightMatch(row.item.title, row.positions).map((part, j) =>
                    part.highlighted ? (
                      <mark key={j} style={{ background: 'transparent', color: 'var(--vela-accent)', fontWeight: 600 }}>
                        {part.text}
                      </mark>
                    ) : (
                      <span key={j}>{part.text}</span>
                    ),
                  )}
                  {row.item.subtitle && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--vela-fg-muted)' }}>{row.item.subtitle}</span>
                  )}
                </span>
                {row.item.shortcut && (
                  <kbd
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 11,
                      color: 'var(--vela-fg-muted)',
                      border: '1px solid var(--vela-border)',
                      borderRadius: 4,
                      padding: '1px 6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatShortcut(row.item.shortcut, platform)}
                  </kbd>
                )}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
