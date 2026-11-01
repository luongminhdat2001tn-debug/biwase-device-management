# AGENTS.md — biwase-device-management

Next.js 16 + React 19 + Tailwind v4 + shadcn (`new-york`) + Supabase. Vietnamese-language warehouse/HR app for BIWASE Long An. Product requirements live in `final_requirement.txt` (Vietnamese).

## Commands

- `npm run dev` / `npm run build` / `npm run start` — only scripts in `package.json`. No test, typecheck, or lint setup (no eslint config installed despite `lint` script).
- Path alias: `@/*` maps to repo root (`tsconfig.json`), e.g. `@/lib/db`, `@/components/sidebar`.

## Architecture

- Routes (all `'use client'` pages): `app/page.tsx` (login), `app/dashboard|warehouse|inventory|history|account|hr/page.tsx`. Shared shell: `components/sidebar.tsx`.
- Data layer boundary: **all Supabase access goes through `lib/db.ts`** — pages must not call `supabase.from()` directly. Types, `CHUC_NANG_LIST` (permission IDs), `WAREHOUSES` live in `lib/constants.ts`; client in `lib/supabase.ts`.
- Supabase snake_case ↔ frontend camelCase: always go through the `map*FromDB` / `map*ToDB` mappers in `lib/db.ts` (e.g. `chuc_vu` ↔ `chucVu`). Tables: `accounts`, `products` (soft-delete via `is_deleted`), `history_log`, `employees`. Image bucket: `images` (`uploadImage`/`deleteImage` helpers in `lib/db.ts`).
- Auth is client-side only: `getAccountByCredentials` (plaintext password match) → session in `localStorage` key `'user'` → `window.location.href` redirects (`'/'` if no session). Permission check helper: `hasPermissionFromSession()` in `lib/constants.ts`. Permissions are multi-select checkbox arrays (`chucNang: string[]`).
- Never delete the `is_admin` account. `products` deletes must be soft (`is_deleted: true` via `deleteProduct`).

## Supabase / env

- Env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) comes from `.env.local`, which is gitignored (`.env*`). Never commit it, `acc.txt`, or ad-hoc SQL (`fix_ghi_chu.sql`).
- Schema/migrations are manual: apply `supabase/schema.sql` via Supabase SQL Editor; seed data in `supabase/seed.sql`. RLS is enabled with permissive demo anon policies — keep that way unless asked.

## Conventions & gotchas

- `next.config.mjs` ignores TS build errors and uses unoptimized images — `next build` will not catch type errors, so self-review types.
- Vietnamese UI + Vietnamese code comments are the established style (per client requirements); keep new code commented the same way.
- Tailwind v4 via `@tailwindcss/postcss`; shadcn aliases in `components.json` (`@/components`, `@/lib`, `@/hooks`); icons via `lucide-react`.

## Workflow rules (Superpowers)

Skills are loaded with the `skill` tool, not slash commands. If a named skill
isn't found, use the `skill` tool to list available skills and pick the closest
match. Do not skip a step because the skill is missing; tell the user instead.

Always check `docs/` first. Existing feature → update its file. New feature →
create `docs/specs/<page_name>.md` (English, e.g. warehouse.md).

For any non-trivial task, follow these steps in order and stop at each gate:

1. Spec: load the `brainstorming` skill. Write or update
   `docs/specs/<page_name>.md`. STOP and wait for user approval.
2. Plan: load the `writing-plans` skill. Write or update
   `docs/plans/<page_name>.md` with checkbox steps. The final step must be
   "update the spec if behavior changed." STOP and wait for user approval.
3. Implement: load the `executing-plans` skill. Work test-first, tick plan
   checkboxes as you go, and run the test/lint commands after each batch.
4. Before finishing: load the code-review skill
   (`requesting-code-review`) and the `verification-before-completion` skill,
   then confirm all checkboxes are ticked.

Save all outputs to the paths above, not to any default location.
Skip this workflow only for trivial fixes (typos, one-line changes).

## Code minimalism (Ponytail)

- Before step 3, load the `ponytail` skill and keep it active at `full` level
  for the whole implementation. Before writing new code, check for existing
  code, the stdlib, native platform features, or already-installed dependencies.
- In plans, prefer reusing existing modules over creating new ones, and
  list what existing code each step reuses.
- Never trade away validation, security, or accessibility to write less code.
- Before finishing, load the `ponytail-review` skill to check for
  over-engineering, in addition to the normal code-review skill.
- If Ponytail and the approved spec/plan conflict, the spec and plan win.
  Ask the user instead of silently dropping requirements.
- Required tests are never "dead code." Do not delete them for minimalism.