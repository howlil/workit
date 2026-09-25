# Workit — Engineering Design

Status: **Proposed canonical implementation design**
Depends on: `PRODUCT_DESIGN.md`, `DESIGN.md`
Scope: Chrome extension runtime, Workit backend, persistence, search, autofill, and MCP boundary
Last updated: 2026-09-25

---

## 1. Engineering goal

Implement the approved Workit product without changing its product model.

The engineering system must preserve these contracts:

1. the browser UI is a floating launcher + contextual popup, not a persistent side panel;
2. job capture is fast and mostly automatic;
3. the Career Profile is the canonical source for autofill and matching;
4. application history is immutable historical truth;
5. autofill never submits an application;
6. match analysis must be traceable to explicit profile evidence;
7. extension UI and MCP must operate on the same domain rules;
8. MCP is an adapter to Workit, not the place where Workit business logic lives.

Primary implementation graph:

```text
Browser page
   ↓
Extension browser runtime
   ↓
Workit API
   ↓
Domain core
   ↓
D1 / R2 / semantic index

ChatGPT / MCP
   ↓
MCP adapter
   ↓
same Domain core
```

---

# 2. Architecture overview

```text
┌──────────────────────── Browser Extension ───────────────────────┐
│                                                                  │
│ Content Runtime                                                  │
│ ├── PageObserver                                                 │
│ ├── ContextClassifier                                            │
│ ├── JobDetector                                                  │
│ ├── JobExtractor                                                 │
│ ├── FormDetector                                                 │
│ ├── AutofillEngine                                               │
│ └── ShadowRoot UI                                                │
│      ├── FloatingLauncher                                        │
│      ├── CapturePopup                                            │
│      └── ApplicationAssistant                                    │
│                                                                  │
│ Extension Runtime                                                │
│ ├── ServiceWorker                                                │
│ ├── AuthSession                                                  │
│ ├── WorkitApiClient                                              │
│ ├── ExtensionCache                                               │
│ └── CrossFrameCoordinator                                        │
└─────────────────────────────┬────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌──────────────────────── Cloudflare Worker ───────────────────────┐
│                                                                  │
│ REST Adapter ─────┐                                              │
│                   ▼                                              │
│                Domain Core                                       │
│                   ▲                                              │
│ MCP Adapter ──────┘                                              │
│                                                                  │
│ ├── ProfileService                                               │
│ ├── OpportunityService                                           │
│ ├── ApplicationService                                           │
│ ├── AnswerMemoryService                                          │
│ ├── EvidenceService                                              │
│ ├── SearchService                                                │
│ └── ArtifactService                                              │
└──────────────┬────────────────┬─────────────────┬────────────────┘
               │                │                 │
               ▼                ▼                 ▼
              D1               R2             Vectorize
       relational truth    binary artifacts    semantic index
```

Source of truth:

```text
D1 = canonical structured data
R2 = immutable / binary artifacts
Vectorize = derived semantic retrieval index
IndexedDB = local cache, never canonical
```

---

# 3. Technology choices

## Extension

Use:

```text
WXT
React
TypeScript
```

Why:

- WXT gives a clean Manifest V3 development model;
- content-script UI can mount into a Shadow Root;
- the popup UI can remain isolated from arbitrary website CSS;
- the same TypeScript domain contracts can be shared with backend packages.

Do not build the floating UI as a Chrome action popup.

The product requires UI inside the current page viewport.

## Backend

Use:

```text
Cloudflare Workers
TypeScript
```

The Worker exposes:

```text
/api/*
/mcp
```

REST and MCP must delegate to the same application/domain services.

## Persistence

Use:

```text
D1        relational source of truth
R2        resume / artifact storage
Vectorize semantic retrieval only where required
```

Do not introduce Postgres, Redis, Durable Objects, or Queues until an actual requirement justifies them.

---

# 4. Repository target shape

Recommended monorepo:

```text
workit/
├── apps/
│   ├── extension/
│   │   ├── entrypoints/
│   │   ├── src/
│   │   │   ├── browser/
│   │   │   ├── capture/
│   │   │   ├── autofill/
│   │   │   ├── ui/
│   │   │   └── runtime/
│   │   └── tests/
│   │
│   └── worker/
│       ├── src/
│       │   ├── http/
│       │   ├── mcp/
│       │   ├── auth/
│       │   └── bootstrap/
│       └── tests/
│
├── packages/
│   ├── domain/
│   │   ├── profile/
│   │   ├── opportunity/
│   │   ├── application/
│   │   ├── answers/
│   │   ├── evidence/
│   │   └── events/
│   │
│   ├── contracts/
│   │   ├── api/
│   │   ├── mcp/
│   │   └── browser/
│   │
│   ├── db/
│   │   ├── migrations/
│   │   ├── repositories/
│   │   └── queries/
│   │
│   ├── shared/
│   └── test-fixtures/
│
├── PRODUCT_DESIGN.md
├── DESIGN.md
└── ENGINEERING_DESIGN.md
```

Dependency direction:

```text
apps
 ↓
contracts / domain
 ↓
db abstractions / shared

domain
 X
must not depend on extension, Worker, MCP, or UI
```

---

# 5. Extension runtime design

The extension has two major execution contexts.

```text
content script
      ↕ messages
service worker
```

They have different responsibilities and must not be merged conceptually.

---

## 5.1 Content Runtime

The content runtime owns the current webpage.

Responsibilities:

```text
read page
classify page
extract job data
detect application fields
write approved values
verify DOM result
render Workit overlay
```

It must not own:

- canonical auth state;
- durable application state;
- database rules;
- lifecycle transition logic.

Suggested internal graph:

```text
DOM
 ↓
PageObserver
 ↓
ContextClassifier
 ├── OrdinaryPage
 ├── JobPage
 ├── ExistingOpportunityPage
 ├── ApplicationForm
 └── SubmissionSuccess
        ↓
Context Controller
        ├── Capture pipeline
        ├── Autofill pipeline
        └── ShadowRoot UI state
```

---

## 5.2 Shadow Root UI

Mount Workit UI into a dedicated host:

```text
document.body
└── #workit-root
    └── ShadowRoot
        ├── FloatingLauncher
        └── ContextPopup
```

Goals:

- prevent source-site CSS from styling Workit;
- prevent Workit CSS from leaking into the source site;
- keep popup positioning independent of source-page layout;
- preserve the approved white-dominant design system.

Never inject the Workit React tree directly into arbitrary source-site component containers.

---

## 5.3 Service Worker

The service worker owns extension-wide coordination.

Responsibilities:

- OAuth/session;
- API client;
- local extension storage;
- tab-level state coordination;
- cross-frame messaging;
- cache access;
- retrying queued local mutations after reconnect;
- opening the full Workit workspace.

Important constraint:

Manifest V3 service workers are not durable processes.

Therefore:

```text
in-memory variable
≠
durable source of truth
```

Anything required after worker suspension must live in:

- extension storage / IndexedDB;
- or the backend.

---

# 6. Browser context detection

The page classifier should produce a small explicit state.

```ts
type BrowserContext =
  | { type: "ordinary" }
  | { type: "job"; candidate: JobPageCandidate }
  | { type: "saved-job"; opportunityId: string }
  | { type: "application-form"; form: DetectedApplicationForm }
  | { type: "submission-success"; applicationId?: string }
  | { type: "unsupported-form"; reason: string };
```

No UI component should infer page type independently.

One classifier owns the decision.

---

# 7. Job detection and extraction

## 7.1 Extraction priority

Do not begin with brittle site selectors.

Use this pipeline:

```text
page
 ↓
1. Schema.org JobPosting JSON-LD
 ↓ insufficient?
2. Known ATS adapter
 ↓ insufficient?
3. Generic DOM extractor
 ↓ ambiguous?
4. AI-assisted normalization
```

AI is the last normalization step, not the first scraper.

---

## 7.2 Adapter interface

```ts
interface JobExtractor {
  canHandle(ctx: PageContext): boolean;
  extract(ctx: PageContext): Promise<JobExtractionResult>;
}
```

Implementations:

```text
SchemaOrgJobExtractor
LinkedInJobExtractor
GreenhouseJobExtractor
LeverJobExtractor
AshbyJobExtractor
WorkdayJobExtractor
GenericJobExtractor
```

Do not encode business rules inside adapters.

They only convert source pages into a normalized candidate.

---

## 7.3 Normalized candidate

```ts
interface JobPageCandidate {
  source: {
    provider?: string;
    sourceJobId?: string;
    canonicalUrl: string;
  };

  company?: string;
  title?: string;
  location?: string;
  workArrangement?: "remote" | "hybrid" | "onsite" | "unknown";
  employmentType?: string;
  salary?: SalaryRange;

  descriptionText: string;
  descriptionHtml?: string;

  extractedAt: string;
  extraction: {
    strategy: "json-ld" | "adapter" | "generic" | "ai-normalized";
    confidence: number;
  };
}
```

---

## 7.4 Snapshot rule

Do not persist the entire page HTML by default.

Persist:

```text
normalized job fields
+
sanitized description HTML
+
plain text description
+
source metadata
+
extraction provenance
+
captured timestamp
```

Reason:

- historical context is preserved;
- unrelated session/personal page data is not copied;
- storage remains manageable;
- the source site's scripts/styles are not retained.

---

# 8. Duplicate detection

Use deterministic identifiers before fuzzy matching.

Priority:

```text
source provider + source job ID
        ↓
canonical URL
        ↓
normalized company + title + location
```

The fuzzy fallback is only used to warn about likely duplicates.

Never silently merge fuzzy matches.

---

# 9. Autofill Engine

Autofill is its own subsystem.

Do not mix it into capture or React UI code.

Core graph:

```text
DOM
 ↓
FieldDetector
 ↓
FieldClassifier
 ↓
ValueResolver
 ↓
SafetyPolicy
 ↓
FillPlan
 ↓ user approval
FieldWriter
 ↓
Verification
```

---

## 9.1 Detected field model

```ts
type FieldState =
  | "ready"
  | "suggested"
  | "needs_review"
  | "missing"
  | "filled"
  | "unsupported";

interface DetectedField {
  id: string;
  frameId: string;

  semanticType:
    | "full_name"
    | "first_name"
    | "last_name"
    | "email"
    | "phone"
    | "location"
    | "linkedin"
    | "portfolio"
    | "resume"
    | "salary"
    | "work_authorization"
    | "notice_period"
    | "essay"
    | "unknown";

  controlType: string;

  signals: {
    label?: string;
    name?: string;
    id?: string;
    ariaLabel?: string;
    placeholder?: string;
    autocomplete?: string;
    nearbyText?: string;
  };

  confidence: number;
  state: FieldState;
}
```

---

## 9.2 Detection signals

Use multiple signals rather than a single selector:

```text
label
name
id
autocomplete
aria-label
placeholder
nearby text
input type
select options
DOM relationship
known ATS metadata
```

Classification should return confidence.

Low-confidence fields become:

```text
needs_review
or
unsupported
```

not silently filled.

---

## 9.3 Dynamic forms

Use a scoped `MutationObserver`.

```text
initial scan
   ↓
watch relevant form subtree
   ↓
new/changed nodes
   ↓
incremental rescan
```

Do not repeatedly rescan the entire document on every DOM mutation.

Debounce/coalesce mutation batches.

---

## 9.4 Fill plan

The assistant UI should render a plan before writing.

```ts
interface FillPlan {
  fields: Array<{
    detectedFieldId: string;
    source:
      | { type: "profile"; fieldPath: string }
      | { type: "answer-memory"; answerId: string }
      | { type: "generated-draft"; draftId: string };

    proposedValue: string;
    state: "ready" | "suggested" | "needs_review";
  }>;
}
```

The button:

```text
Auto-fill 8 fields
```

executes only selected `ready` fields.

---

## 9.5 Field writer

Never assume:

```ts
element.value = value
```

is sufficient.

Writer flow:

```text
locate current target
→ apply native control-compatible write
→ dispatch appropriate events
→ allow framework update
→ read value back
→ verify
```

Writer implementations may differ for:

- text input;
- textarea;
- native select;
- checkbox/radio;
- contenteditable;
- custom combobox;
- file input.

Unsupported custom widgets remain user-controlled.

---

## 9.6 Main-world escape hatch

Default content scripts remain isolated.

Only use main-world execution for specific compatibility cases that cannot be handled safely from the isolated extension world.

Main-world access must be wrapped behind a narrow adapter.

Do not make the entire content runtime execute in page context.

---

# 10. File / resume autofill

Treat file upload separately from text controls.

Domain model:

```text
ResumeArtifact
├── id
├── display name
├── MIME
├── size
├── content hash
├── R2 object key
└── source / created_at
```

Runtime flow:

```text
detected resume field
→ choose configured resume
→ show exact file name
→ user approves
→ retrieve authorized file bytes
→ construct browser File
→ attach using supported adapter
→ verify displayed file
```

Important:

resume attachment compatibility must be proven with E2E tests against target ATS platforms.

Do not define "resume autofill works everywhere" as an MVP assumption.

---

# 11. Career Profile domain

Career Profile is canonical mutable data.

Recommended structure:

```text
CareerProfile
├── Identity
├── Experience[]
│   └── Fact[]
├── Education[]
├── Project[]
│   └── Fact[]
├── Skill[]
├── Link[]
└── Preferences
```

Evidence-producing statements should have stable IDs.

Example:

```text
Experience
└── Pusdatin internship
    └── fact_123
        "Built booking conflict detection"
```

This lets match evidence point to a concrete source.

---

# 12. Resume import

Resume import is a proposal pipeline, not a destructive synchronization.

```text
resume file (.pdf, .docx, .txt, .md)
 ↓
client-side extraction (pdfjs-dist / mammoth / text)
 ↓
raw text + metadata
 ↓
parse via Workit API (/api/resume/parse)
 ↓
candidate profile draft (ResumeDraftProfile)
 ↓
compare to canonical profile
 ↓
user review & confirmation
 ↓
write canonical profile (FullCareerProfile)
```

### File Extraction Architecture

To avoid uploading large raw binary files to D1 and eliminate cloud processing overhead, textual extraction is performed directly in the extension workspace runtime:

- **PDF Documents (`.pdf`)**: Extracted using `pdfjs-dist` page-by-page text content iterator (`page.getTextContent()`).
- **Word Documents (`.docx`)**: Extracted using `mammoth` raw text extractor (`mammoth.extractRawText`).
- **Markdown & Plain Text (`.md`, `.txt`)**: Extracted natively via standard `File.text()` API.

Conflict rule:

```text
existing user-edited fact
+
different imported candidate
→ needs review
```

Never silently overwrite a user-edited canonical fact.

---

# 13. Opportunity domain

```ts
interface Opportunity {
  id: string;
  userId: string;

  sourceProvider?: string;
  sourceJobId?: string;
  canonicalUrl: string;

  company: string;
  title: string;
  location?: string;
  workArrangement?: string;
  employmentType?: string;
  salary?: SalaryRange;

  state:
    | "saved"
    | "applying"
    | "applied"
    | "interview"
    | "offer"
    | "closed";

  currentSnapshotId: string;

  createdAt: string;
  updatedAt: string;
}
```

`Discovered` is a browser state before persistence.

It does not need to exist as a persisted database lifecycle state.

---

# 14. Immutable job snapshots

```text
Opportunity
   ├── currentSnapshotId
   └── JobSnapshot[]
```

Create a new snapshot when meaningful source content changes.

Do not mutate historical snapshots.

```ts
interface JobSnapshot {
  id: string;
  opportunityId: string;

  company: string;
  title: string;
  location?: string;
  employmentType?: string;
  workArrangement?: string;

  descriptionText: string;
  descriptionHtml?: string;

  sourceUrl: string;
  capturedAt: string;
  contentHash: string;
}
```

---

# 15. Application domain

An Application is separate from an Opportunity.

```text
Opportunity exists
      ↓
"I'm applying"
      ↓
Application created
```

Recommended model:

```ts
interface Application {
  id: string;
  userId: string;
  opportunityId: string;

  state:
    | "applying"
    | "applied"
    | "interview"
    | "offer"
    | "closed";

  startedAt: string;
  submittedAt?: string;

  submittedJobSnapshotId?: string;
  submittedResumeArtifactId?: string;

  closeReason?: string;
}
```

State transition rules live in one domain function.

```text
transitionApplication(current, command)
→ validate
→ write
→ append event
```

REST and MCP both call it.

---

# 16. Historical application snapshot

When the user confirms submission:

```text
current application
+
current opportunity snapshot
+
selected resume
+
filled deterministic fields
+
approved screening answers
        ↓
atomic submit snapshot
```

Store:

- submitted job snapshot ID;
- resume artifact ID;
- immutable submitted answers;
- selected relevant profile values where required;
- submitted timestamp.

Later edits never rewrite these records.

---

# 17. Application events

Use append-oriented history.

```ts
interface ApplicationEvent {
  id: string;
  applicationId: string;
  type:
    | "application_started"
    | "application_submitted"
    | "assessment_received"
    | "recruiter_contacted"
    | "interview_scheduled"
    | "offer_received"
    | "rejected"
    | "withdrawn"
    | "note";

  occurredAt: string;
  payload: unknown;
}
```

Current state and history serve different purposes:

```text
Application.state
= current query-friendly state

ApplicationEvent[]
= historical truth
```

Do not reconstruct every list query from event replay.

---

# 18. Answer Memory

D1 stores canonical answer records.

Vectorize stores only derived embeddings.

```text
D1 AnswerMemory
      ↓
embedding job
      ↓
Vectorize
      ↓
nearest semantic candidate IDs
      ↓
hydrate canonical records from D1
```

Never return Vectorize metadata as canonical answer content.

Recommended record:

```ts
interface AnswerMemory {
  id: string;
  userId: string;

  concept?: string;
  sourceQuestion: string;
  answerText: string;

  origin: "user" | "imported" | "ai_adapted";

  sourceEvidenceIds: string[];

  firstUsedAt?: string;
  lastUsedAt?: string;
  useCount: number;

  createdAt: string;
  updatedAt: string;
}
```

---

# 19. Submitted answers

Do not link historical applications only to the mutable AnswerMemory row.

Snapshot exact submission text:

```ts
interface SubmittedAnswer {
  id: string;
  applicationId: string;

  questionText: string;
  answerText: string;

  sourceAnswerMemoryId?: string;
  origin: string;

  submittedAt: string;
}
```

This preserves historical truth.

---

# 20. Evidence-based match analysis

Do not make match score the source of truth.

Model:

```text
JobSnapshot
    ↓
Requirement[]
    ↓
EvidenceLink[]
    ↓
MatchClassification
```

Recommended entities:

```text
JobRequirement
├── id
├── snapshot_id
├── text
├── required
└── category

EvidenceLink
├── requirement_id
├── profile_fact_id
├── relation
├── confidence
└── explanation

relation:
strong
partial
none
```

The displayed:

```text
7 / 10 requirements supported
```

is derived from structured requirement/evidence records.

---

# 21. AI match pipeline

```text
job description
→ extract normalized requirements
→ retrieve candidate profile facts
→ evaluate relation
→ structured result validation
→ persist requirements/evidence
```

Rules:

- AI cannot create profile facts;
- every strong/partial match should reference one or more existing profile facts;
- unsupported requirements have no fabricated evidence;
- persist model/version metadata for analysis reproducibility where practical.

---

# 22. Search architecture

Two kinds of search have different implementations.

## Lexical search

Use D1 / FTS for:

```text
Sea
Backend Engineer
rejected
expected salary
```

## Semantic search

Use Vectorize only when lexical equivalence is insufficient.

Primary use case:

```text
screening question
        ≈
semantically similar prior question
```

Flow:

```text
query
→ embedding
→ Vectorize top candidates
→ candidate IDs
→ hydrate from D1
→ apply authorization/filtering
→ result
```

---

# 23. D1 data model

Initial table groups:

```text
users

career_profiles
profile_identity
profile_experiences
profile_experience_facts
profile_education
profile_projects
profile_project_facts
profile_skills
profile_links
profile_preferences

opportunities
job_snapshots
job_requirements
evidence_links

applications
application_events
submitted_answers

answer_memories

artifacts
```

Every user-owned root row must include `user_id`.

Never authorize by trusting IDs from the client alone.

---

# 24. D1 transaction boundaries

Operations that must behave atomically:

### Save opportunity

```text
create opportunity
+
create initial snapshot
+
set current snapshot
```

### Start application

```text
create application
+
transition opportunity state
+
append application_started event
```

### Confirm submission

```text
set submitted_at
+
store submitted snapshot refs
+
store SubmittedAnswer[]
+
transition state
+
append application_submitted event
```

### Close application

```text
transition application
+
store close reason
+
append event
```

---

# 25. R2 design

R2 stores binary artifacts only.

Suggested keys:

```text
users/{userId}/resumes/{artifactId}/file.pdf
users/{userId}/imports/{artifactId}/source.pdf
```

D1 `artifacts` stores metadata and object key.

Bucket remains private.

Downloads must be authorized through Workit or short-lived signed access.

---

# 26. Backend application boundary

Routes do not directly query D1.

```text
HTTP / MCP
   ↓
application command/query
   ↓
domain service
   ↓
repository
   ↓
D1
```

Example:

```text
POST /api/applications/:id/status
→ UpdateApplicationStatusCommand
→ ApplicationService.transition()
→ repository transaction
```

MCP:

```text
update_application_status
→ same UpdateApplicationStatusCommand
→ same ApplicationService.transition()
```

---

# 27. REST API surface

Keep API goal-oriented.

Suggested v1:

```text
GET    /api/profile
PATCH  /api/profile
POST   /api/profile/imports

GET    /api/opportunities
POST   /api/opportunities
GET    /api/opportunities/:id
PATCH  /api/opportunities/:id
POST   /api/opportunities/:id/snapshots

POST   /api/opportunities/:id/applications
GET    /api/applications/:id
POST   /api/applications/:id/transitions
POST   /api/applications/:id/events
POST   /api/applications/:id/submission

POST   /api/answers/search
POST   /api/answers
PATCH  /api/answers/:id

POST   /api/match/analyze

GET    /api/search
```

Do not expose generic CRUD endpoints for internal tables.

---

# 28. Contract validation

Every external boundary validates structured input.

Use one shared schema package.

```text
extension request
→ schema validation
→ application command

MCP arguments
→ same schema validation
→ application command
```

Do not duplicate validation rules across extension and MCP.

---

# 29. Authentication

Workit needs one identity boundary for extension and MCP.

Recommended first option:

```text
Cloudflare Access / OAuth
```

The implementation should support:

```text
User
└── authenticated subject
    └── user_id
```

Every command/query receives a trusted authenticated `user_id`.

Never accept `user_id` from request body as authorization.

---

# 30. Extension auth

Flow:

```text
Workit extension
→ sign in
→ browser OAuth flow
→ callback to extension
→ token/session
→ service worker stores session securely
→ API requests
```

Content scripts do not own credentials.

They message the service worker.

---

# 31. MCP architecture

MCP is an adapter over application use cases.

```text
MCP request
→ auth
→ tool input validation
→ command/query
→ domain service
→ structured tool result
```

Initial tools:

### Read

```text
search_opportunities
get_opportunity
get_application
get_profile
search_answer_memory
```

### Write

```text
save_opportunity
update_application_status
save_application_answer
add_application_note
```

Do not expose:

```text
execute_sql
update_row
generic_database_query
```

Tool names describe user goals, not persistence implementation.

MCP support is not an MVP dependency.

The extension and workspace must remain complete without ChatGPT connectivity.

---

# 32. Local cache

Use IndexedDB for:

- recently loaded profile;
- opportunity summaries;
- answer cache;
- pending offline mutations;
- UI hydration data.

Model:

```text
D1
= canonical

IndexedDB
= performance / offline support
```

Never resolve cross-device conflict by silently trusting stale IndexedDB data.

---

# 33. Offline mutation model

Keep MVP simple.

```text
mutation attempted
 ↓ offline
store OutboxItem
 ↓
connectivity restored
 ↓
service worker retries
 ↓
server accepts / conflicts
 ↓
local cache reconciled
```

Outbox item needs:

- mutation ID;
- operation type;
- payload;
- base version / updated_at where relevant;
- created_at;
- retry count.

Use idempotency keys for mutation endpoints that could otherwise duplicate records.

---

# 34. Async derived work

Do not introduce queues by default.

Synchronous request should commit canonical data first.

Non-critical derived work may execute after:

```text
commit canonical data
→ return success
→ derive:
   embeddings
   match refresh
   search index refresh
```

Introduce Cloudflare Queues only when:

- retries matter;
- processing exceeds request budget;
- load needs decoupling;
- failed derived work must be inspectable.

---

# 35. Security boundaries

Highest-risk data:

- resumes;
- email / phone;
- application answers;
- application history;
- compensation preference.

Rules:

1. all remote traffic uses HTTPS;
2. all user-owned queries scope by authenticated `user_id`;
3. R2 objects are private;
4. browser content scripts receive only data required for the current action;
5. never expose auth tokens to page scripts;
6. never store arbitrary entire webpages by default;
7. sanitize stored job HTML;
8. AI outputs are treated as untrusted structured proposals until validated;
9. MCP write tools require normal authorization and input validation;
10. application submission remains outside Workit automation.

---

# 36. Browser permission strategy

Prefer minimal permissions.

Initial approach:

```text
known supported job sites
→ declared supported host permissions

unknown career site
→ explicit "Enable Workit on this site"
→ optional host permission
```

Avoid requesting broad host access unless actual UX testing proves per-site enablement is unacceptable.

Permission strategy is a product/security tradeoff and should be validated before Chrome Web Store release.

---

# 37. Cross-frame forms

Some ATS controls may live inside iframes.

Architecture:

```text
top-frame coordinator
├── frame detector 0
├── frame detector 1
└── frame detector N
       ↓
normalized DetectedField messages
       ↓
single FillPlan
```

Do not let each frame independently render assistant state.

The top-frame Workit UI owns the combined plan.

Cross-origin iframe access remains subject to browser extension permissions and platform constraints.

Unsupported frames must surface explicitly as unsupported.

---

# 38. Error model

Use expected typed failures.

Examples:

```text
Unauthorized
PermissionRequired
OpportunityDuplicate
ExtractionIncomplete
UnsupportedControl
FillVerificationFailed
ProfileDataMissing
ArtifactUnavailable
TransitionNotAllowed
Conflict
```

Do not convert everything to generic `500 Internal Server Error`.

The extension should map expected failures to actionable UI.

Example:

```text
PermissionRequired
→ "Enable Workit on this site"

ProfileDataMissing
→ "Add salary preference"

FillVerificationFailed
→ mark field Needs review
```

---

# 39. Observability

MVP observability should answer:

```text
what failed?
where?
for which feature?
with which adapter/control type?
```

Record technical metadata, not unnecessary page contents.

Useful events:

- extractor strategy selected;
- extraction confidence;
- form field classification result;
- writer adapter used;
- fill verification failed;
- backend command failed;
- async semantic indexing failed.

Do not log resume contents or screening answer text by default.

---

# 40. Testing strategy

Testing priority follows actual product risk.

```text
domain correctness
↓
browser extraction
↓
autofill compatibility
↓
persistence invariants
↓
UI behavior
↓
MCP adapter
```

---

## 40.1 Domain tests

Unit tests:

- lifecycle transitions;
- duplicate rules;
- immutable application snapshot behavior;
- resume import conflict behavior;
- evidence relationship rules;
- authorization scoping;
- idempotency.

These are fast and deterministic.

---

## 40.2 Extractor fixtures

Store sanitized fixture pages for supported ATS systems.

```text
fixtures/jobs/
├── linkedin/
├── greenhouse/
├── lever/
├── ashby/
└── workday/
```

Each extractor test verifies:

- title;
- company;
- location;
- description;
- source ID;
- canonical URL;
- confidence.

This prevents selector regressions.

---

## 40.3 Autofill fixture app

Build a local test application containing:

- native inputs;
- controlled React inputs;
- select;
- custom combobox;
- checkbox/radio;
- textarea;
- contenteditable;
- dynamic wizard;
- iframe;
- file upload.

Use it as the deterministic baseline for the writer engine.

---

## 40.4 Extension E2E

Use Playwright with the built extension.

Critical flows:

### Capture

```text
open fixture job
→ launcher detects job
→ open popup
→ save
→ opportunity appears in workspace
```

### Autofill

```text
open application fixture
→ detect fields
→ show fill plan
→ approve autofill
→ form values change
→ verify state = filled
```

### Answer Memory

```text
essay question
→ semantic answer found
→ use saved answer
→ form filled only after approval
```

### Historical snapshot

```text
submit confirmation
→ change canonical answer later
→ old application still shows old submitted answer
```

---

## 40.5 Real ATS compatibility suite

After the deterministic fixture engine is stable, maintain a small compatibility matrix:

```text
LinkedIn
Greenhouse
Lever
Ashby
Workday
```

Test only supported behaviors.

Do not promise universal compatibility.

---

# 41. Performance budget

Content scripts run on third-party websites, so Workit must be quiet.

Rules:

- no continuous full-DOM scans;
- initial scan should be scoped;
- MutationObserver processing must batch changes;
- heavy AI/network work is not performed on every mutation;
- popup rendering should not block the host page;
- job match results should be fetched/cached rather than recomputed every render.

---

# 42. Initial implementation sequence

Build in dependency order.

## Phase 1 — browser foundation

```text
WXT extension
→ ShadowRoot launcher
→ popup state machine
→ page context classifier
→ local fixture pages
```

Acceptance:

- launcher is stable across arbitrary pages;
- popup opens/closes correctly;
- CSS cannot be overridden by fixture host styles.

## Phase 2 — capture

```text
JobPosting extractor
→ normalized candidate
→ known ATS adapter interface
→ save Opportunity API
→ D1 snapshot
```

Acceptance:

- one-click save works;
- duplicate rule works;
- immutable snapshot is created.

## Phase 3 — canonical profile

```text
Profile domain
→ Profile workspace
→ resume artifact
→ resume import proposal
→ conflict review
```

Acceptance:

- canonical facts are explicit;
- re-import cannot silently overwrite edits.

## Phase 4 — autofill core

```text
FieldDetector
→ FieldClassifier
→ ValueResolver
→ FillPlan
→ FieldWriter
→ Verification
```

Acceptance:

- deterministic fixture form works;
- unsupported controls do not receive guessed values.

## Phase 5 — application history

```text
Application
→ transition service
→ submitted snapshots
→ event timeline
→ Job Detail
```

Acceptance:

- submission history remains immutable after profile/answer edits.

## Phase 6 — Answer Memory

```text
AnswerMemory D1
→ lexical lookup
→ embeddings
→ Vectorize semantic retrieval
→ approval flow
```

Acceptance:

- semantically similar question retrieves a prior answer;
- suggestion is not filled until approved.

## Phase 7 — evidence matching

```text
requirement extraction
→ candidate evidence retrieval
→ structured classification
→ persisted evidence graph
```

Acceptance:

- every positive match points to stored profile evidence.

## Phase 8 — MCP

```text
MCP auth
→ read tools
→ write tools
→ same domain commands
```

Acceptance:

- MCP cannot bypass lifecycle or authorization rules;
- extension behavior and MCP behavior remain consistent.

---

# 43. What not to build yet

Do not add:

- autonomous auto-apply;
- generic agent loop;
- event-sourced backend;
- microservices;
- Durable Objects without coordination need;
- Redis;
- separate vector database service;
- workflow engine;
- message bus for normal CRUD;
- complex sync CRDT;
- generic plugin framework;
- universal site scripting DSL.

These add infrastructure before product risk is solved.

---

# 44. Primary engineering risks

## Risk 1 — arbitrary ATS form behavior

Highest technical risk.

Mitigation:

```text
small semantic field model
+
adapter-based writer
+
verification after write
+
compatibility tests
+
unsupported state
```

## Risk 2 — page extraction drift

Mitigation:

```text
structured data first
+
adapter fixtures
+
provenance/confidence
+
generic fallback
```

## Risk 3 — extension permission trust

Mitigation:

- minimal permissions;
- explicit site enablement;
- explain why access is needed;
- keep browser-page reading local until user saves/requests analysis where possible.

## Risk 4 — AI hallucinating candidate evidence

Mitigation:

```text
AI chooses relationship
but evidence ID must already exist
```

No evidence ID means no supported claim.

## Risk 5 — historical data mutation

Mitigation:

- immutable snapshots;
- submitted-answer copies;
- artifact IDs rather than pointers to mutable current UI state.

---

# 45. Engineering acceptance criteria

The implementation is structurally correct when:

### Browser

- floating launcher is isolated from site CSS;
- page classification has one source of truth;
- content script contains no canonical business state;
- background service worker can restart without data loss.

### Capture

- extraction strategy and provenance are visible internally;
- snapshot data is sanitized;
- duplicate detection is deterministic before fuzzy fallback.

### Autofill

- every field has explicit semantic type, confidence, and state;
- no low-confidence value is filled silently;
- write result is verified from the DOM;
- unsupported controls fail explicitly;
- submission is never automated.

### Domain

- lifecycle rules exist once;
- REST and MCP call the same rules;
- application submission snapshots are immutable;
- evidence links always point to canonical profile facts.

### Storage

- D1 is canonical structured truth;
- R2 contains private binaries;
- Vectorize contains only derived semantic index data;
- IndexedDB is disposable/rebuildable cache.

### Security

- every user query is scoped from authenticated identity;
- credentials are not exposed to host pages;
- full arbitrary webpage HTML is not retained by default;
- sensitive answer/resume contents are not written to logs.

### Testing

- deterministic browser fixture tests cover extraction and autofill;
- domain transitions are unit-tested;
- critical extension journeys run in Playwright;
- each supported ATS has explicit compatibility coverage.

---

# 46. Research-backed platform constraints

This design was shaped by current platform behavior, not only product preference.

Relevant official references:

- Chrome MV3 service-worker lifecycle:
  https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

- Chrome extension permissions:
  https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
  https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings

- Chrome extension identity / OAuth:
  https://developer.chrome.com/docs/extensions/reference/api/identity

- Chrome extension storage:
  https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies

- WXT content scripts and Shadow Root UI:
  https://wxt.dev/guide/essentials/content-scripts

- WXT E2E testing:
  https://wxt.dev/guide/essentials/e2e-testing.html

- Schema.org / Google JobPosting structured data:
  https://developers.google.com/search/docs/appearance/structured-data/job-posting

- MutationObserver:
  https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe

- HTML file inputs:
  https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/files

- Cloudflare D1:
  https://developers.cloudflare.com/d1/

- Cloudflare R2:
  https://developers.cloudflare.com/r2/

- Cloudflare Vectorize:
  https://developers.cloudflare.com/vectorize/

- Cloudflare MCP authorization:
  https://developers.cloudflare.com/agents/model-context-protocol/protocol/authorization/

- OpenAI MCP tool design:
  https://developers.openai.com/plugins/plan/tools

---

# 47. Final engineering model

```text
PRODUCT CONTRACT
       ↓
Browser Runtime
       ├── observe
       ├── extract
       ├── classify
       ├── propose
       └── execute approved browser actions
       ↓
API / MCP adapters
       ↓
Domain Core
       ├── profile
       ├── opportunity
       ├── application
       ├── answer memory
       └── evidence
       ↓
Canonical Persistence
       ├── D1
       └── R2
       ↓
Derived capability
       └── Vectorize
```

The most important implementation rule is:

> **Solve the browser boundary first, keep business rules centralized, and treat AI/MCP as adapters over reliable structured state.**
