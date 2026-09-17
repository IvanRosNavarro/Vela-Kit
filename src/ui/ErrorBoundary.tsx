import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  /** Para enviar el error al log de la app. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Pantalla de error de renderizado con botón de reintento. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          background: 'var(--vela-bg, #0e0f12)',
          color: 'var(--vela-fg, #e6e8ee)',
          fontFamily: 'monospace',
          padding: 32,
        }}
      >
        <div style={{ fontSize: 14, color: 'var(--vela-danger, #ff8a8a)', fontWeight: 600 }}>
          {this.props.title ?? 'Error de renderizado'}
        </div>
        <pre
          style={{
            fontSize: 11,
            color: 'var(--vela-fg-muted, #8c93a3)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxWidth: 640,
            maxHeight: 320,
            overflow: 'auto',
            background: 'var(--vela-bg-elevated, #1c1f25)',
            padding: 12,
            borderRadius: 6,
          }}
        >
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: 'none',
            background: 'var(--vela-accent, #46b5a0)',
            color: 'var(--vela-accent-fg, #fff)',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }
}
