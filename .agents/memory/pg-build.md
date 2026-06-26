---
name: pg Externalization in esbuild
description: The `pg` package must be listed as external in artifacts/api-server/build.mjs
---

**Rule:** Always include `"pg"` in the `external` array in `artifacts/api-server/build.mjs`.

**Why:** esbuild tries to bundle `pg`, which has native bindings (`pg-native`) that fail to bundle. Externalizing it lets Node.js resolve it at runtime from `node_modules`.

**How to apply:** In `build.mjs`, ensure the esbuild options include `external: ["pg", ...]`.
