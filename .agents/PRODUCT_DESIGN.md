# Workit — Product Design Specification

Status: **Approved direction / pre-implementation**
Owner: howlil
Scope: browser extension + Workit workspace
Primary interface language: English
Last updated: 2026-09-25

---

## 1. Product definition

Workit is a **personal job-search memory and workflow system**.

It exists to remove four recurring problems:

1. job opportunities are scattered across many sites;
2. application data is repeatedly typed by hand;
3. users forget which resume and answers they submitted;
4. application context disappears when the original job listing changes or expires.

The core product promise is:

> **Workit remembers the entire context of every job and application so the user never reconstructs it manually again.**

Workit is not primarily a dashboard, recommendation feed, resume builder, or auto-apply bot.

The product loop is:

```text
Discover
  ↓
Capture
  ↓
Evaluate
  ↓
Save / Apply
  ↓
Autofill
  ↓
Remember
  ↓
Track
  ↓
Prepare
  ↓
Recall
```

---

## 2. Product principles

### 2.1 Capture before organize

Saving a job should be faster than copying it into a spreadsheet.

The default path is:

```text
job page detected
→ fields extracted
→ user sees compact preview
→ Save job
```

Manual editing is an exception, not the default.

### 2.2 Historical truth does not mutate

An application record must preserve what was actually submitted.

If the user later updates their profile, resume, or reusable answer, an older application must still show:

- the resume used at submission time;
- the exact answer text used;
- the job description snapshot captured at that time;
- the application state and events.

### 2.3 One canonical profile

Personal and career data is entered once.

```text
Career Profile
    ├── identity
    ├── experience
    ├── education
    ├── projects
    ├── skills
    ├── links
    └── preferences
         ↓
     autofill
     matching
     AI suggestions
```

AI may rewrite wording but must not invent factual experience.

### 2.4 AI must show evidence

Never show only an opaque match score.

```text
requirement
   ↓
supporting profile evidence
   ↓
match state
```

The user must be able to see why a requirement is marked strong, partial, or unsupported.

### 2.5 Context before navigation

Do not create a separate page for every feature.

Answers, autofill, job matching, snapshots, and interview context should appear where they are useful.

### 2.6 User owns consequential actions

Workit may detect, prepare, suggest, and fill.

Workit does **not** submit an application without explicit user action.

```text
recommend / prepare
→ user reviews
→ user approves fill
→ user submits on the source site
```

---

## 3. Core product objects

### 3.1 CareerProfile

Canonical source of truth about the user.

Contains:

- identity;
- contact information;
- work authorization;
- experience;
- education;
- projects;
- skills;
- links;
- location preferences;
- job-type preferences;
- compensation preference;
- notice period;
- reusable application facts.

### 3.2 Opportunity

A job the user discovered.

An Opportunity can exist without an Application.

```text
Opportunity
├── source
├── canonical URL
├── source job ID
├── company
├── title
├── location
├── work arrangement
├── employment type
├── salary
├── full job description
├── raw snapshot
├── captured_at
└── current lifecycle state
```

### 3.3 Application

Created when the user actually starts or submits an application.

```text
Application
├── opportunity_id
├── started_at
├── submitted_at
├── resume snapshot
├── answer snapshots
├── profile field snapshots
├── source
└── lifecycle state
```

### 3.4 AnswerMemory

Reusable application knowledge.

A semantic question concept may have multiple phrasings.

```text
Question concept
├── "Tell us about a challenging technical problem"
├── "Describe a difficult engineering problem"
└── "What is the hardest technical challenge you solved?"
        ↓
      Answer Memory
```

Each answer stores provenance:

- source experience/project;
- first company/role where used;
- last edited time;
- use count;
- whether it was user-written, imported, or AI-adapted.

### 3.5 Evidence

A traceable relationship between a job requirement and the user's profile.

```text
Requirement:
"Experience building backend APIs"

Evidence:
RuangIn
→ Express.js
→ booking + attendance APIs
```

### 3.6 ApplicationEvent

Chronological history.

Examples:

- opportunity saved;
- application started;
- application submitted;
- assessment received;
- recruiter contacted;
- interview scheduled;
- offer received;
- rejected;
- user note.

---

# 4. Information architecture

Workit has two product surfaces.

## 4.1 Browser surface

A small **floating launcher** in the bottom-right of the current web page.

It opens a contextual popup.

Purpose:

- capture current job;
- inspect match;
- start an application;
- autofill forms;
- retrieve previous answers;
- confirm submitted applications.

It is **not** a permanent browser side panel.

## 4.2 Workspace

A full extension workspace used for:

- browsing saved jobs;
- searching history;
- reviewing job details;
- managing canonical profile data;
- reviewing application history.

Primary navigation:

```text
Workit
├── Jobs
├── Search
└── Profile
```

Lifecycle states are filters inside Jobs, not separate product areas.

```text
All | Saved | Applying | Applied | Interview | Offer | Closed
```

---

# 5. Visual system

## 5.1 Visual direction

The product should feel:

- white-dominant;
- precise;
- compact;
- calm;
- technical;
- high-information-density;
- functional before decorative.

The UI should still make sense in grayscale.

### Hierarchy order

```text
position
→ spacing
→ text weight
→ surface
→ border
→ elevation
→ green accent
```

Do not use green as the first method of hierarchy.

---

## 5.2 Color policy

Workit uses one product hue: **green**.

Other hues are allowed only for semantic status.

### Structural neutrals

```css
--white:        #FFFFFF;

--text:         #444444;
--text-muted:   #777777;
--text-faint:   #9A9A9A;

--line:         #E9E9E9;
--line-strong:  #DCDCDC;
--hover:        #F8F8F8;
```

Neutral gray is structural, not decorative color.

### Workit green

```css
--green:         #2F7D44;
--green-hover:   #286D3B;
--green-soft:    #F2F8F3;
--green-soft-2:  #EAF4EC;
--green-line:    #D8EADB;
```

### Status-only colors

```css
--warning:       #B86B00;
--warning-soft:  #FFF6E8;

--danger:        #C94646;
--danger-soft:   #FFF1F1;
```

No blue, purple, cyan, pink, or decorative orange.

### 70 / 20 / 10 rule

Interpret this as **visual area and emphasis**, not a literal CSS calculation.

```text
70% white
→ application canvas
→ tables
→ content regions
→ primary surfaces

20% soft green
→ selected rows
→ canonical-source notice
→ autofill-ready context
→ AI / memory suggestions
→ quiet active states

10% green
→ primary actions
→ active indicators
→ positive evidence
→ progress
```

Status colors are exceptions and remain small.

---

## 5.3 Typography

Primary:

```text
Inter
ui-sans-serif
system-ui
sans-serif
```

Scale:

```text
12px  metadata / compact secondary UI
13px  default controls / rows
14px  important body
16px  section titles
18px  screen secondary heading
24px  maximum primary page heading
```

Primary text color is always `#444444`.

Weights:

```text
400 regular
500 medium
600 semibold
```

Avoid heavy bold.

---

## 5.4 Spacing

```text
4px   micro relationship
6px   close relationship
8px   compact control
12px  standard component padding
16px  group spacing
24px  section spacing
32px  major separation
```

Density should feel like a serious productivity tool.

---

## 5.5 Radius

```css
--radius-chip:    6px;
--radius-control: 8px;
--radius-card:    10px;
--radius-popup:   14px;
--radius-pill:    999px;
```

Do not use 20–24px rounded cards throughout the product.

---

## 5.6 Borders and elevation

Default:

```css
border: 1px solid var(--line);
```

Use stronger borders only for:

- focused fields;
- popup boundary;
- important separation;
- menus.

Elevation:

```text
hairline
→ button
→ contextual surface
→ popup
```

No large blurred SaaS shadows.

---

# 6. Browser Floating Launcher

This replaces the previous persistent side-panel model.

## 6.1 Closed state

The Workit launcher floats above the current webpage.

Suggested geometry:

```text
size:      44 × 44px
position:  fixed
right:     20px
bottom:    20px
radius:    14px or circular mark container
```

Hierarchy:

```text
Web page
   └── floating Workit launcher
```

The launcher must remain visually independent from the source website.

### Default

```text
[ W ]
```

### Context detected

A tiny status indicator may appear when Workit recognizes:

- a job page;
- an application form;
- a previously saved job.

Do not animate continuously.

---

## 6.2 Open behavior

```text
launcher closed
    ↓ click
popup opens above launcher
    ↓
launcher remains visible
    ↓ click launcher / close / Escape
popup closes
```

Animation:

```text
opacity 0 → 1
translateY(8px) → 0
150–200ms
```

Popup is anchored to the launcher.

Do not push or resize the source website.

---

## 6.3 Popup geometry

### Capture mode

```text
width: 360–380px
max-height: min(680px, viewport - 40px)
```

### Application Assistant mode

```text
width: 420–460px
max-height: viewport - 32px
internal scrolling allowed
```

The popup remains white-dominant.

---

# 7. Floating Popup — Job Capture screen

## 7.1 User goal

Answer:

> What job is this, how well does it map to my existing evidence, and what should I do now?

## 7.2 Component hierarchy

```text
JobCapturePopup
├── PopupHeader
│   ├── WorkitMark
│   ├── ProductName
│   ├── SettingsAction
│   └── CloseAction
│
├── DetectionState
│   ├── status
│   ├── source domain
│   └── open-source-page action
│
├── JobIdentity
│   ├── company mark
│   ├── title
│   ├── company
│   ├── location
│   └── metadata chips
│
├── MatchSummary
│   ├── evidence ratio
│   ├── gap count
│   └── snapshot freshness
│
├── KeyRequirements
│   ├── evidenced requirement × N
│   └── View all
│
├── MissingEvidence
│   └── unsupported requirement × N
│
└── Actions
    ├── Save job
    └── I'm applying
```

## 7.3 Primary action

Unknown job:

```text
Save job
```

After saved:

```text
I'm applying
```

Do not show three or four equal-weight CTAs.

## 7.4 Save behavior

```text
click Save job
   ↓
snapshot current job
   ↓
create Opportunity
   ↓
Saved confirmation
   ↓
primary action becomes "I'm applying"
```

Captured fields:

- title;
- company;
- location;
- employment type;
- work arrangement;
- salary if available;
- source URL;
- source job ID if available;
- full description;
- capture timestamp.

---

# 8. Jobs Workspace

## 8.1 User goal

Answer:

> What jobs do I currently have and what state are they in?

No analytics dashboard is needed for MVP.

## 8.2 Layout

```text
WorkspaceShell
├── Sidebar
│   ├── Workit
│   ├── Jobs
│   ├── Search
│   └── Profile
│
└── Main
    ├── Topbar
    │   ├── Search
    │   └── Add job
    │
    ├── PageHeader
    │   ├── "Your job search"
    │   └── summary metadata
    │
    ├── LifecycleFilters
    ├── JobsTable
    └── SelectedJobPreview
```

## 8.3 Jobs table

Use one continuous surface.

Columns:

```text
Opportunity | Evidence | Status | Updated | Actions
```

Opportunity cell:

```text
Company mark
Title
Company · Location · Work arrangement
```

Evidence:

```text
thin progress
7/10
```

Status examples:

- Saved — neutral;
- Applying — soft green;
- Applied — green;
- Interview — green;
- Offer — green;
- Closed — semantic danger only where necessary.

## 8.4 Selected row

Selected row may use `--green-soft`.

Do not fill the entire workspace with green.

Selected row:

```text
left 2px green indicator
+
soft green row background
```

## 8.5 Selected job preview

Selecting a row reveals compact context without forcing navigation.

```text
SelectedJobPreview
├── identity
├── lifecycle
├── View details
├── Open original
│
├── Evidence summary
├── Snapshot metadata
└── Application summary
```

This is preview, not the full detail page.

---

# 9. Job Detail

## 9.1 User goal

Answer:

> What was this job, why did it match me, what did I submit, and what happened afterward?

## 9.2 Layout

```text
JobDetail
├── MainColumn
│   ├── JobHeader
│   ├── MatchAnalysis
│   ├── StrongEvidence
│   ├── PartialEvidence
│   └── NoEvidence
│
└── ContextRail
    ├── ApplicationSnapshot
    ├── ActivityTimeline
    └── ResumeSnapshot
```

Ratio:

```text
main: ~70%
rail: ~30%
```

## 9.3 Job header

Contains:

- title;
- company;
- location;
- employment type;
- current lifecycle;
- Open original;
- Update status.

The status action should be obvious but not visually larger than the page title.

## 9.4 Match analysis

Header:

```text
Match analysis              7 of 10 requirements supported
```

Supporting copy:

> Evidence is traced back to saved experience, not inferred as fact.

### Strong evidence

Each row:

```text
✓ requirement
  source → concrete evidence                          Strong >
```

Green is allowed because it represents confirmed positive evidence.

### Partial evidence

```text
~ requirement
  available evidence is incomplete                   Partial >
```

Use warning color only for the small semantic indicator and label.

### No evidence yet

```text
! requirement
  no supporting profile fact                         Gap >
```

Use danger/status hue sparingly.

## 9.5 Context rail

Application snapshot:

- status;
- applied date;
- resume used;
- answer count;
- source.

Timeline:

```text
● Application submitted
│
○ Opportunity saved
│
○ Recruiter contacted
```

Order should be chronological, newest-first by default.

Resume snapshot:

- file name;
- imported/generated time;
- pages;
- size;
- parse state.

Historical application data is read-only unless explicitly editing a note/status.

---

# 10. Profile

## 10.1 User goal

Answer:

> What data will Workit trust and reuse when it autofills or analyzes jobs?

The profile is not merely Settings.

It is the **canonical career source of truth**.

## 10.2 Layout

```text
Profile
├── Header
│   ├── Career profile
│   ├── updated_at
│   ├── Import from resume
│   └── overflow
│
├── SourceOfTruthNotice
│
├── MainProfile
│   ├── Identity
│   ├── Experience
│   ├── Education
│   ├── Projects
│   ├── Skills
│   ├── Links
│   └── JobPreferences
│
└── ContextRail
    ├── ProfileCompleteness
    └── SourceResume
```

## 10.3 Import from resume

First-run preferred flow:

```text
Import resume
    ↓
parse candidate facts
    ↓
show extracted sections
    ↓
user reviews
    ↓
approve canonical profile
```

Never silently overwrite user-edited canonical facts during re-import.

If imported value conflicts with an edited canonical value:

```text
new imported candidate
→ Needs review
→ user chooses keep / replace
```

## 10.4 Profile sections

Identity:

- full name;
- email;
- phone;
- location;
- portfolio.

Experience:

- title;
- organization;
- dates;
- evidence bullets.

Education:

- degree;
- institution;
- dates.

Projects:

- project name;
- short description;
- evidence bullets.

Skills:

compact chips.

Links:

- GitHub;
- portfolio;
- LinkedIn;
- other relevant links.

Job preferences:

- authorization;
- salary expectation;
- notice period;
- job types;
- locations;
- roles.

---

# 11. Application Assistant / Autofill

Autofill is a first-class product capability.

## 11.1 User goal

Answer:

> What can Workit safely fill right now, what needs my review, and what information is missing?

## 11.2 Entry

On an application form:

```text
Workit launcher
   ↓ click
Application Assistant popup
```

If Workit detects an application form, the launcher may show a quiet readiness indicator.

## 11.3 Assistant hierarchy

```text
ApplicationAssistant
├── Header
│   ├── Workit
│   └── close
│
├── CurrentApplication
│   ├── company
│   ├── role
│   └── metadata
│
├── ReadinessSummary
│   ├── ready field count
│   └── needs-review count
│
├── BasicInformation
│   ├── Name
│   ├── Email
│   ├── Phone
│   └── LinkedIn
│
├── Documents
│   └── Resume
│
├── ApplicationQuestions
│   ├── AnswerMemoryMatch
│   └── MissingCanonicalAnswer
│
└── FooterActions
    ├── Auto-fill N fields
    ├── Review before submit
    └── View all data
```

## 11.4 Field state model

Every detected form field must be in one explicit state:

```text
detected
├── ready
├── suggested
├── needs_review
├── missing
├── filled
└── unsupported
```

### Ready

Canonical profile contains a deterministic value.

Example:

```text
Name       Howlil Tan             From profile   ✓
Email      howlil@example.com     From profile   ✓
Phone      +62 ...                From profile   ✓
```

### Suggested

Workit found reusable answer memory or generated an adaptation.

A suggestion is **not yet filled**.

### Needs review

A value exists but should not be inserted without confirmation.

Examples:

- salary;
- notice period;
- work authorization ambiguity;
- long-form essay answer.

### Missing

No canonical value or reusable answer exists.

### Filled

Workit inserted the value into the page.

### Unsupported

Workit cannot safely map the website control.

---

# 12. Autofill behavior

## 12.1 Deterministic basic fields

Examples:

- name;
- email;
- phone;
- location;
- LinkedIn;
- portfolio;
- education;
- work authorization.

Flow:

```text
detect field
→ match canonical profile key
→ mark Ready
→ user clicks Auto-fill
→ write field
→ mark Filled
```

## 12.2 Resume

```text
detect upload field
→ select configured resume
→ show exact file name
→ user approves Auto-fill
→ attach file
```

Never choose a resume invisibly when multiple resumes exist.

## 12.3 Screening questions

Example:

```text
"Tell us about a challenging technical problem"
        ↓
semantic search Answer Memory
        ↓
similar answer found
        ↓
show source + preview
        ↓
Use saved answer / Edit
```

UI:

```text
Similar answer from your memory

"While building RuangIn, I had to prevent..."

[Use saved answer] [Edit]
```

## 12.4 No saved answer

Example salary question:

```text
What is your expected monthly salary?
↓
No saved answer
↓
canonical salary preference missing
```

Display:

```text
Needs review
No canonical salary preference yet.
```

Do not invent a value.

## 12.5 AI-adapted answer

If the user chooses Adapt:

```text
saved answer
+
current job context
+
canonical evidence
        ↓
draft proposal
        ↓
user reviews
        ↓
Use answer
```

Label it clearly as a proposal.

Do not visually mark it as filled until approved.

---

# 13. Autofill approval model

Primary button:

```text
Auto-fill 8 fields
```

This fills only fields currently classified as Ready and explicitly selected.

Questions requiring review remain untouched.

After filling:

```text
8 fields filled
2 questions need review
```

The source site's Submit button remains under the user's control.

Workit never automatically clicks it.

---

# 14. Answer Memory

Answer memory should appear contextually rather than as a primary navigation page.

## 14.1 Stored record

```text
Answer
├── semantic question concept
├── original question wording
├── answer text
├── source facts
├── company
├── role
├── first_used_at
├── last_used_at
├── use_count
└── origin
```

Origin:

```text
user-written
imported
AI-adapted
```

## 14.2 Historical snapshot

When an application is submitted:

```text
canonical answer
        ↓
submission
        ↓
immutable application answer snapshot
```

Later edits to Answer Memory do not rewrite old application history.

---

# 15. Lifecycle state machine

## 15.1 Opportunity / application lifecycle

```text
Discovered
   ↓ Save
Saved
   ↓ I'm applying
Applying
   ↓ confirmed submitted
Applied
   ↓
Interview
   ↓
Offer

Any active state
   ↓
Closed
```

Closed includes rejection, withdrawal, expiration, or user-closed opportunity.

Store a close reason separately.

## 15.2 Primary CTA by state

```text
Discovered  → Save job
Saved       → I'm applying
Applying    → Continue application
Applied     → Add update
Interview   → Prepare
Offer       → Add update
Closed      → View history
```

One dominant action per state.

---

# 16. Browser context state graph

```text
ordinary page
→ launcher only

recognized job
→ launcher indicates context
→ popup = Capture

recognized saved job
→ popup = Existing opportunity

application form
→ popup = Application Assistant

application success page
→ popup asks "Application submitted?"

duplicate job
→ popup opens existing opportunity

unsupported form
→ popup explains unsupported fields
→ manual copy remains possible
```

---

# 17. Search

Global Search is a core memory capability.

Search sources:

- opportunities;
- companies;
- application history;
- answer memory;
- events;
- profile evidence.

Queries may include:

```text
Sea
backend
Go
expected salary
why do you want
rejected
```

Search results should expose the object type and useful context.

---

# 18. Empty, loading, error states

## 18.1 Empty Jobs

```text
No jobs yet.

Browse a job listing and use the Workit button to save it.

[Add job manually]
```

No illustration required.

## 18.2 Capture loading

Prefer:

```text
Reading job page…
Extracting job details…
Comparing with your profile…
```

Do not show only "Loading…".

## 18.3 Autofill loading

```text
Detecting fields…
Matching profile data…
Searching answer memory…
```

## 18.4 Failed extraction

```text
Could not read this job page.

[Retry]
[Add manually]
```

Do not silently create incomplete records.

---

# 19. Interaction details

## 19.1 Buttons

Primary:

- green fill;
- white text;
- 28–34px height depending on context.

Secondary:

- white;
- 1px neutral border;
- #444444 text.

Quiet:

- transparent;
- background only on hover.

## 19.2 Hover

Change at most:

- background;
- text;
- border.

No transform-heavy effects.

## 19.3 Focus

Keyboard focus must be visible.

Suggested:

```css
outline: 2px solid var(--green);
outline-offset: 2px;
```

## 19.4 Reduced motion

Respect `prefers-reduced-motion`.

The product must remain understandable with animation removed.

---

# 20. Responsive behavior

The primary target is desktop browser use.

Workspace:

```text
desktop
sidebar + main + optional context rail
```

On narrow workspace widths:

```text
sidebar collapses
context rail stacks below main
```

The floating browser popup does not become a full-screen modal unless viewport constraints require it.

---

# 21. MVP screen inventory

### Browser

1. Floating launcher — closed
2. Job capture popup — detected
3. Job capture popup — already saved
4. Application Assistant — autofill ready
5. Application Assistant — needs review
6. Submitted confirmation

### Workspace

7. Jobs Workspace
8. Job Detail
9. Profile
10. Search

No analytics dashboard in MVP.

---

# 22. MVP feature boundary

Ship:

- canonical Career Profile;
- resume import + profile review;
- job page detection;
- opportunity snapshot;
- floating launcher;
- contextual capture popup;
- evidence-based match;
- Jobs Workspace;
- Job Detail;
- application lifecycle tracking;
- Application Assistant;
- deterministic autofill;
- resume autofill;
- Answer Memory;
- timeline;
- global search.

Do not ship in initial MVP:

- autonomous auto-apply;
- recommendation feed;
- recruiter CRM;
- contact database;
- salary market intelligence;
- company review aggregation;
- networking automation;
- resume builder;
- cover-letter product;
- analytics dashboard;
- calendar sync;
- email sync.

These can be layered later without changing the core object model.

---

# 23. Product acceptance criteria

## Floating launcher

- never permanently reduces source-page width;
- opens and closes without navigation;
- popup is anchored to bottom-right launcher;
- context switches correctly between capture and application modes.

## Capture

- recognized job can be saved with one primary action;
- full job description is snapshotted;
- duplicate opportunity is detected;
- after Save, state visibly changes.

## Jobs

- user can understand lifecycle state without opening the row;
- selected row is distinguishable without heavy color;
- primary data remains readable with green removed.

## Job Detail

- user can see why match evidence exists;
- strong / partial / unsupported evidence are distinguishable;
- application snapshot is historical;
- timeline makes the application sequence obvious.

## Profile

- user can identify the canonical value for every autofill field;
- resume import does not silently overwrite edited facts;
- missing important data is discoverable.

## Application Assistant

- field readiness is visible before autofill;
- user knows the source of every value;
- suggested answers are visibly different from filled answers;
- missing values are never invented;
- Workit never submits the form automatically.

## Visual

- background remains predominantly white;
- primary text uses #444444;
- product hue is green only;
- other hues appear only for semantic status;
- soft green is used as context, not decoration;
- no large gradient, glass effect, glowing border, or decorative color block;
- compact density is maintained.

---

# 24. Canonical screen mental model

```text
Browser
  ↓
Floating Launcher
  ↓
Context Popup
  ├── Capture job
  └── Assist application

Workspace
  ├── Jobs
  │    └── Job Detail
  ├── Search
  └── Profile

Shared truth
  ├── Career Profile
  ├── Opportunities
  ├── Applications
  ├── Answer Memory
  ├── Evidence
  └── Timeline
```

This is the product boundary the implementation should preserve.

Backend schema, extension architecture, and MCP tools should follow this product model rather than introducing new product concepts.
