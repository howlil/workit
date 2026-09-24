# AGENTS.md

Scope: entire repository.

## Goal

Ship the smallest correct product slice quickly, with strong boundaries and verification proportional to real risk.

Default workflow:

```text
UNDERSTAND
→ MODEL ONLY WHAT MATTERS
→ IMPLEMENT
→ VERIFY ACTUAL RISK
→ SHIP
```

Do not optimize for ceremony, maximum test count, maximum abstraction, or maximum code reuse. Optimize for short feedback loops, clear ownership, correctness, maintainability, and low regression risk.

---

## Canonical product context

Before changing behavior, use these as the repository contracts:

- `.agents/PRODUCT_DESIGN.md` — product behavior, user flows, states, and scope.
- `DESIGN.md` — UI and visual rules.
- `.agents/ENGINEERING_DESIGN.md` — architecture, boundaries, data model, browser runtime, autofill, persistence, and MCP design.

A direct user instruction overrides these documents. If the requested behavior intentionally changes a canonical contract, update the relevant document in the same task.

Do not silently redesign product behavior while implementing engineering work.

---

# 1. Understand

Before editing code:

1. inspect the smallest relevant area;
2. identify the observable outcome requested;
3. identify the callers, state, dependencies, side effects, and consumers needed to understand that outcome;
4. identify the highest-risk failure mode;
5. define concrete acceptance criteria.

Use this graph when the change is non-trivial:

```text
input / caller
→ responsibility
→ state + dependencies
→ side effects
→ output / consumer
```

Do not audit or redesign unrelated architecture.

If existing behavior is unclear, inspect it before proposing a replacement.

---

# 2. Model only what matters

Choose one owner for every rule.

Examples:

```text
application lifecycle rule
→ domain core

HTTP parsing
→ HTTP adapter

MCP argument translation
→ MCP adapter

third-party page extraction
→ extractor

DOM write mechanics
→ autofill writer

visual state
→ UI
```

Do not duplicate the same business rule across UI, REST, MCP, and persistence layers.

Prefer:

```text
adapter
→ command/query
→ domain rule
→ repository
```

Avoid speculative abstractions.

Create a new abstraction when it establishes a real boundary, removes proven duplication, or makes important behavior independently testable. Do not create interfaces, factories, services, repositories, or generic helpers merely because they may be useful later.

---

# 3. Implement the smallest vertical slice

Prefer an end-to-end slice that produces observable value over building several disconnected layers in advance.

Good:

```text
detect job
→ normalize
→ save
→ persist snapshot
→ show saved state
```

Avoid:

```text
build generic extraction framework
→ generic event framework
→ generic persistence framework
→ no usable job capture
```

Rules:

- reuse existing patterns before introducing a second pattern;
- keep source-of-truth ownership explicit;
- keep adapters thin;
- keep domain logic independent from frameworks;
- do not leave parallel legacy paths after migration unless compatibility requires them;
- do not broaden the task with unrelated cleanup;
- remove code made dead by the change.

For bug fixes, reproduce the failure first when practical.

---

# 4. Testing strategy

Testing is risk-driven.

Test public/observable behavior rather than implementation details.

## TDD by default

Write or identify a failing behavioral test first for:

- business rules;
- lifecycle/state transitions;
- authorization;
- validation;
- calculations;
- data transformation;
- duplicate detection;
- extraction regressions;
- autofill regressions;
- bug fixes.

Flow:

```text
failing test
→ confirm intended failure
→ smallest implementation
→ green
→ refactor
→ targeted verification
```

Do not force TDD mechanically for:

- documentation;
- generated files;
- simple configuration;
- dependency metadata;
- purely visual styling with no behavioral change;
- initial scaffolding where no stable behavior exists yet.

## Verify the actual risk

Choose checks based on the changed boundary:

| Change | Minimum useful verification |
| --- | --- |
| Pure domain rule | focused unit tests |
| Bug fix | regression test + focused suite |
| D1 repository / transaction | integration test + migration check |
| API / MCP contract | schema/contract + auth/ownership test |
| Job extractor | sanitized fixture test |
| Autofill detector/writer | fixture test + Playwright flow |
| Cross-frame/browser behavior | extension E2E |
| UI state/interaction | component/interaction test where valuable |
| Style-only UI | type/build check + visual/manual verification |
| Docs only | links/consistency review |

Start with the narrowest useful check.

Run broader checks only when the blast radius justifies them or before shipping a change that crosses major boundaries.

A passing test suite is not proof of correctness if the risky behavior is not covered.

---

# 5. Workit-specific invariants

These are architectural constraints, not preferences.

## Browser

- Workit UI mounts in an isolated Shadow Root.
- Content scripts do not own canonical business state.
- Service-worker memory is disposable.
- Avoid continuous full-DOM scanning.
- Low-confidence fields are never silently autofilled.
- Every autofill write is verified after execution.
- Unsupported controls fail explicitly.
- Workit never submits a job application automatically.

## Domain

- Opportunity and Application are separate concepts.
- `Discovered` is browser context, not required persistent lifecycle state.
- Lifecycle rules have one owner.
- REST and MCP call the same domain use cases.
- Submitted application data is historical truth and must not mutate with current profile edits.
- Positive match evidence must point to an existing canonical profile fact.

## Storage

- D1 is canonical structured truth.
- R2 stores private binary artifacts.
- Vectorize is a derived semantic index, never canonical state.
- IndexedDB is cache/outbox and must be rebuildable.

## AI

- AI output is a proposal until validated.
- AI may classify or rewrite but must not invent candidate facts.
- Structured AI output must be schema-validated before persistence.
- Missing data remains missing rather than guessed.

## Security

- Authorization derives `user_id` from authenticated identity, never request payload.
- Tokens never enter host-page JavaScript.
- Store the minimum page data needed for Workit.
- Do not log resume contents, application answers, or unrelated page content by default.
- Request browser permissions as narrowly as practical.

---

# 6. Git workflow

Use a lightweight trunk-oriented workflow.

## Branches

Default: continue on the current working branch.

Create a dedicated branch only when at least one is true:

- the change is risky or large enough to need isolation;
- parallel work is happening;
- the user explicitly requests a branch or PR;
- the change cannot reasonably be completed as one coherent working session.

Do not create a branch for every tiny edit.

If a branch is created:

```text
branch
→ complete one coherent task
→ verify
→ merge promptly
→ delete branch
```

Avoid long-lived feature branches.

## Commits

A commit should represent a coherent completed slice, not every file save.

Prefer:

```text
implementation + relevant tests + required docs
→ one logical commit
```

Use another commit when there is a real independent unit of work.

Avoid:

- WIP commit spam;
- "fix typo" / "fix tests" chains when they can be folded into the same unmerged change;
- mixing unrelated refactors with feature work;
- mass formatting unrelated files.

Before merge, squash incidental fixups when practical.

Commit messages should say what changed, for example:

```text
feat(extension): capture normalized job snapshots
fix(autofill): verify controlled input writes
test(extractor): cover Greenhouse JSON-LD fallback
docs: update application lifecycle contract
```

---

# 7. Refactoring rule

Refactor when it reduces concrete risk in the current change.

Good reasons:

- two paths implement the same business rule differently;
- ownership is ambiguous;
- a dependency direction prevents testing;
- the current structure creates a known unsafe change path;
- the change would otherwise add a second source of truth.

Not sufficient by itself:

- file is large;
- code is not DRY;
- a design pattern could be introduced;
- SOLID/KISS/clean-code terminology suggests a different shape.

Do not perform architecture rewrites as incidental cleanup.

---

# 8. Dependency rule

Do not add a dependency until existing platform/runtime capabilities are insufficient.

Before adding one, answer:

```text
what concrete problem does it solve?
why is current code/platform insufficient?
what runtime/bundle/maintenance cost does it add?
```

Prefer established dependencies over custom infrastructure when the dependency removes meaningful risk.

Avoid framework duplication.

---

# 9. Database and migration rule

Schema follows the domain contract.

For every schema change:

1. identify the invariant being represented;
2. keep ownership and foreign-key relationships explicit;
3. define required indexes from actual query paths;
4. verify transaction boundaries for multi-record invariants;
5. do not store derived values as canonical state unless query cost justifies it;
6. preserve immutable historical snapshot semantics.

Do not introduce speculative tables or generic metadata stores.

---

# 10. Browser compatibility workflow

For extraction or autofill changes:

```text
sanitized fixture
→ reproduce
→ implement generic behavior
→ add site adapter only if necessary
→ verify in deterministic fixture
→ verify supported real ATS path when practical
```

Prefer standards first:

```text
JobPosting structured data
→ known ATS adapter
→ generic DOM
→ AI normalization fallback
```

Site-specific selectors must be isolated in adapters and covered by fixtures.

---

# 11. Review before ship

Inspect the final diff, not only test output.

Check:

- does the change satisfy the requested behavior?
- is there one source of truth?
- did any adapter acquire business logic?
- is failure behavior explicit?
- is sensitive data exposure increased?
- are historical records still immutable?
- are tests protecting the actual risky behavior?
- did unrelated files change?
- did the change leave dead or parallel paths?
- did a product/engineering contract change and need documentation?

Do not keep adding polish once the acceptance criteria are satisfied.

---

# 12. Definition of done

A task is done when:

```text
requested behavior works
+
important failure path is handled
+
actual regression risk is verified
+
types/build are healthy for affected scope
+
dead transition code is removed
+
canonical docs are updated if contracts changed
+
diff contains no unrelated work
```

"More architecture" is not part of done.

"More tests" is not part of done once the important behavior is protected.

Ship when the slice is correct, understandable, and easy to change next.
