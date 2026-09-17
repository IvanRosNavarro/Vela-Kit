import { create } from 'zustand';

export type ToastVariant = 'info' | 'warning' | 'error' | 'success';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  onClick?: () => void;
}

export interface ToastState {
  toasts: Toast[];
  push: (message: string, variant?: ToastVariant, onClick?: () => void) => string;
  dismiss: (id: string) => void;
}

export const TOAST_TIMEOUT_MS = 4000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push(message, variant = 'info', onClick) {
    const id = globalThis.crypto.randomUUID();
    const next: Toast = onClick ? { id, message, variant, onClick } : { id, message, variant };
    set((state) => ({ toasts: [...state.toasts, next] }));
    globalThis.setTimeout(() => {
      get().dismiss(id);
    }, TOAST_TIMEOUT_MS);
    return id;
  },
  dismiss(id) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

/**
 * Aviso al usuario. Con `onClick` el toast es clicable: ejecuta la acción y se
 * descarta. Nunca usar `alert`, `confirm` ni notificaciones del SO para esto.
 */
export function toast(message: string, variant?: ToastVariant, onClick?: () => void): string {
  return useToastStore.getState().push(message, variant, onClick);
}
