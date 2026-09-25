# Workit

[![Version](https://img.shields.io/badge/version-0.1.0-2F7D44.svg)](https://github.com/howlil/workit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%26%20D1-F38020.svg)](https://workers.cloudflare.com/)
[![WXT](https://img.shields.io/badge/Framework-WXT-7B61FF.svg)](https://wxt.dev/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-6E9F18.svg)](https://vitest.dev/)

> **Workit** is a personal job-search memory, context tracker, and smart autofill workflow system.

Workit captures jobs while browsing, preserves the exact context and snapshot of each application, reuses canonical profile data for verified autofill, remembers custom screening answers, tracks application state transitions with atomic guarantees, and exposes structured career context to AI clients via the Model Context Protocol (MCP).

---

## 🏛️ Monorepo Structure

Workit is built as an ultra-fast, strictly-bounded TypeScript monorepo using `pnpm` workspaces:

```text
workit/
├── apps/
│   ├── extension/       # Chrome MV3 Browser Extension (WXT, React 19, Shadow DOM)
│   └── worker/          # Cloudflare Worker API & MCP HTTP backend (Hono, D1, Auth Guards)
├── packages/
│   ├── contracts/       # Shared TypeScript schemas, DTOs, and API contract interfaces
│   ├── db/              # Cloudflare D1 migrations and transactional repositories
│   ├── domain/          # Pure core domain logic, algorithms, and 3-tier deduplication
│   ├── mcp/             # Workit Model Context Protocol (MCP) server & CLI stdio runner
│   └── shared/          # Common utilities, constants, and logging helpers
└── .agents/             # Canonical architectural, product, and engineering specifications
```

---

## ⚡ Core Capabilities

- **Lightweight Floating Launcher & Shadow DOM Popup**: Mounts in an isolated Shadow Root `#workit-root` with zero host-page CSS contamination, detecting ATS job postings and application forms non-intrusively.
- **Smart Controlled Autofill**: Autofills application forms safely with post-write DOM verification, multi-strategy input simulation (React synthetic events, native setters, ContentEditable), and resume file upload via synthetic `DataTransfer`.
- **Multi-Format Resume Import**: Parses resumes directly on the client side from **PDF** (`pdfjs-dist`), **DOCX** (`mammoth`), **Markdown**, and **Plain Text** into reviewable structured draft proposals before canonical persistence.
- **Answer Memory & Contextual Suggestions**: Saves reusable responses to employer screening prompts with 1-click suggestion matching by fuzzy question similarity and keyword matching.
- **Atomic Application State & Historical Immutability**: All status transitions (`saved` → `applying` → `applied`) and submitted screening answers are committed in atomic D1 batches (`db.batch()`). Submitted answers are permanent historical records that never mutate with subsequent profile updates.
- **Model Context Protocol (MCP) Integration**: Built-in MCP server providing tools (`search_opportunities`, `get_application_context`, `start_application`, `confirm_submission`, `batch_import_profile`) allowing AI assistants (Claude, ChatGPT, AGY) to inspect and interact with Workit data using the same domain rules.
- **Command Palette (Cmd+K / Ctrl+K)**: Instant keyboard-driven global search across opportunities, career profile facts, and answer memory items.
- **Reusable Component Architecture**: Canonical, token-compliant workspace primitives (`SectionCard`, `ResumeDropzone`, `AlertBanner`, `StatusToast`, `EmptyState`) enforcing the 70/20/10 Workit visual design system.

---

## 📖 Canonical Specifications

- [Product Design](./.agents/PRODUCT_DESIGN.md) — User flows, lifecycle states, and behavioral constraints.
- [Engineering Design](./.agents/ENGINEERING_DESIGN.md) — Architecture boundaries, runtime model, database invariants, and MCP contracts.
- [Design System](./DESIGN.md) — 70/20/10 color rules, spacing baseline, and component styling.
- [Workflow Rules](./AGENTS.md) — Development lifecycle, testing strategy, and quality invariants.

---

## 🛠️ Development & Tooling

### Prerequisites

- Node.js >= 20
- pnpm >= 9.15

### Commands

| Command | Action |
| --- | --- |
| `pnpm dev` | Start development servers concurrently (WXT dev extension + Wrangler worker) |
| `pnpm build` | Build all packages, Cloudflare worker bundle, and Chrome MV3 extension |
| `pnpm typecheck` | Run parallel TypeScript checks across all 7 workspace projects |
| `pnpm test` | Execute the unit and integration test suite via Vitest (23 suites, 97+ tests) |
| `pnpm test:e2e` | Run end-to-end browser tests via Playwright |
| `pnpm --filter @workit/mcp build` | Build standalone MCP CLI distribution |

---

## 🔒 Security & Invariants

- **Derive identity from authenticated session**: In production, `userId` is strictly resolved from cryptographic tokens or Cloudflare Access headers, never unvalidated client payloads.
- **Non-destructive auto-fill**: Workit never submits job applications automatically.
- **Shadow DOM Isolation**: All UI tokens and CSS variables are scoped to `#workit-root` to prevent leaks to and from hostile host pages.
- **Single Source of Truth**: Cloudflare D1 provides canonical relational truth. Local cache (IndexedDB) is disposable and rebuildable.

---

## 📄 License

[MIT](./LICENSE) © 2026 howlil
