---
name: Replit Auth quirks
description: Non-obvious gotchas when wiring Replit Auth into this monorepo
---

## Field name
Auth route template uses `profileImageUrl` (camelCase) to match `profile_image_url` column in `usersTable`. Do not rename to `profileImage`.

## replit-auth-web lib tsconfig
Must include `"composite": true` and `"declarationMap": true` — without composite the web app's project references fail with TS6306.

## import.meta.env in a shared lib
Libs in `lib/` do not have `vite/client` types available. Use:
```ts
const meta = import.meta as unknown as { env?: { BASE_URL?: string } };
const base = meta.env?.BASE_URL ?? "/";
```
Never add `"types": ["vite/client"]` to a non-app tsconfig — it causes TS2688.

## DB push without TTY
`drizzle-kit push` is interactive and fails in non-TTY shells (CI, Replit bash tool).
**Fix:** Apply schema changes via `psql "$DATABASE_URL" -c "ALTER TABLE ..."` directly.

## AuthProvider not needed
`useAuth()` from replit-auth-web manages its own state internally. No `<AuthProvider>` wrapper required — just call the hook inside a component tree under `QueryClientProvider`.
