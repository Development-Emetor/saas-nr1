---
name: Anthropic AI Integration Setup
description: Anthropic AI integration via Replit requires phone verification; integration template is in lib/integrations-anthropic-ai
---

**Rule:** Before calling `setupReplitAIIntegrations()` for Anthropic, phone verification must be completed in the Replit account settings.

**Why:** Replit's Anthropic proxy requires verified identity. Without it, the setup call fails silently.

**How to apply:** If Anthropic integration fails during setup, prompt the user to complete phone verification at replit.com/account, then re-run the setup. The integration template lives in `lib/integrations-anthropic-ai/`.
