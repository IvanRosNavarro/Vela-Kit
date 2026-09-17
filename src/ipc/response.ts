/** Códigos de error comunes. Cada app los amplía con los suyos. */
export type BaseIpcErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'INVARIANT'
  | 'NOT_IMPLEMENTED'
  | 'INTERNAL'
  | 'CANCELLED'
  | 'UNTRUSTED_FRAME';

/** Respuesta de un handler IPC. Los handlers nunca lanzan al renderer. */
export type IpcResponse<T, E extends string = BaseIpcErrorCode> =
  | { ok: true; data: T }
  | { ok: false; error: E; details?: unknown };

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function fail<E extends string>(error: E, details?: unknown): { ok: false; error: E; details?: unknown } {
  return details === undefined ? { ok: false, error } : { ok: false, error, details };
}
