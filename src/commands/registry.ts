import type { z } from 'zod';

/** Datos de un comando visibles fuera del main (paleta, ajustes de atajos). */
export interface CommandDefinition<Ctx, Category extends string = string, Args = void> {
  id: string;
  title: string;
  category: Category;
  defaultShortcut?: string;
  argsSchema?: z.ZodType<Args>;
  /** Si el comando solo aplica en ciertos contextos (la paleta lo oculta). */
  isVisible?: (ctx: Ctx) => boolean;
}

export interface RegisteredCommand<Ctx, Category extends string = string, Args = unknown>
  extends CommandDefinition<Ctx, Category, Args> {
  run: (ctx: Ctx, args: Args) => Promise<void> | void;
}

interface DefinitionWithSchema<Ctx, Category extends string, S extends z.ZodType> {
  id: string;
  title: string;
  category: Category;
  defaultShortcut?: string;
  argsSchema: S;
  isVisible?: (ctx: Ctx) => boolean;
  run: (ctx: Ctx, args: z.output<S>) => Promise<void> | void;
}

interface DefinitionWithoutSchema<Ctx, Category extends string> {
  id: string;
  title: string;
  category: Category;
  defaultShortcut?: string;
  isVisible?: (ctx: Ctx) => boolean;
  run: (ctx: Ctx) => Promise<void> | void;
}

export interface CommandDefiner<Ctx, Category extends string> {
  <S extends z.ZodType>(cmd: DefinitionWithSchema<Ctx, Category, S>): RegisteredCommand<Ctx, Category, z.output<S>>;
  (cmd: DefinitionWithoutSchema<Ctx, Category>): RegisteredCommand<Ctx, Category, void>;
}

/**
 * Devuelve un `defineCommand` atado al contexto y las categorías de la app.
 * Con `argsSchema`, el tipo de `args` en `run` se infiere del schema.
 *
 * ```ts
 * export const defineCommand = createCommandDefiner<AppCommandContext, AppCategory>();
 * ```
 */
export function createCommandDefiner<Ctx, Category extends string = string>(): CommandDefiner<Ctx, Category> {
  return ((cmd: unknown) => cmd) as CommandDefiner<Ctx, Category>;
}

export class DuplicateCommandError extends Error {
  constructor(readonly commandId: string) {
    super(`Command already registered: ${commandId}`);
    this.name = 'DuplicateCommandError';
  }
}

export class UnknownCommandError extends Error {
  constructor(readonly commandId: string) {
    super(`Unknown command: ${commandId}`);
    this.name = 'UnknownCommandError';
  }
}

export class InvalidCommandArgsError extends Error {
  constructor(readonly commandId: string, readonly issues: unknown) {
    super(`Invalid args for ${commandId}`);
    this.name = 'InvalidCommandArgsError';
  }
}

/** Registro central de comandos. Los atajos y la paleta se construyen desde aquí. */
export class CommandRegistry<Ctx, Category extends string = string> {
  private readonly commands = new Map<string, RegisteredCommand<Ctx, Category, unknown>>();

  register<Args>(cmd: RegisteredCommand<Ctx, Category, Args>): void {
    if (this.commands.has(cmd.id)) {
      throw new DuplicateCommandError(cmd.id);
    }
    this.commands.set(cmd.id, cmd as RegisteredCommand<Ctx, Category, unknown>);
  }

  unregister(id: string): void {
    this.commands.delete(id);
  }

  get(id: string): RegisteredCommand<Ctx, Category, unknown> | undefined {
    return this.commands.get(id);
  }

  list(): readonly RegisteredCommand<Ctx, Category, unknown>[] {
    return [...this.commands.values()];
  }

  async execute(id: string, ctx: Ctx, args?: unknown): Promise<void> {
    const cmd = this.commands.get(id);
    if (!cmd) {
      throw new UnknownCommandError(id);
    }
    let resolvedArgs: unknown = args;
    if (cmd.argsSchema) {
      // Sin args se prueba con {} para que los comandos con todos los campos
      // opcionales funcionen desde un atajo de teclado.
      const parsed = cmd.argsSchema.safeParse(args ?? {});
      if (!parsed.success) {
        throw new InvalidCommandArgsError(id, parsed.error.issues);
      }
      resolvedArgs = parsed.data;
    }
    await cmd.run(ctx, resolvedArgs);
  }
}
