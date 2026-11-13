// packages/shared/src/index.ts: the "barrel" file. "exports" in package.json
// points here, so whatever this file re-exports is what web and server can
// import from "@jejune/shared".
//
// As you fill in the subfolders (models/, schemas/, events/, providers/,
// intelligence/; see PLAN §10), re-export each one from here:
//   export * from "./<folder>/<file>";
//
// For now, export one trivial constant so you can prove the workspace link
// works end-to-end (import it from server and from web, then run typecheck).
// Delete it once real schemas exist.
//
// Reminder: with verbatimModuleSyntax on, consumers import types using
//   import type { Project } from "@jejune/shared";
// and import runtime values (Zod schemas) with a normal import.

export type Probe = "VALUE";
export const PROBE = "VALUE";
