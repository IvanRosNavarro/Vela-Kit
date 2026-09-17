import type { Logger } from '../logger';
import { UntrustedFrameError } from './errors';

/** Lo mínimo de `IpcMainEvent` / `IpcMainInvokeEvent` que necesita el guard. */
export interface IpcSenderEvent {
  senderFrame?: { url: string } | null;
}

export interface FrameGuardOptions {
  /** Prefijos de URL de confianza, p. ej. `['vela://', 'file://']`. */
  trustedPrefixes: readonly string[];
  /**
   * Origen exacto del dev server (`http://localhost:5183`), o `null` en
   * producción. Se compara el origen completo: `http://localhost.evil.com`
   * no pasa.
   */
  devServerOrigin: string | null;
  logger: Pick<Logger, 'warn'>;
}

export interface FrameGuard {
  isTrustedFrame(event: IpcSenderEvent): boolean;
  /** Lanza `UntrustedFrameError` y lo registra si el frame no es de confianza. */
  guardTrustedFrame(event: IpcSenderEvent, channel: string): void;
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function createFrameGuard(options: FrameGuardOptions): FrameGuard {
  const isTrustedFrame = (event: IpcSenderEvent): boolean => {
    const url = event.senderFrame?.url ?? '';
    if (!url) return false;
    if (options.trustedPrefixes.some((prefix) => url.startsWith(prefix))) return true;
    return options.devServerOrigin !== null && originOf(url) === options.devServerOrigin;
  };

  const guardTrustedFrame = (event: IpcSenderEvent, channel: string): void => {
    if (isTrustedFrame(event)) return;
    const senderUrl = event.senderFrame?.url ?? '';
    options.logger.warn('[IPC Security] Blocked call from untrusted frame', {
      channel,
      senderUrl,
      timestamp: Date.now(),
    });
    throw new UntrustedFrameError(channel, senderUrl);
  };

  return { isTrustedFrame, guardTrustedFrame };
}
