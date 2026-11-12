# Handoff: Milestone 0, workspace scaffold

Last updated: 2026-11-12

Use this to resume work in a new session. The full product spec and roadmap are in [`docs/PLAN.md`](./PLAN.md). Read §3 (stack), §10 (module layout), and §12 (Milestone 0) first.

## How the user wants to work

- **The user is learning the stack (new to pnpm workspaces) and types most of the code themselves.** The default way to help is to create files that contain **only explanatory comments** (what goes in the file, why, and the commands to run) and let them write the real content.
- The exception is when they explicitly ask for the content to be written for them, as they did for `.gitignore` and the tsconfig files. In those cases, write the real config **with comments explaining each choice**.
- JSON doesn't allow comments, so guidance for `package.json` files goes in a `PACKAGE_JSON.md` beside the file, and the `package.json` itself stays valid (`{}` at minimum).
- Keep the scope to exactly what was asked. Don't start the next Milestone 0 step without being asked.

## Environment

| Tool | Version | Notes |
|---|---|---|
| Node | 24.x | `engines.node: ">=24"` |
| pnpm | 10.33.3 | pinned via `packageManager` |
| TypeScript | 7.0.x | the native compiler. Since TS 6, `types` defaults to `[]`, `esModuleInterop` is always on, and `strict` is on by default |
| Shell | zsh | **quote any argument containing `*`**, e.g. `'@jejune/shared@workspace:*'`, or zsh tries to expand it as a filename wildcard |

## Workspace layout

```
pnpm-workspace.yaml     packages: apps/*, packages/*; onlyBuiltDependencies: better-sqlite3, esbuild
package.json            root, private; scripts fan out with pnpm -r (dev uses --parallel); devDep: typescript
tsconfig.base.json      shared compiler options (commented)
.gitignore              commented by section
apps/web                @jejune/web: React + Vite (not installed yet)
apps/server             @jejune/server: Fastify (not installed yet), runs via tsx
packages/shared         @jejune/shared: Zod contracts; depends on zod
docs/PLAN.md            spec
```

The empty module folders from PLAN §10 already exist under each `src/` (e.g. `apps/server/src/{api,db,projects,...}`, `packages/shared/src/{models,schemas,events,providers,intelligence}`).

## Decisions made (and why)

- **Package scope is `@jejune/*`.** Apps depend on shared through `"@jejune/shared": "workspace:*"`.
- **`shared` has no build step.** Its `exports["."]` points straight at `./src/index.ts`. Vite and tsx compile workspace `.ts` files themselves, so edits show up immediately.
- **tsc only type-checks.** The base config sets `noEmit: true`, `module: Preserve`, and `moduleResolution: Bundler`, so relative imports don't need `.js` extensions. Vite builds web; tsx runs server (`dev` = `tsx watch src/index.ts`, `start` = `tsx src/index.ts`). Whether the server gets a bundled build step is deferred (PLAN §15).
- **Strictness:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`. `exactOptionalPropertyTypes` is the most likely to clash with library types; it's fine to drop it if it causes friction.
- **Each package only sees its own environment's types:**
  - shared: `lib: ["ES2022"]`, `types: []`, so no DOM and no Node (it must run in both).
  - server: `lib: ["ES2022"]`, `types: ["node"]`.
  - web: `lib: ["ES2022","DOM","DOM.Iterable"]`, `jsx: "react-jsx"`, `types: []`. **Change this to `["vite/client"]` once Vite is installed.** `vite.config.ts` will need its own `tsconfig.node.json`.
- **pnpm 10 blocks dependency install scripts by default.** `better-sqlite3` and `esbuild` are allowed in `onlyBuiltDependencies`. Add any other native dependencies there.

## Current state

- Committed through `4f1edfb` (gitignore). **The four tsconfig files are modified but not committed.**
- `pnpm install` has been run. The workspace symlinks for `@jejune/shared` exist in web and server.
- `pnpm typecheck`:
  - `shared` passes.
  - `web` and `server` fail with `TS18003: No inputs were found`, only because `src/` contains no `.ts` files yet. Adding entry files fixes this.
- The configs were checked earlier with temporary files (since deleted):
  - shared → server and shared → web imports resolve.
  - `node:fs` type-checks in server.
  - `process` is correctly rejected in web.
  - JSX in web fails until React and its types are installed.
- `packages/shared/src/index.ts` contains only guidance comments. Its next step is a trivial test export (e.g. `export const PROBE = ...`) imported from both apps to prove the link end to end.
- `apps/web/PACKAGE_JSON.md` and `apps/server/PACKAGE_JSON.md` now contain only "Later in Milestone 0" dependency notes.

## Next steps (PLAN §12, Milestone 0)

1. Commit the tsconfig changes.
2. Add `apps/server/src/index.ts` and a web entry file. Add the test export in shared, import it in both apps, and get `pnpm typecheck` green.
3. **React shell and navigation:** install vite, react, react-dom, @vitejs/plugin-react, @types/react, @types/react-dom, then Tailwind + shadcn/ui, TanStack Query, and a router. Set web `types` to `["vite/client"]` and add `tsconfig.node.json`. If you use `pnpm create vite`, run it in a scratch folder and copy pieces over.
4. **Fastify server:** install fastify, zod, and pino. Bind to localhost (§3.1).
5. **SQLite + migrations:** install drizzle-orm and better-sqlite3, plus drizzle-kit as a dev dependency. The DB files are gitignored (`*.db*`); migration `.sql` files are committed.
6. **Shared contracts:** Zod schemas in `packages/shared/src/schemas`, types in `models`.
7. **Project registry** (CRUD + persistence), **local configuration**, and **integration test infrastructure** (Vitest; Playwright later).

**Exit criterion:** projects can be registered, persisted, edited, and reopened after restarting the application.
