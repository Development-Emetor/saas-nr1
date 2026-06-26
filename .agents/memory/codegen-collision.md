---
name: Orval OpenAPI Codegen Collision Fix
description: Orval generates duplicate XxxParams types when path and query params coexist on the same endpoint
---

**Rule:** When using Orval for OpenAPI codegen, endpoints that have both path parameters AND query parameters can generate a `TS2308: Module has already exported a binding named 'XxxParams'` collision error.

**Why:** Orval generates separate `XxxParams` types for path params and query params on the same endpoint. If both exist, it exports two types with the same name.

**How to apply:** Remove query parameters from the OpenAPI spec on endpoints that also have path parameters, or use `operationId` overrides in the Orval config to disambiguate. The affected spec is `lib/api-spec/openapi.yaml`.
