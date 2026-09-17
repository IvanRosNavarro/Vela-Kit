import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Logger } from '../logger';

export interface Migration {
  /** Nombre del fichero, p. ej. `001-init.sql`. Se aplican en orden alfabético. */
  name: string;
  sql: string;
}

const MIGRATION_NAME = /^\d+-.+\.sql$/;

/**
 * Convierte el resultado de
 * `import.meta.glob('./migrations/*.sql', { query: '?raw', import: 'default', eager: true })`
 * en migraciones ordenadas. Ignora ficheros que no sigan `NNN-nombre.sql`.
 */
export function migrationsFromGlob(files: Record<string, string>): Migration[] {
  return Object.entries(files)
    .map(([file, sql]) => ({ name: path.basename(file), sql }))
    .filter(({ name }) => MIGRATION_NAME.test(name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export class InvalidMigrationNameError extends Error {
  constructor(readonly migrationName: string) {
    super(`Nombre de migración no válido: ${migrationName} (formato NNN-nombre.sql)`);
    this.name = 'InvalidMigrationNameError';
  }
}

/** Ejecuta `fn` en una transacción; si lanza, hace rollback y relanza. */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // si el rollback falla, el error original es el útil
    }
    throw err;
  }
}

/**
 * Aplica las migraciones pendientes, cada una en su transacción, y las anota
 * en `schema_migrations`. Devuelve los nombres aplicados en esta llamada.
 */
export function applyMigrations(
  db: DatabaseSync,
  migrations: readonly Migration[],
  logger?: Pick<Logger, 'info'>,
): string[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  const applied = new Set(
    (db.prepare('SELECT name FROM schema_migrations').all() as Array<{ name: string }>).map((r) => r.name),
  );

  const sorted = [...migrations].sort((a, b) => a.name.localeCompare(b.name));
  const newlyApplied: string[] = [];
  for (const { name, sql } of sorted) {
    if (!MIGRATION_NAME.test(name)) throw new InvalidMigrationNameError(name);
    if (applied.has(name)) continue;
    transaction(db, () => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
    });
    logger?.info(`[storage] migración aplicada: ${name}`);
    newlyApplied.push(name);
  }
  return newlyApplied;
}

export interface OpenDatabaseOptions {
  /** Ruta del fichero, o `:memory:` en tests. */
  path: string;
  migrations: readonly Migration[];
  logger?: Pick<Logger, 'info'>;
}

/** Abre la BD con los PRAGMA de la familia Vela y aplica las migraciones. */
export function openDatabase(options: OpenDatabaseOptions): DatabaseSync {
  const db = new DatabaseSync(options.path);
  if (options.path !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL');
  }
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  applyMigrations(db, options.migrations, options.logger);
  return db;
}
