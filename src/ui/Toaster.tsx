import type { CSSProperties } from 'react';
import { useToastStore, type ToastVariant } from './toastStore';

// Estilos en línea: el Tailwind de cada app no escanea el kit.
const VARIANT_STYLES: Record<ToastVariant, CSSProperties> = {
  info: {
    background: 'var(--vela-bg-sidebar-elev, var(--vela-bg-elevated))',
    color: 'var(--vela-fg)',
    borderColor: 'var(--vela-border)',
  },
  success: {
    background: 'rgba(34, 197, 94, 0.12)',
    color: '#86efac',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  warning: {
    background: 'rgba(234, 179, 8, 0.12)',
    color: '#fde68a',
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#fca5a5',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
};

const CONTAINER_STYLE: CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 16,
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  pointerEvents: 'none',
};

const TOAST_STYLE: CSSProperties = {
  pointerEvents: 'auto',
  cursor: 'pointer',
  borderRadius: 'var(--vela-radius-sm, 4px)',
  borderWidth: 1,
  borderStyle: 'solid',
  padding: '8px 12px',
  fontSize: 12,
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
};

/** Pila de toasts. Montar una vez en la raíz de cada ventana. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div style={CONTAINER_STYLE} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => {
            t.onClick?.();
            dismiss(t.id);
          }}
          style={{ ...TOAST_STYLE, ...VARIANT_STYLES[t.variant] }}
        >
          {t.message}
          {t.onClick && <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>↗</span>}
        </div>
      ))}
    </div>
  );
}
