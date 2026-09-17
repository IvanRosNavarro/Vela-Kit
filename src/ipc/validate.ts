import type { z } from 'zod';
import { fail, ok } from './response';

/**
 * Valida un payload IPC con zod. Devuelve directamente la respuesta de error
 * que el handler puede retornar al renderer.
 */
export function validatePayload<S extends z.ZodType>(
  schema: S,
  raw: unknown,
): { ok: true; data: z.output<S> } | { ok: false; error: 'INVALID_INPUT'; details?: unknown } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return fail('INVALID_INPUT', parsed.error.issues);
  }
  return ok(parsed.data);
}
