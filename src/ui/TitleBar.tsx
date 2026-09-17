import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  DARWIN_TRAFFIC_LIGHT_CLEARANCE,
  TITLEBAR_HEIGHT,
  WIN32_CONTROLS_WIDTH,
  type DesktopPlatform,
} from '../window/constants';

/** Aplicar a botones, inputs y cualquier elemento clicable dentro de la barra. */
export const NO_DRAG_STYLE = { WebkitAppRegion: 'no-drag' } as CSSProperties;

export interface WindowControlHandlers {
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}

export interface TitleBarProps {
  platform: DesktopPlatform;
  /** Contenido de la barra. Lo interactivo debe llevar `NO_DRAG_STYLE`. */
  children?: ReactNode;
  /** Solo Linux: estado y acciones de los botones dibujados. */
  maximized?: boolean;
  controls?: WindowControlHandlers;
  id?: string;
  style?: CSSProperties;
}

/**
 * Marco de la title bar de la familia Vela: zona de arrastre, hueco para los
 * semáforos de macOS y para el overlay nativo de Windows, y botones propios en
 * Linux. Se usa junto a `titleBarWindowOptions` de `vela-kit/window`.
 */
export function TitleBar({ platform, children, maximized = false, controls, id = 'vela-titlebar', style }: TitleBarProps) {
  return (
    <header
      id={id}
      style={{
        height: TITLEBAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        paddingLeft: platform === 'darwin' ? DARWIN_TRAFFIC_LIGHT_CLEARANCE : 0,
        background: 'color-mix(in srgb, var(--vela-titlebar-bg) calc(var(--sidebar-background-opacity, 1) * 100%), transparent)',
        backdropFilter: 'var(--sidebar-backdrop-filter, none)',
        color: 'var(--vela-titlebar-fg)',
        userSelect: 'none',
        WebkitAppRegion: 'drag',
        position: 'relative',
        zIndex: 100,
        ...style,
      } as CSSProperties}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', height: '100%' }}>{children}</div>
      {platform === 'win32' && <div style={{ width: WIN32_CONTROLS_WIDTH, flexShrink: 0 }} aria-hidden />}
      {platform === 'linux' && controls && <LinuxControls maximized={maximized} controls={controls} />}
    </header>
  );
}

// ── Botones de Linux: círculo neutro de 14 px con área de clic de 32 px ──────

const CIRCLE_DEFAULT = '#4a4d55';
const CIRCLE_HOVER = '#5a5e68';
const CIRCLE_HOVER_CLOSE = '#c42b1c';
const CIRCLE_ACTIVE_CLOSE = '#9f2112';

function LinuxControls({ maximized, controls }: { maximized: boolean; controls: WindowControlHandlers }) {
  return (
    <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', paddingRight: 4 }}>
      <LinuxButton label="Minimizar" hoverBg={CIRCLE_HOVER} onClick={controls.onMinimize}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
          <rect x="0" y="3.5" width="8" height="1" fill="currentColor" />
        </svg>
      </LinuxButton>
      <LinuxButton label={maximized ? 'Restaurar' : 'Maximizar'} hoverBg={CIRCLE_HOVER} onClick={controls.onToggleMaximize}>
        {maximized ? (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
            <rect x="2" y="0" width="6" height="6" stroke="currentColor" fill="none" />
            <rect x="0" y="2" width="6" height="6" stroke="currentColor" fill="none" />
          </svg>
        ) : (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
            <rect x="0.5" y="0.5" width="7" height="7" stroke="currentColor" fill="none" />
          </svg>
        )}
      </LinuxButton>
      <LinuxButton label="Cerrar" hoverBg={CIRCLE_HOVER_CLOSE} activeBg={CIRCLE_ACTIVE_CLOSE} onClick={controls.onClose}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
          <line x1="0.5" y1="0.5" x2="7.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" />
          <line x1="7.5" y1="0.5" x2="0.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </LinuxButton>
    </div>
  );
}

function LinuxButton({
  label,
  hoverBg,
  activeBg = hoverBg,
  onClick,
  children,
}: {
  label: string;
  hoverBg: string;
  activeBg?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const [bg, setBg] = useState(CIRCLE_DEFAULT);
  const [focused, setFocused] = useState(false);
  const isClose = hoverBg === CIRCLE_HOVER_CLOSE;
  const hovered = bg !== CIRCLE_DEFAULT;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={{
        ...NO_DRAG_STYLE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: TITLEBAR_HEIGHT,
        height: TITLEBAR_HEIGHT,
        border: 'none',
        background: 'transparent',
        cursor: 'default',
        flexShrink: 0,
        padding: 0,
        outline: focused ? '2px solid var(--vela-accent)' : 'none',
        outlineOffset: 1,
      }}
      onMouseEnter={() => setBg(hoverBg)}
      onMouseLeave={() => setBg(CIRCLE_DEFAULT)}
      onMouseDown={() => setBg(activeBg)}
      onMouseUp={() => setBg(hoverBg)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={onClick}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 80ms',
          background: bg,
          color: isClose && hovered ? '#fff' : 'var(--vela-titlebar-fg)',
        }}
      >
        {children}
      </div>
    </button>
  );
}
