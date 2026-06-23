# Database migrations — AIU Vanguard

Source of truth for the schema, pulled from the live Supabase project
(ref: `yipecojgakuwcnlzwkne`) and applied in timestamp order.

| Group | What it does |
|-------|--------------|
| `001_schema.sql` | Original base schema (legacy — later migrations harden it). |
| `20260617*` | Security hardening: student_id privacy, column-level security, move student_id → `user_private`. |
| `20260618*` | RAG (pgvector) + Canvas-style **weeks/modules** + `course-materials` bucket. |
| `20260619*` | PII (phone/email) → `user_private`, bucket/trigger-function hardening, course-scoped post notifications. |

## ⚠️ Important
- The **live database already has all of these applied.** Do NOT re-run them against production.
- These were pulled via MCP. For a clean baseline snapshot, run the official
  `supabase db pull` (needs the Supabase CLI + DB password) once set up.
- To re-pull after future MCP changes: re-create a temporary `_export_migrations` RPC
  and run `node scripts/pull-migrations.mjs`.
