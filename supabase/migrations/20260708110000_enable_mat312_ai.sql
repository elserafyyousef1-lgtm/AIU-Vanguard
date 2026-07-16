-- Enable the Vanguard AI tutor for MAT312 Differential Equations. The knowledge base
-- (MAT312_AI_PROMPT) now exists in src/lib/data/mat312.ts, built from the full study-sheet
-- content. Flipping has_ai=true surfaces the AI tab on the course page and lists MAT312 in
-- the global Vanguard AI course picker (which reads has_ai from this table). Idempotent.
update public.courses set has_ai = true where code = 'MAT312';
