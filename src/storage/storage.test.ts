import { describe, expect, it } from 'vitest';
import {
  InvalidMigrationNameError,
  applyMigrations,
  migrationsFromGlob,
  openDatabase,
  transaction,
} from './index';

const m1 = { name: '001-init.sql', sql: 'CREATE TABLE a (id INTEGER PRIMARY KEY, v TEXT);' };
const m2 = { name: '002-b.sql', sql: 'CREATE TABLE b (id INTEGER PRIMARY KEY);' };

describe('storage', () => {
  it('ordena y filtra los ficheros del glob', () => {
    expect(
      migrationsFromGlob({
        './migrations/002-b.sql': 'b',
        './migrations/README.md': 'x',
        './migrations/001-init.sql': 'a',
      }).map((m) => m.name),
    ).toEqual(['001-init.sql', '002-b.sql']);
  });

  it('aplica solo las pendientes y en orden', () => {
    const db = openDatabase({ path: ':memory:', migrations: [m1] });
    expect(applyMigrations(db, [m2, m1])).toEqual(['002-b.sql']);
    expect(applyMigrations(db, [m1, m2])).toEqual([]);
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{ name: string }>)
      .map((r) => r.name);
    expect(tables).toEqual(['a', 'b', 'schema_migrations']);
  });

  it('una migración que falla no deja nada a medias', () => {
    const db = openDatabase({ path: ':memory:', migrations: [m1] });
    const broken = { name: '002-broken.sql', sql: 'CREATE TABLE c (id INTEGER); SELECT * FROM no_existe;' };
    expect(() => applyMigrations(db, [broken])).toThrow();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name='c'").get()).toBeUndefined();
    expect(db.prepare("SELECT name FROM schema_migrations WHERE name='002-broken.sql'").get()).toBeUndefined();
  });

  it('rechaza nombres sin prefijo numérico', () => {
    const db = openDatabase({ path: ':memory:', migrations: [] });
    expect(() => applyMigrations(db, [{ name: 'init.sql', sql: '' }])).toThrow(InvalidMigrationNameError);
  });

  it('transaction hace rollback si lanza', () => {
    const db = openDatabase({ path: ':memory:', migrations: [m1] });
    expect(() =>
      transaction(db, () => {
        db.prepare('INSERT INTO a (v) VALUES (?)').run('x');
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(db.prepare('SELECT COUNT(*) AS n FROM a').get()).toEqual({ n: 0 });
  });
});
