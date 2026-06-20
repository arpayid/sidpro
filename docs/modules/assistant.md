# Module: AI Assistant

Purpose: FAQ-style public assistant for common village service questions without exposing PII.

Users: public visitors; admin configures adapter mode via environment.

Adapter pattern (`apps/api/src/modules/assistant/adapters/`):

| Adapter | Env `ASSISTANT_ADAPTER` | Behavior |
|---------|-------------------------|----------|
| Static FAQ | `static` (default) | Keyword match from `assistant.faq.ts` |
| LLM stub | `llm_stub` | Placeholder — external LLM not configured |

Screens:

- `/bantuan-ai` — ask form + answer display

API:

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/assistant/public/faq` | public |
| POST | `/api/v1/assistant/public/ask?tenantCode=` | public (throttled) |

Constraints:

- No NIK/KK in requests or logs sent to external providers without explicit adapter + consent.
- External LLM requires dedicated adapter implementation before production use.

Tag: `mvp-ai-v2` (Wave 26 — adapter foundation).
