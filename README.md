# Workit

Workit is a personal job-search memory and workflow system.

The product captures jobs while browsing, keeps the exact context of each application, reuses canonical profile data for autofill, remembers screening answers, tracks application state, and exposes the same structured data to AI clients later.

## Product docs

- [Product Design](./PRODUCT_DESIGN.md)
- [Design System](./DESIGN.md)
- [Engineering Design](./ENGINEERING_DESIGN.md)

## Product boundary

Workit is not an auto-apply bot and not a generic CRM.

Its core loop is:

```text
Discover → Capture → Evaluate → Save / Apply → Autofill → Remember → Track → Prepare → Recall
```

The browser experience is intentionally lightweight: a floating Workit launcher opens a contextual popup only when the user needs it. The full workspace is used for reviewing, searching, and maintaining historical application context.
