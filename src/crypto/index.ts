import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** Parámetros de derivación. Cambiarlos deja ilegible todo lo ya cifrado. */
export const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1 } as const;

/**
 * Deriva una clave de 32 bytes desde una contraseña con scrypt, más resistente
 * a GPU y ASIC que PBKDF2.
 *
 * `maxmem` explícito: el de Node (32 MiB) es exactamente `N*r*128` bytes y
 * OpenSSL lo rechaza por el overhead mínimo; 64 MiB deja margen.
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32, { ...SCRYPT_PARAMS, maxmem: 64 * 1024 * 1024 }) as Buffer;
}

/** Salt nuevo para `deriveKey`. No es secreto: encarece las tablas precomputadas. */
export function generateSalt(): Buffer {
  return randomBytes(32);
}

/**
 * Cifra con AES-256-GCM.
 * Formato: `[12 bytes IV][ciphertext][16 bytes authTag]`.
 */
export function encrypt(data: Buffer | string, key: Buffer): Buffer {
  const iv = randomBytes(12);
  const input = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(input), cipher.final()]);
  return Buffer.concat([iv, ct, cipher.getAuthTag()]);
}

/**
 * Descifra lo que produjo `encrypt`. Lanza si la clave es otra o los datos
 * están corrompidos (falla el authTag).
 */
export function decrypt(packed: Buffer, key: Buffer): Buffer {
  if (packed.length < 12 + 16) throw new Error('Datos cifrados incompletos');
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(packed.length - 16);
  const ct = packed.subarray(12, packed.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/** Comparación en tiempo constante de dos claves o huellas. */
export function equalSecrets(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}
