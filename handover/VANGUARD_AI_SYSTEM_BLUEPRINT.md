# Vanguard AI — Multi-Agent System Blueprint & Verification

> Grounded in the real AIU Vanguard codebase (Next.js 14 + Supabase; `AIPanel.tsx`, `/api/ai-tutor`, `/api/ai-tutor-pro`, `aiPersona.ts`). Numbers are real where the code defines them, and realistic estimates (clearly labelled) for an AIU student platform — NOT a fictional hyperscale system. A short **Current vs Required** audit closes the document.

---

## SECTION 01 — SYSTEM IDENTITY

| Field | Value |
|---|---|
| System Name | Vanguard AI (the tutor brain of the AIU Vanguard platform) |
| Version | 3.0.0 (brain); runs inside app `aiu-cs-hub` v2.0.0 |
| Core Objective | A bilingual (Egyptian Arabic / MSA / English), exam-focused AI tutor that makes AIU CS students genuinely master their registered courses. |
| Primary Users | AIU CS students (Semester 4 active), non-technical, heaviest use in evenings and exam weeks; staff/admin roles for oversight only. |
| Request Volume | Launch: ~500–2,000 requests/day, peak 2–5 RPS (evening). 6 months: ~3,000–8,000/day, peak 10–20 RPS (exam season). [ESTIMATE — confirm against Vercel analytics] |
| Latency Budget | P50 ≤ 2,500 ms · P95 ≤ 6,000 ms · P99 ≤ 10,000 ms (no streaming today; LLM generation dominates). |
| Cost Ceiling | Free tier (Gemini) ≈ $0 (free quota). Pro tier (Claude Sonnet) ≤ $0.02/request. Monthly target ≤ $150–300 at launch. [ESTIMATE — verify live model pricing] |
| Safety Level | MEDIUM — educational, possibly minors, bilingual. Real risks: fabricated exam facts, academic-integrity misuse, PII pasted into chat. Not health/finance/legal → not HIGH. |
| Failure Tolerance | Study aid, not life-critical. Target ≤ ~250 min/month AI unavailability (~99.4%). The site must NEVER go down because the AI is down — AI degrades to a safe message. |

**Success KPIs (5, all measurable)**
- KPI 1: Answer quality → composite validator score ≥ 0.80 avg → measured from `response_validator` logs.
- KPI 2: Latency → P95 ≤ 6,000 ms → measured from `latency_ms` metadata on every response.
- KPI 3: Fabrication rate → < 1% → (validator-flagged + user-reported wrong facts) / total answers.
- KPI 4: Cost efficiency → ≤ $0.012 avg per answered request → token-cost logs (input×rate + output×rate).
- KPI 5: Continuity → ≥ 99% of requests get a real answer despite tier limits → free→pro / pro→free fallback success logs.

**Non-Goals (3)**
1. Will NOT complete live graded assessments for students (academic integrity) — it teaches the method, it does not submit answers to a running exam.
2. Will NOT be a general chatbot — off-topic requests get a warm one-line redirect to studying.
3. Will NOT present content beyond the registered courses' level as authoritative — it stays inside the course knowledge bases.

---

## SECTION 02 — AGENT REGISTRY

Vanguard's "agents" are pipeline roles. In the real app the *course* is already known (the panel opens per-course), so routing is mostly **request-type + tier selection**, not course selection. 9 agents:

```
╔══════════════════════════════════════════════════════════════════╗
║  AGENT ID:   input_validator                                     ║
║  NAME:       Input Validator        VERSION: 1.0.0   LAYER: ENTRY ║
╠══════════════════════════════════════════════════════════════════╣
║  SINGLE RESPONSIBILITY: Accept or reject a raw user message before any model is called. ║
╠══════════════════════════════════════════════════════════════════╣
║  TRIGGER — Primary: every inbound message. Secondary: none.       ║
║  Never: process anything already validated this turn.             ║
╠══════════════════════════════════════════════════════════════════╣
║  INPUT  — Required: text:string (raw). courseSlug:string.         ║
║           Optional: locale:string (default auto-detect).          ║
║  OUTPUT — Success: {ok:true, text, detectedLang}                  ║
║           Error:   {error_code:'INPUT_INVALID', error_msg, retry_safe:false} ║
╠══════════════════════════════════════════════════════════════════╣
║  MODEL/TOOL: pure function. SYSTEM PROMPT: none. TEMP: n/a.       ║
╠══════════════════════════════════════════════════════════════════╣
║  CONTRACTS: timeout 20ms · max input 4000 chars (real: route enforces 4000/msg, ≤30 msgs) · cost $0 ║
╠══════════════════════════════════════════════════════════════════╣
║  FAILURE — timeout: pass-through (fail-open on validator latency). ║
║   bad output: reject with INPUT_INVALID. api error: n/a.          ║
║   retries exhausted: return structured error to user.             ║
╠══════════════════════════════════════════════════════════════════╣
║  DEPENDS ON: none. DEPENDED ON BY: orchestrator. STATE: STATELESS.║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  AGENT ID:   orchestrator                                        ║
║  NAME:       Orchestrator           VERSION: 1.0.0  LAYER: ROUTING║
╠══════════════════════════════════════════════════════════════════╣
║  SINGLE RESPONSIBILITY: Coordinate the request pipeline and own working memory + priority. ║
╠══════════════════════════════════════════════════════════════════╣
║  TRIGGER — Primary: validated input. Never: invalid/empty input.  ║
║  INPUT  — Required: text, courseSlug, sessionId, history[].       ║
║  OUTPUT — Success: routed plan {tier, mode, knowledge}. Error: routes to fallback_agent. ║
║  MODEL/TOOL: pure function (calls intent_router). TEMP: n/a.      ║
║  CONTRACTS: timeout 30ms · cost $0.                               ║
║  FAILURE — any internal error → fallback_agent. retry_safe:true.  ║
║  DEPENDS ON: intent_router, course_knowledge_provider, session_memory, tutor_agent. ║
║  DEPENDED ON BY: input_validator(after). STATE: STATEFUL (per-request working memory). ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  AGENT ID:   intent_router                                       ║
║  NAME:       Intent Router          VERSION: 1.0.0  LAYER: ROUTING║
╠══════════════════════════════════════════════════════════════════╣
║  SINGLE RESPONSIBILITY: Classify request TYPE and pick the model TIER + confidence. ║
║  TRIGGER — Primary: called by orchestrator. Never: runs alone.    ║
║  INPUT  — Required: text, history. Optional: lastTier.            ║
║  OUTPUT — Success: {mode:'explain|check|quiz|summary|worked', tier:'free|pro', confidence, reasoning} ║
║           Error: {error_code:'ROUTE_LOWCONF', retry_safe:true}    ║
║  MODEL/TOOL: pure function (keyword + signal scoring). TEMP: n/a. ║
║  CONTRACTS: timeout 15ms · cost $0.                               ║
║  FAILURE — low confidence (<0.50) → default mode 'explain', free tier. ║
║  DEPENDS ON: none. DEPENDED ON BY: orchestrator. STATE: STATELESS.║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  AGENT ID:   course_knowledge_provider                           ║
║  NAME:       Course Knowledge       VERSION: 1.0.0  LAYER: MEMORY ║
╠══════════════════════════════════════════════════════════════════╣
║  SINGLE RESPONSIBILITY: Return the authoritative knowledge base for a courseSlug. ║
║  TRIGGER — Primary: orchestrator needs course knowledge.          ║
║  INPUT  — Required: courseSlug. OUTPUT — Success: {knowledge:string} (may be '' if none). ║
║  MODEL/TOOL: pure function = getCourseKnowledge() from aiPersona.ts. TEMP: n/a. ║
║  CONTRACTS: timeout 5ms · cost $0.                                ║
║  FAILURE — unknown slug → returns '' (tutor falls back to fundamentals). ║
║  DEPENDS ON: none. DEPENDED ON BY: orchestrator. STATE: STATELESS.║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  AGENT ID:   tutor_agent                                         ║
║  NAME:       Vanguard Tutor (THE BRAIN)  VERSION: 3.0.0  LAYER: EXECUTION ║
╠══════════════════════════════════════════════════════════════════╣
║  SINGLE RESPONSIBILITY: Produce the teaching answer grounded in the course knowledge + persona. ║
║  TRIGGER — Primary: orchestrator routes a validated request. Never: unvalidated input, off-topic. ║
║  INPUT  — Required: system(buildSystemPrompt output), messages[]. Optional: mode hint. ║
║  OUTPUT — Success: {reply:string}. Error: {error_code:'LLM_ERROR'|'limit_reached', retry_safe} ║
║  MODEL/TOOL: free = Gemini gemini-flash-latest (/api/ai-tutor); pro = Claude claude-sonnet-4-6 (/api/ai-tutor-pro). ║
║  SYSTEM PROMPT (first 2 sentences): "You are Vanguard AI — the elite academic tutor of the AIU Vanguard platform at AIU. Your single purpose is to make students genuinely MASTER their material and excel in difficult exams." ║
║  TEMPERATURE: 0.7 (real) — teaching needs warmth/variety, not determinism. ║
║  CONTRACTS: confidence n/a (LLM) · max retries 3 · timeout 12,000ms · max input ~4,000 tok · max output 3,000 tok (real) · cost: free ≈$0, pro ≈$0.016/call [ESTIMATE]. ║
║  FAILURE — timeout: retry w/ backoff. bad output: validator triggers Loop A. api error 5xx: fallback_agent. 429: free→offer pro; pro→free + notify owner (real behavior). ║
║  DEPENDS ON: course_knowledge_provider, session_memory. DEPENDED ON BY: orchestrator, response_validator. STATE: STATELESS (per call). ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  AGENT ID:   response_validator                                  ║
║  NAME:       Response Validator     VERSION: 1.0.0  LAYER: VALIDATION ║
╠══════════════════════════════════════════════════════════════════╣
║  SINGLE RESPONSIBILITY: Score answer quality + enforce Vanguard's hard output rules. ║
║  TRIGGER — Primary: tutor_agent returns a reply. Never: before reply exists. ║
║  INPUT  — Required: reply, originalText, detectedLang, mode.      ║
║  OUTPUT — Success: {score:0..1, pass:bool, violations:[]}. Error: {error_code:'VALIDATE_ERR', retry_safe:true} ║
║  MODEL/TOOL: pure-function heuristics (cheap) + optional LLM check for fabrication on pro. TEMP: 0 if LLM. ║
║  CONTRACTS: threshold 0.72 PASS · max retries 0 (it triggers tutor retries) · timeout 20ms (heuristic) · cost ≈$0. ║
║  CHECKS: language matches student; NO markdown/asterisks/backticks/emojis; not truncated; non-empty; mode-fit (worked problem has steps). ║
║  FAILURE — validator error: fail-open (PASS) + log, never block the student. ║
║  DEPENDS ON: tutor_agent output. DEPENDED ON BY: orchestrator. STATE: STATELESS. ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  AGENT ID:   session_memory                                      ║
║  NAME:       Session Memory         VERSION: 1.0.0  LAYER: MEMORY ║
╠══════════════════════════════════════════════════════════════════╣
║  SINGLE RESPONSIBILITY: Read/write the per-course conversation history. ║
║  TRIGGER — Primary: read before tutor call; write after formatter. ║
║  INPUT  — Required: sessionId, courseSlug. write: messages[].     ║
║  OUTPUT — Success: {history: AIMessage[]} (read) / {ok:true} (write). Error: {error_code:'MEM_FAIL', retry_safe:true} ║
║  MODEL/TOOL: sessionStorage today (key `vanguard-ai-chat-${slug}`); Redis at scale. TEMP: n/a. ║
║  CONTRACTS: max 20 turns (real MAX_HISTORY) · timeout 10ms · cost $0. ║
║  FAILURE — read fail: start empty. write fail: log + continue (never blocks reply). ║
║  DEPENDS ON: none. DEPENDED ON BY: orchestrator, tutor_agent. STATE: STATEFUL. ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  AGENT ID:   output_formatter                                    ║
║  NAME:       Output Formatter       VERSION: 1.0.0  LAYER: OUTPUT ║
╠══════════════════════════════════════════════════════════════════╣
║  SINGLE RESPONSIBILITY: Final-shape and sanitize the reply for the client. ║
║  TRIGGER — Primary: validator PASS. INPUT — Required: reply, detectedLang. ║
║  OUTPUT — Success: {reply, meta:{agent_id, tier, confidence, latency_ms, tokens}}. Error: returns raw reply + warn. ║
║  MODEL/TOOL: pure function. TEMP: n/a.                            ║
║  CHECKS: strip any stray markdown the model leaked; RTL for Arabic; escape HTML; attach metadata. ║
║  CONTRACTS: timeout 20ms · cost $0. FAILURE — error: return unformatted reply + log. ║
║  DEPENDS ON: response_validator. DEPENDED ON BY: orchestrator. STATE: STATELESS. ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  AGENT ID:   fallback_agent                                      ║
║  NAME:       Fallback Agent         VERSION: 1.0.0  LAYER: FALLBACK║
╠══════════════════════════════════════════════════════════════════╣
║  SINGLE RESPONSIBILITY: Guarantee the student always gets a safe, helpful response. ║
║  TRIGGER — Primary: any upstream CRITICAL failure or retries exhausted. ║
║  INPUT  — Required: error_code, detectedLang. OUTPUT — Success: {reply: localized safe string}. ║
║  MODEL/TOOL: hardcoded static strings (zero dependencies) + tier-switch logic. TEMP: n/a. ║
║  CONTRACTS: timeout 0ms (synchronous) · cost $0 · zero external calls. ║
║  BEHAVIOR: free-limit → offer Pro; pro-limit → switch to free + notify owner (real); total failure → static "AI unavailable" message. ║
║  FAILURE — cannot fail (no I/O). DEPENDS ON: none. STATE: STATELESS. ║
╚══════════════════════════════════════════════════════════════════╝
```

**Dependency Matrix** (→ calls/uses, ← called by, ✗ no link)

```
                    in_val  orch  router  knol  tutor  valid  s_mem  fmt  fallbk
input_validator       —      →     ✗      ✗     ✗      ✗      ✗     ✗     →
orchestrator          ←      —     →      →     →      →      →     →     →
intent_router         ✗      ←     —      ✗     ✗      ✗      ✗     ✗     ✗
course_knowledge      ✗      ←     ✗      —     ←      ✗      ✗     ✗     ✗
tutor_agent           ✗      ←     ✗      →     —      →      →     ✗     →
response_validator    ✗      ←     ✗      ✗     ←      —      ✗     →     →
session_memory        ✗      ←     ✗      ✗     ←      ✗      —     ←     ✗
output_formatter      ✗      ←     ✗      ✗     ✗      ←      →     —     ✗
fallback_agent        ←      ←     ✗      ✗     ←      ←      ✗     ✗     —
```

---

## SECTION 03 — ORCHESTRATION LOGIC

### 3.1 Intent Classification (real Vanguard variant: course is known, classify TYPE + TIER)

```python
def classify_intent(text: str, ctx: SessionContext) -> IntentResult:
    """confidence: 0.0 guess .. 0.95+ certain. Course already fixed by panel."""
    t = text.lower()
    mode_scores = {}

    # Step 1 — request-type keywords (bilingual: AR + EN)
    TRIGGER_MAP = {
      'check':   ['صح ولا غلط','صح','غلط','هل اجابتي','is this correct','check my'],
      'quiz':    ['اختبرني','امتحني','مسائل','quiz','give me practice','test me'],
      'summary': ['لخص','ملخص','summarize','summary','review quickly'],
      'worked':  ['حل','احسب','solve','compute','derive','step by step'],
      'explain': ['اشرح','يعني ايه','explain','what is','why','ازاي'],
    }
    for mode, trig in TRIGGER_MAP.items():
        hits = sum(1 for w in trig if w in t)
        if hits: mode_scores[mode] = min(0.95, 0.45 + (hits/len(trig))*0.65)

    # Step 2 — semantic signals
    if '```' in text or 'select ' in t:        mode_scores['worked']  = mode_scores.get('worked',0)+0.15
    if text.strip().endswith('?'):              mode_scores['explain'] = mode_scores.get('explain',0)+0.08
    if len(text.split()) > 40:                  mode_scores['summary'] = mode_scores.get('summary',0)+0.10
    if ctx.last_mode:                           mode_scores[ctx.last_mode] = mode_scores.get(ctx.last_mode,0)+0.06

    # Step 3 — confidence floor
    if not mode_scores or max(mode_scores.values()) < 0.50:
        best, conf = 'explain', 0.50          # safe default mode
    else:
        best = max(mode_scores, key=mode_scores.get); conf = mode_scores[best]

    # Step 4 — TIER selection (free Gemini by default; Pro only when justified)
    tier = 'free'
    if ctx.free_limit_hit or ctx.user_chose_pro: tier = 'pro'

    return IntentResult(mode=best, tier=tier, confidence=conf,
                        reasoning=f"top: {best}", fallback='explain')
```

### 3.2 Orchestrator Decision Tree

```
ORCHESTRATOR receives request:
├─ IF text empty or < 2 chars            → REJECT (input_validator error, no API call)
├─ IF text > 4000 chars (real limit)     → REJECT ("too long")
├─ IF history length > 30                 → REJECT ("conversation too long") [real route guard]
├─ IF confidence ≥ 0.80                   → route to tutor in classified mode
├─ IF confidence 0.60–0.79                → route to tutor + response_validator STRICT mode
├─ IF confidence 0.50–0.59                → route to tutor in default 'explain' mode (enriched ctx)
├─ IF confidence < 0.50                   → default 'explain', free tier (never block)
└─ TIER: free by default; on free 429 → offer Pro; on pro 429 → free + notify owner (real)
```

### 3.3 Priority Queue

| Priority | Condition | Action |
|---|---|---|
| P0 — Critical | Safety/PII pre-screen trips | Handle immediately, may block the answer |
| P1 — High | Retry of a failed request (Loop A) | Front of queue |
| P2 — Normal | Standard student question | FIFO |
| P3 — Low | Async memory write, cache warm | Only when idle |

### 3.4 Parallelism Map

```
SEQUENTIAL: input_validator → orchestrator → tutor_agent → response_validator → output_formatter
PARALLEL:   session_memory(read) ‖ course_knowledge(read)   (both feed the tutor call)
            memory(write) ‖ cache(write)                     (after formatter, async)
NEVER PARALLEL: response_validator before tutor_agent finishes; memory_write before formatter.
```

### 3.5 Context Window Strategy

```
Passed to every tutor call:
  1. System prompt = buildSystemPrompt(courseKnowledge, ctx)   ~300–600 tok
  2. Last N turns: N = min(12, MAX_HISTORY=20)
  3. Rolling summary of older turns                            ≤150 tok
  4. (future) top 5 long-term memories                        ~100 tok
  5. Current message                                          variable
TRIMMED: assistant msgs >800 tok → 120-tok summary; turns >12 → rolling summary.
NEVER trimmed: system prompt, current user message, last assistant message.
```

---

## SECTION 04 — FULL SYSTEM FLOWCHART

```
              ┌───────────────────────┐
              │      USER INPUT       │
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │    INPUT VALIDATOR    │  len 2–4000, encoding, PII/safety, lang detect
              └─────┬───────────┬─────┘
                  PASS         FAIL
                    │           └────────► ┌──────────────┐
                    ▼                      │ ERROR HANDLER│► structured error to user (END)
            ┌───────────────┐              └──────────────┘
            │ ORCHESTRATOR  │  intent_router (mode+tier+conf) · priority queue · working mem
            └──┬────┬────┬──┘
          ≥0.80 0.50-0.79 <0.50
               │     │       │
               ▼     ▼       ▼
           [TUTOR][TUTOR  ][TUTOR explain]
           direct +strict   safe-default
               │     │       │
   reads ‖     ▼     ▼       ▼     ‖ reads
 ┌──────────┐  └──┬──┴───────┘  ┌──────────────┐
 │ SESSION  │     │             │ COURSE KNOW. │
 │ MEMORY   │─────┤─────────────│ getKnowledge │
 └──────────┘     ▼             └──────────────┘
            ┌─────────────────┐
            │ RESPONSE VALID. │  score 5 dims · enforce plain-text+lang · ≥0.72 PASS
            └────┬───────┬────┘
              PASS      FAIL <0.72
               │         │
               │     retry_count < 3 ?
               │      YES│        │NO
               │         ▼        ▼
               │   re-invoke   ┌───────────────┐
               │   tutor w/    │ FALLBACK AGENT│ (free↔pro switch / safe static) 
               │   enriched ───┘   │           
               │   prompt          ▼
               │              (localized safe reply)
               ▼                    │
        ┌──────────────┐            │
        │  OPTIMIZER   │◄───────────┘  token/format optimize · cache write (cacheable only)
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │   FORMATTER  │  strip stray markdown · RTL for AR · sanitize · attach metadata
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │ MEMORY WRITER│◄── async, non-blocking (does NOT delay the answer)
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │ FINAL ANSWER │ (END)
        └──────────────┘
```

Every branch terminates: validation FAIL → error END; tutor success → formatter → END; retries exhausted → fallback → formatter → END; fallback cannot fail (static).

---

## SECTION 05 — FEEDBACK & REFINEMENT LOOPS

**LOOP A — Real-Time Validation (single request)**
```
TRIGGER:   response_validator score < 0.72
RUNS:      re-invoke tutor_agent; enrich prompt ("be more specific / show every step"),
           inject course knowledge again; increment retry_counter
UPDATES:   retry_counter, prompt_context, validator_score
EXIT ok:   score ≥ 0.72
EXIT fail: retry_counter == 3 → fallback_agent
TIMEOUT:   whole loop ≤ latency_budget − 500ms
LOOP FAIL: loop times out → fallback_agent immediately
```

**LOOP B — Session Memory (one conversation, per course)**
```
TRIGGER:   every completed user+assistant pair
RUNS:      extract key facts/preferences; if history > 20 turns → summarize oldest;
           dedup near-identical turns (similarity > 0.92)
UPDATES:   sessionStorage `vanguard-ai-chat-${slug}`, rolling summary
EXIT:      tab close / "New chat" button / 2h inactivity
CONFLICT:  newer info wins; flag to student on large delta
LOOP FAIL: memory write fails → continue without it, log warning, NEVER block the reply
```

**LOOP C — Long-Term Learning (across sessions, future)**
```
TRIGGER:   daily batch (cron 02:00 UTC)
RUNS:      aggregate low-confidence routes, retries, fallbacks, off-topic redirects,
           and (if added) thumbs-down feedback
UPDATES:   intent TRIGGER_MAP weights; per-mode thresholds (±0.02 max);
           A/B-tested prompt variants; flag courses whose answers fail most (gap in knowledge base)
EXIT:      batch done OR 30-min cap
LOOP FAIL: log + skip cycle + alert owner; system runs on previous weights
```

---

## SECTION 06 — FAILURE HANDLING MATRIX

| # | Failure Mode | Detection | Severity | Immediate Action | Recovery | Max Time | User Message |
|---|---|---|---|---|---|---|---|
| 1 | LLM timeout | AbortSignal @12s | HIGH | cancel, retry_count++ | backoff 1.2→2.4→4.8s | 14.4s | "بياخد وقت أطول من المعتاد، ثانية واحدة… / Taking a bit longer, retrying…" |
| 2 | Gemini free 429 | HTTP 429 (free route) | MEDIUM | stop, offer Pro | student taps "Continue with Pro" → resend (real) | ~1s | "وصلنا حد المجاني — تقدر تكمل مع Vanguard AI Pro." |
| 3 | Claude pro 429 / credit | HTTP 429 (pro route) | HIGH | switch to free + notify owner (real) | answer continues on free tier | ~2s | "الـ Pro وصل حده، رجّعتك للمجاني عشان تكمل." |
| 4 | LLM 5xx | HTTP 500/503 | CRITICAL | skip to fallback_agent | safe static reply | 2s | "في مشكلة مؤقتة في الاتصال، جرّب تاني بعد لحظات." |
| 5 | Low routing confidence | classify < 0.50 | LOW | default 'explain', free | transparent | 0s | none |
| 6 | Low-quality reply | validator < 0.72 | MEDIUM | Loop A retry (enriched) | ≤3 retries → fallback | 14.4s | "خليني أظبط الإجابة…" (retry 2+) |
| 7 | Output broke format rules (markdown/emoji/wrong lang) | validator violation flags | MEDIUM | formatter strips markdown; if lang wrong → Loop A | re-ask in correct language | ≤5s | none (silent fix) |
| 8 | Fabricated fact (hallucination) | pro fabrication check / contradiction w/ knowledge base | HIGH | Loop A with "answer only from the course; say if unsure" | ≤3 retries → fallback admits uncertainty | ≤14.4s | none (model self-corrects) |
| 9 | Input invalid (len/encoding/PII) | validator check | LOW | reject pre-call | user edits input | 0s | "رسالتك متبعتتش: [السبب]" |
| 10 | History too long | history > 30 (real guard) / >20 client | LOW | trim to 12 + summary | auto | 0s | none |
| 11 | sessionStorage unavailable/full | try/catch on read/write (real) | LOW | in-memory only this session | warn | 0s | "ملاحظة: المحادثة مش هتتحفظ بعد التحديث." |
| 12 | Fallback itself errors | exception in fallback | CRITICAL | hardcoded static string (no I/O) | zero-dependency string | 0s | "الخدمة مش متاحة دلوقتي، جرّب كمان شوية." |
| 13 | Runaway tokens / over budget | input+output est > budget | HIGH | compress context, cap output | force trim then retry | 200ms | none |

---

## SECTION 07 — OPTIMIZATION PIPELINE (pre-call ≤200ms)

```
STEP 1 CACHE CHECK (20ms): exact hash(normalize(text)+slug); semantic cosine>0.93.
   TTL: 5min for concept/definition queries, 0 for "check my answer"/personal. LRU 500.
STEP 2 CONTEXT COMPRESSION (30ms): keep last 12 turns; summarize older→120 tok; dedup>0.92;
   enforce ≤ tutor.maxInput.
STEP 3 INTENT ENRICHMENT (30ms): inject courseSlug + course title + instructor; time-of-day tone;
   last mode; (future) student weak topics + name.
STEP 4 PROMPT INJECTION (10ms): assemble buildSystemPrompt → [PERSONA][KNOWLEDGE][CONTEXT].
   Target system prompt ≤600 tok.
STEP 5 TOKEN BUDGET (10ms): input_tok=count(system+messages); output_budget=min(3000, GLOBAL-input);
   cost_est=in×rate+out×rate; if >budget→compress; if output_budget<50→error "context too large".
   ── API CALL (Gemini free / Claude pro) ──
STEP 6 SCORING + GATE (20ms): 5 dims (length, format-compliance incl. NO-markdown/correct-language,
   safety, relevance, mode-fit). weighted ≥0.72 PASS; FAIL→Loop A.
STEP 7 POST (20ms): strip stray markdown; RTL if Arabic; sanitize HTML; metadata
   (tier, confidence, latency_ms, tokens); cache write if cacheable; async memory write.
```

---

## SECTION 08 — MEMORY ARCHITECTURE

**Short-Term** (in-process): `AIMessage[] {role, content, timestamp}`; max 20 turns (trim to 12); session TTL; O(1) slice; builds each API call. (Real: held in React state.)

**Working** (orchestrator, one request):
```
{ sessionId, courseSlug, intent:{mode,tier,confidence}, retry_count(0-3),
  pipeline_step(0-7), token_budget:{input_used,output_budget,cost_est},
  start_ts, latency_budget_ms }   → cleared after the request.
```

**Session** (persisted for the session): per-course array in `sessionStorage` key `vanguard-ai-chat-${slug}` (real); max 20 msgs; TTL = session / "New chat" clear; top-N recent used as context. Move to Redis at scale.

**Long-Term** (cross-session, future): Supabase pgvector; index user_id + 1536-dim embedding; cosine top-5; 90-day TTL; async write, never blocks. Used for personalization + weak-topic tracking (ties into TutorContext.weakTopics).

**Conflict Resolution**
```
R1 recency wins · R2 explicit (student-stated) beats inferred · R3 higher confidence on ties
R4 large delta → ask student · R5 never silently discard → log to Loop C
```

---

## SECTION 09 — SCALABILITY BLUEPRINT

| Level | DAU | Peak RPS | Architecture | Storage | Cost/mo [EST] |
|---|---|---|---|---|---|
| MVP (today) | 1–100 | 1–3 | Next.js on Vercel + 2 serverless API routes (Gemini/Claude) + in-memory rate limit + sessionStorage | Supabase (auth/social) | $10–60 |
| Alpha | 100–1k | 3–10 | + Redis for shared rate-limit & session cache; per-user (not per-IP) limits | + Redis 512MB | $60–250 |
| Growth | 1k–10k | 10–50 | Move tutor calls to a queue (Bull/QStash); pool API keys; pgvector long-term memory; CDN | Supabase + Redis cluster | $300–1,500 |
| Scale | 10k–50k | 50–150 | Worker pool, autoscale; Claude Batch for non-interactive; read replicas; observability stack | sharded | $1,500–6,000 |

**What breaks at 10x:**
- In-memory rate limiter (`hits` Map in both routes) is **per serverless instance** → resets on cold start, not shared → move to Redis before Alpha.
- sessionStorage memory → server-side before multi-device.
- Single Gemini + single Claude key → RPM/TPM caps → key pool / Batch API.
- Synchronous pipeline → queue + workers.

**Bottleneck order of failure:** (1) LLM provider rate limits → (2) non-shared in-memory rate-limit/session state → (3) synchronous no-parallelism pipeline → (4) single-region latency for distant users.

---

## SECTION 10 — IMPLEMENTATION ROADMAP

**Phase 1 — Solidify the brain (Week 1–2)**
- [ ] Replace `aiPersona.ts` with the upgraded brain (4 course knowledge bases).
- [ ] Refactor `AIPanel` to use `getCourseKnowledge(courseSlug)` (drop the hardcoded CSE221/MAT312 strings).
- [ ] Add `intent_router` (mode+tier) as a pure function; keep current free→pro fallback.
- **Exit:** happy path works for all 4 courses; P95 < 6s; AI tab enabled where `hasAI`.

**Phase 2 — Validation & resilience (Week 3–4)**
- [ ] `response_validator`: 5-dimension score + enforce plain-text/no-markdown/correct-language.
- [ ] Loop A retries (3 + backoff 1.2/2.4/4.8s) wired to validator.
- [ ] `fallback_agent` with localized safe strings for all 13 failure rows.
- **Exit:** survives a 1-hour chaos test (inject 429/5xx/timeouts) with zero user-facing crashes.

**Phase 3 — Optimization (Week 5–6)**
- [ ] Pre-call pipeline steps 1–5 (cache, compression, enrichment, prompt, budget).
- [ ] Move rate-limit + session to Redis (shared across instances).
- [ ] Per-request cost/token logging + metadata on every response.
- **Exit:** P95 < 4s; avg cost/request < $0.012; cache hit-rate measurable.

**Phase 4 — Scale & learn (Week 7–8)**
- [ ] Load test 100 concurrent; fix top bottleneck (rate-limit/session → Redis).
- [ ] Loop C daily batch (low-conf/retry/fallback analytics) → tune TRIGGER_MAP + thresholds.
- [ ] pgvector long-term memory + weak-topic personalization (TutorContext.weakTopics).
- **Exit:** stable at 10x target; all 5 KPIs met.

---

## SECTION 11 — QUICK REFERENCE CARD

```
╔═══════════════════════════════════════════════════════════════╗
║  VANGUARD AI — QUICK REFERENCE                                ║
╠═══════════════════════════════════════════════════════════════╣
║  Happy path: Input → Validate → Classify → Tutor → Validate → Output ║
╠═══════════════════════════════════════════════════════════════╣
║  Route direct (conf):        ≥ 0.80                            ║
║  Strict-validate (conf):     0.60–0.79                        ║
║  Safe default explain:       < 0.50                           ║
║  Quality gate PASS:          ≥ 0.72                           ║
║  Max retries:                3                                 ║
║  Backoff (ms):               1200 → 2400 → 4800                ║
║  Tutor timeout:              12,000 ms                         ║
║  Max history:                20 turns (trim 12)               ║
║  Max input:                  4000 chars / ≤30 msgs (real)     ║
║  Tutor output cap:           3000 tokens (real)               ║
║  Rate limit:                 20 req / 60s per IP (real)       ║
║  Temperature:                0.7 (real)                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Models: free = gemini-flash-latest · pro = claude-sonnet-4-6 ║
║  Routes: /api/ai-tutor (free) · /api/ai-tutor-pro (pro)       ║
╠═══════════════════════════════════════════════════════════════╣
║  Failure chain: LLM down → fallback_agent (free↔pro)          ║
║   fallback down → static localized string (zero deps)         ║
║  HARD RULES: plain text only · reply in student's language    ║
║   keep technical terms in English · never fabricate facts     ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## CURRENT vs REQUIRED — Honest Verification of the Live AI

| Capability | Status today | Gap to production |
|---|---|---|
| Persona + per-course knowledge | ✅ Strong (`aiPersona.ts`, 4 courses after upgrade) | Wire `getCourseKnowledge()` into `AIPanel` |
| Server-side keys (no client exposure) | ✅ Done (both routes inject keys) | — |
| Dual tier + graceful fallback | ✅ Done (free→pro offer, pro→free + owner notify) | — |
| Input validation | 🟡 Partial (len/≤30 msgs/≤4000 chars in route) | Add PII/safety pre-screen + language detect |
| Intent routing (mode/tier) | ❌ Not present (course fixed; no mode classify) | Add `intent_router` |
| Response quality gate | ❌ None | Add `response_validator` + Loop A |
| Output-rule enforcement (no markdown / right language) | 🟡 Relies on the model obeying the prompt | Add programmatic validator/formatter |
| Retries + backoff | ❌ None (single attempt per call) | Add 3× backoff |
| Rate limiting | 🟡 In-memory per-IP, per serverless instance (not shared) | Move to Redis; per-user limits |
| Session memory | ✅ sessionStorage per course | Server-side at scale |
| Long-term memory / personalization | ❌ Future | pgvector + weak-topic tracking |
| Caching / cost tracking | ❌ None | Add LRU + token-cost logging |

**Verdict:** the *brain* (persona + knowledge + secure dual-tier + session memory + fallback) is genuinely production-grade. The missing layer is the **orchestration/validation wrapper** (intent routing, quality gate, retries, programmatic enforcement of the plain-text/language rules, shared rate-limit). Phases 1–2 above close ~80% of that gap.
