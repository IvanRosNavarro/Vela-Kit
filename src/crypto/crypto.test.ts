import { describe, expect, it } from 'vitest';
import { decrypt, deriveKey, encrypt, equalSecrets, generateSalt } from './index';

describe('crypto', () => {
  it('la misma contraseña y salt dan la misma clave; otro salt, otra', () => {
    const salt = generateSalt();
    expect(salt).toHaveLength(32);
    const key = deriveKey('correcta caballo batería grapa', salt);
    expect(key).toHaveLength(32);
    expect(equalSecrets(key, deriveKey('correcta caballo batería grapa', salt))).toBe(true);
    expect(equalSecrets(key, deriveKey('correcta caballo batería grapa', generateSalt()))).toBe(false);
    expect(equalSecrets(key, deriveKey('otra contraseña', salt))).toBe(false);
  });

  it('cifra y descifra texto y binario', () => {
    const key = deriveKey('clave', generateSalt());
    expect(decrypt(encrypt('hola ñandú', key), key).toString('utf-8')).toBe('hola ñandú');
    const binary = Buffer.from([0, 1, 2, 255, 0]);
    expect(decrypt(encrypt(binary, key), key).equals(binary)).toBe(true);
  });

  it('cada cifrado usa un IV distinto', () => {
    const key = deriveKey('clave', generateSalt());
    expect(encrypt('igual', key).equals(encrypt('igual', key))).toBe(false);
  });

  it('falla con otra clave o con los datos alterados', () => {
    const salt = generateSalt();
    const key = deriveKey('clave', salt);
    const packed = encrypt('secreto', key);
    expect(() => decrypt(packed, deriveKey('otra', salt))).toThrow();

    const tampered = Buffer.from(packed);
    tampered[20] ^= 0xff;
    expect(() => decrypt(tampered, key)).toThrow();
    expect(() => decrypt(Buffer.alloc(8), key)).toThrow('Datos cifrados incompletos');
  });
});
