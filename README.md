# Integration Manager — Prototype

A single-page, frontend-only prototype for the Integration Manager product. Built in React 18 (no build step), it lets users define and manage data flows between external systems (AVEVA PI, SEEQ, Augury, etc.) and Innovapptive products (iMaintenance, EHS, mRounds, etc.).

Live URL: `https://innosandeep.github.io/externalsystems-integration-manager/`

---

## Table of Contents

1. [Running Locally](#running-locally)
2. [Deployment](#deployment)
3. [Tech Stack & Architecture](#tech-stack--architecture)
4. [Design System](#design-system)
5. [Static Data & Seed Data](#static-data--seed-data)
6. [Helper Functions](#helper-functions)
7. [Primitive UI Components](#primitive-ui-components)
8. [Complex Reusable Components](#complex-reusable-components)
9. [Feature Surfaces](#feature-surfaces)
   - [Systems Page](#systems-page)
   - [System Detail Page](#system-detail-page)
   - [Add System Drawer](#add-system-drawer)
   - [Edit System Drawer](#edit-system-drawer)
   - [Add Integration Drawer](#add-integration-drawer)
   - [Edit Integration Drawer](#edit-integration-drawer)
   - [Mapping Workspace](#mapping-workspace)
   - [Webhook Registry Modal](#webhook-registry-modal)
   - [DLQ Inspect Modal](#dlq-inspect-modal)
10. [Page Routing & App Root](#page-routing--app-root)
11. [State Management](#state-management)
12. [Validation Logic](#validation-logic)
13. [Integration Types — Full Flow Reference](#integration-types--full-flow-reference)
14. [Feature Status](#feature-status)
15. [In Progress / Known Gaps](#in-progress--known-gaps)

---

## Running Locally

> Opening `index.html` via `file://` fails in most browsers due to CORS restrictions on local script loading.

```bash
cd /path/to/prototype-integration-manager-demo
python3 -m http.server 8000
```

Then open: `http://localhost:8000`

No build step. No `npm install`. React 18, ReactDOM, and Babel are loaded from CDN.

---

## Deployment

Deployed to **GitHub Pages** via GitHub Actions on every push to `main`.

Workflow file: `.github/workflows/deploy.yml`

- Triggered on: push to `main` or manual `workflow_dispatch`
- Environment: `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`
- Steps: checkout → configure-pages → upload-artifact (whole repo) → deploy-pages
- No manual steps required after merge

---

## Tech Stack & Architecture

| Aspect | Detail |
|---|---|
| Framework | React 18 (UMD, loaded from unpkg CDN) |
| JSX | Babel Standalone (in-browser transform) |
| Styling | Inline styles only — no CSS files, no className |
| State | `useState` + `useRef` + `useEffect` — all local, no Redux/Context |
| Routing | State-driven (`page` variable in App) — no React Router |
| Persistence | None — refresh resets all state to seed data |
| Fonts | Roboto (body), Roboto Mono (code/paths) via Google Fonts |
| File count | 1 JS file (`IntegrationManager.js`) + 1 HTML entry point (`index.html`) |

**`index.html`** loads three CDN scripts in order: React, ReactDOM, Babel. Then loads `IntegrationManager.js` as a Babel-transformed script tag, followed by an inline script that calls `ReactDOM.createRoot` and renders `<App />`.

---

## Design System

All visual tokens live in a single `C` object at the top of `IntegrationManager.js`. Colors are Figma v2-aligned.

### Color Tokens

| Token | Hex | Usage |
|---|---|---|
| `C.pageBg` | `#F5F5F5` | Page background |
| `C.bg0` | `#FFFFFF` | Cards, modals, inputs |
| `C.bg1` | `#FAFAFA` | Sidebars, hover rows, info blocks |
| `C.bg2` | `#EEEEEE` | Disabled fill, divider backgrounds, table headers |
| `C.bg3` | `#E0E0E0` | Stronger dividers |
| `C.border0` | `#E0E0E0` | Default border |
| `C.border1` | `#BDBDBD` | Medium emphasis border |
| `C.border2` | `#9E9E9E` | Strong border |
| `C.text0` | `#212121` | Primary text — headings, labels |
| `C.text1` | `#3D3D3D` | Secondary text — body |
| `C.text2` | `#757575` | Meta text, secondary labels |
| `C.text3` | `#9E9E9E` | Placeholder, disabled text |
| `C.navBg` | `#1A2233` | Top navigation background |
| `C.navBorder` | `#2A3447` | Nav border |
| `C.navText` | `#C8D0DC` | Nav link text |
| `C.navActive` | `#FFFFFF` | Active nav text |
| `C.navActiveBg` | `#2A3EB1` | Active nav item pill |
| `C.blue` | `#3D4FD6` | Primary action — buttons, links, active selections |
| `C.blueHover` | `#2A3EB1` | Primary button hover/border |
| `C.blueBg` | `#EEF0FB` | Blue-tinted backgrounds |
| `C.blueBorder` | `#D5D9F5` | Blue-tinted borders |
| `C.teal` | `#00796B` | Inbound direction, info |
| `C.tealBg` | `#E0F2F1` | Teal backgrounds |
| `C.tealBorder` | `#80CBC4` | Teal borders |
| `C.amber` | `#C47D0A` | Warnings, drafts |
| `C.amberBg` | `#FFF8E1` | Warning backgrounds |
| `C.amberBorder` | `#FFE082` | Warning borders |
| `C.red` | `#C62828` | Errors, failures, required field indicators |
| `C.redBg` | `#FFEBEE` | Error backgrounds |
| `C.redBorder` | `#EF9A9A` | Error borders |
| `C.green` | `#2E7D32` | Active status, success, "mapped" rows |
| `C.greenBg` | `#E8F5E9` | Success backgrounds |
| `C.greenBorder` | `#A5D6A7` | Success borders |
| `C.purple` | `#6A1B9A` | Outbound direction, AI action buttons |
| `C.purpleBg` | `#F3E5F5` | AI button gradient start |
| `C.purpleBorder` | `#CE93D8` | AI button dashed border |

### Typography

```js
const FONT = "'Roboto', 'Segoe UI', system-ui, sans-serif";   // All UI text
const MONO = "'Roboto Mono', 'Fira Code', 'Consolas', monospace"; // Paths, URLs, code, IDs
```

---

## Static Data & Seed Data

All static data is defined as constants at the top of `IntegrationManager.js`.

### Dropdown Option Lists

| Constant | Values |
|---|---|
| `PLANTS_OPTS` | Houston Plant, Dallas Refinery, Austin Facility, Corpus Christi Terminal |
| `PLANTS_ALL` | All Plants + PLANTS_OPTS |
| `CATEGORIES` | Historian, Analytics Platform, Process Safety, Consulting Integration, ERP, IoT Platform, CMMS, Other |
| `AUTH_TYPES` | API Key, Basic Auth, Bearer Token, OAuth 2.0, HMAC / Signature Secret, No Authentication |
| `HTTP_METHODS` | GET, POST |
| `TRIGGER_OPTIONS` | Always, Manual review approval |
| `FAILURE_OPTIONS` | Auto-retry 3x then DLQ, Mark for review, Skip and log, Block subsequent events until resolved |
| `FREQ_OPTIONS` | Every 5 min, Every 15 min, Every 30 min, Every 1 hour, Every 6 hours, Daily at start time |
| `INCOMING_AUTH_TYPES` | API Key (header), HMAC Signature, No Authentication |

### `PRODUCT_OBJECTS`

Maps each Innovapptive product to its list of available collections (business object types). Used to populate the Collections multi-select dropdown when creating or editing an inbound integration.

```
iMaintenance → Work Order, Notification, Operation, Component, Equipment,
               Functional Location, Measurement Point, Work Log, Attachment,
               Failure Reporting
mRounds      → Round, Round Plan, Asset, Location, Task, Issue, Action, Assignment
mInventory   → Material, Plant, Storage Location, Storage Bin, Stock, Reservation,
               Goods Receipt, Goods Issue, Transfer Posting, Cycle Count, Label
EHS          → Incident, Observation, Action, Permit, Risk Assessment, Audit, JHA
Platform     → Transition Compound Object, External System, Audit
```

### `SAMPLE_FIELDS`

The simulated source payload schema — 12 fields representing a typical external API response (e.g., an observation event from AVEVA PI). Each field has:

| Property | Type | Description |
|---|---|---|
| `src` | string | Dot-path or bracket-notation path (`asset.id`, `measurements[].value`) |
| `srcType` | string | One of: `string`, `datetime`, `number`, `enum`, `url` |
| `required` | boolean | Whether this field must be mapped before publish |
| `refLookup` | boolean | Whether this field references another entity (shows ⚠ in tree) |
| `nested` | boolean | Whether the path contains a `.` |
| `arrayPath` | boolean | Whether the path contains `[]` |
| `target` | string | Initially `""` — populated during mapping |
| `rowState` | string | Initially `"unmapped"` — becomes `"manual"` or `"auto-mapped"` |

**Required fields:** `id`, `timestamp`, `asset.id`, `measurements[].value`

**Important:** `required` on a mapping row is initialized from `SAMPLE_FIELDS` and must never be overwritten when the user changes the source dropdown (protected in `updateSrc`). Changing the source field does not change whether the row is required.

### `NESTED_TARGET_SCHEMA`

Hierarchical target field definitions used by the Mapping Workspace. Structure: `product → collection → [{ path, type, required, array? }]`

Currently populated for:

**iMaintenance**
- `Observation` — 14 fields (id, observation_time, asset.id, asset.name, asset.location.site, measurements[].value, measurements[].unit, severity, description, work_order_ref, source_system, schema_version, created_by, status)
- `Work Order` — 10 fields (id, title, asset.id, asset.name, priority, plannedStart, plannedEnd, status, assignee.id, description)
- `Notification` — 6 fields (id, type, asset.id, message, priority, created_at)

**EHS**
- `Observation` — 9 fields (id, observation_time, location.site, location.area, observer.id, category, severity, description, status)
- `Incident` — 8 fields (id, occurred_at, location.site, type, severity, description, involved_parties[].id, status)
- `Action` — 5 fields (id, title, due_date, assignee.id, status)

**mRounds**
- `Round` — 5 fields (id, name, scheduled_at, status, assignee.id)
- `Issue` — 7 fields (id, title, asset.id, severity, description, created_at, status)

**Not yet populated:** mInventory, Platform

### `AUTO_MAP_RULES`

A flat lookup object that maps source path → target path for the AI Auto Map simulation. 12 rules covering all `SAMPLE_FIELDS`. Used by `handleAutoMap` in `MappingWorkspace` to find candidate matches in `NESTED_TARGET_SCHEMA` for the selected product/collections.

```js
"id"                  → "id"
"timestamp"           → "observation_time"
"asset.id"            → "asset.id"
"asset.name"          → "asset.name"
"asset.location.site" → "asset.location.site"
"measurements[].value"→ "measurements[].value"
// ... etc.
```

### `STATUS_CONFIG`

Maps status keys to display-ready `{ label, color, bg, border }` objects. Used by `StatusBadge` and filter chips throughout the UI.

| Key | Label | Color |
|---|---|---|
| `ready` | Ready | Green |
| `draft` | Draft | Amber |
| `needs_attention` | Needs Attention | Red |
| `connection_incomplete` | Connection Incomplete | Amber |
| `active` | Active | Green |
| `ready_to_publish` | Ready to Publish | Blue |
| `failed` | Failed | Red |
| `disabled` | Disabled | Grey |

### Seed Data

**`INIT_SYSTEMS`** — 5 pre-seeded systems:

| Name | Category | Plant | Status |
|---|---|---|---|
| AVEVA PI System | Historian | Houston Plant | Ready |
| Augury | Analytics Platform | Houston Plant | Ready |
| SEEQ | Analytics Platform | Dallas Refinery | Needs Attention (2 errors) |
| Hexion PSI | Process Safety | Corpus Christi Terminal | Ready |
| Accenture | Consulting Integration | Austin Facility | Draft |

**`INIT_INTEGRATIONS`** — 3 pre-seeded integrations under AVEVA PI:

| Name | Direction | Method | Status |
|---|---|---|---|
| Observation Polling | Inbound | Polling | Active |
| WO Dispatch | Outbound | Webhook | Active |
| Alert Intake | Inbound | Webhook | Ready to Publish |

**`DEMO_WEBHOOKS`** — 1 pre-seeded webhook: `CMMS Work Order Sync` pointing to `https://cmms.company.com/webhooks/inno`.

**`ACTIVITY`** — 5 static activity feed entries (success, warning, info statuses).

**`DLQ_ENTRIES`** — 2 static dead-letter queue entries under SEEQ, both from the "Trend Sync" integration (connection timeout and HTTP 503 errors, 3 retries each).

**`AUDIT_LOG`** — 3 static audit log entries (system created, integration created, integration published).

---

## Helper Functions

### `generateCode(name, category)`

Auto-generates a System Code from name + category. Takes 4 chars from name + 3 chars from category + 3 random digits. Strips non-alphanumeric characters and pads with X if too short.

Example: `"AVEVA PI System"` + `"Historian"` → `"AVEV-HIS-423"`

Used in `AddSystemDrawer` via a `useEffect` that fires when `name` or `category` changes. The code is written to a `codeRef` and only auto-generated once — subsequent edits don't regenerate it.

### `genId(prefix)`

Generates a random ID string: `prefix + "_" + random base-36 string (6 chars)`.

### `isValidUrl(value)`

Returns `true` if the value parses as a valid `http:` or `https:` URL with a hostname containing a dot. Used to validate Base URL and Listener Endpoint URL fields.

### `summaryLine(integration, systemName)`

Returns a human-readable one-sentence description of what an integration does. Used in `IntegrationCard`. Logic:

- Draft → "Not yet active — complete configuration to start data flow."
- Disabled → "Paused — no data is flowing."
- Inbound polling with product/collection → "Pulls {collection} data from {system} into {product} {frequency}."
- Inbound webhook → "Receives {collection} events from {system} in real time."
- Outbound webhook → "Sends Innovapptive events to an external endpoint in real time."

### `blankAddSystemForm()` / `blankIntegrationForm()`

Return fresh empty form objects. `blankIntegrationForm()` initializes `fieldMappings` by spreading `SAMPLE_FIELDS` (each field gets its own object copy so mutations don't affect the constant).

### `blankKV()`

Returns `[{ key: "", value: "" }]` — the initial state for KVTable (params/headers).

---

## Primitive UI Components

These are stateless or near-stateless building blocks used throughout the codebase.

### `StatusBadge({ status, size })`

Renders a colored pill with a dot indicator. Reads display config from `STATUS_CONFIG`. Sizes: `"sm"` (default, 11px) and `"lg"` (12px).

### `DirectionBadge({ direction })`

Teal `↓ Inbound` or purple `↑ Outbound` pill.

### `MethodBadge({ method })`

Grey monospace pill showing `POLLING`, `WEBHOOK`, `FILE IMPORT`, or `FILE EXPORT`.

### `MonoText({ children, color, size })`

Inline span with `MONO` font family. Defaults to `C.blue` at 12px. Used for system codes, URLs, timestamps, path values.

### `SectionRule({ label })`

Horizontal rule with an uppercase label on the left. Creates visual grouping within form drawers.

### `FieldLabel({ label, required, helper, sublabel })`

Form field label block. Shows label text, optional sublabel (lighter, inline, to the right), optional red `*` for required, and optional helper text below. All rendered as a `div` with `marginBottom: 5`.

### `FieldInput({ value, onChange, placeholder, error, disabled, mono, type, onBlur })`

Controlled text input. Focus state turns border to `C.blue`. Error state turns border to `C.red`. Disabled state uses `C.bg2` background. Supports `mono` prop for monospace font. Full-width with `box-sizing: border-box`.

### `FieldSelect({ value, onChange, options, error, placeholder, disabled })`

Controlled `<select>`. Same focus/error/disabled behavior as `FieldInput`. Optional placeholder renders as an empty-value option.

### `FieldTextarea({ value, onChange, placeholder, rows, mono })`

Resizable `<textarea>`. `rows` defaults to 3. Supports `mono` prop.

### `FieldError({ msg })`

Renders a red error message with a `✕` icon if `msg` is truthy. Returns `null` otherwise.

### `InfoBox({ variant, children })`

A left-bordered info callout. Variants: `"teal"` (info), `"amber"` (warning), `"blue"` (neutral), `"green"` (success). Each variant has its own bg/border/accent/icon combination.

### `Spinner({ size })`

CSS-animated spinning circle (border-based). Default size 14px. Uses a `@keyframes imSpin` animation injected inline.

### `SelectionCard({ label, sublabel, description, selected, onClick, disabled, tag })`

Radio-style selection card for choosing Direction and Method in Step 1. Features:
- Blue border + blue background when selected
- Hover state with `C.border1` + `C.bg1`
- Disabled state with 55% opacity and `not-allowed` cursor
- Optional `tag` badge (e.g. "Coming Soon") in the top-right corner
- Radio dot indicator inside card
- `sublabel` shown inline next to the main label

### `StepIndicator({ current, steps })`

Step progress bar. Renders numbered circles connected by lines. Completed steps show a `✓` in blue. The active step's circle has a blue background. Inactive/future steps are grey.

---

## Complex Reusable Components

### `KVTable({ rows, onChange, addLabel })`

Postman-style key-value table for query parameters and request headers. Renders a grid of inline inputs (Key, Value, remove button). Row removal collapses to one empty row if all rows are removed. "Add row" button appends a new blank row.

### `AuthCredentials({ authType, form, set, prefix })`

Conditional credential sub-form rendered based on `authType`. The `prefix` parameter namespaces field keys (e.g. `"polling"` → `form.pollingApiKey`, `"incoming"` → no prefix). Renders nothing for unset or "No Authentication" values.

| Auth Type | Fields Rendered |
|---|---|
| API Key | API Key value + Header Name |
| Basic Auth | Username + Password |
| Bearer Token | Token value |
| OAuth 2.0 | Client ID + Client Secret + Token URL (2-col grid) |
| HMAC / Signature Secret | Signing Secret + Signature Header |

### `MultiSelectDropdown({ options, value, onChange, placeholder, disabled, error })`

Custom multi-select with checkbox rows. Key behaviors:

- Trigger button shows `placeholder` when nothing selected, item name when 1 item selected, `"N collections selected"` for multiple
- Dropdown panel opens below trigger, `position: absolute`, `z-index: 20`
- Click-outside closes via `document.addEventListener("mousedown", handler)` in a `useEffect` — cleans up on unmount or close
- Each row has a 14×14 checkbox div (not a native checkbox). Selected rows have blue background + white checkmark
- Selected items are displayed as blue chips below the component (rendered by the parent, not this component)

### `AIActionButton({ label, desc, running, result, onClick })`

Visually distinct button for AI-assistive actions (Auto Map, Validate). Design: purple-blue gradient background, dashed `C.purpleBorder` border, ✦ icon (replaced by ⏳ while running). Shows `desc` text when idle, shows `result` text after completion. Disabled during running state.

---

## Feature Surfaces

### Systems Page

**Component:** `SystemsPage`

The landing page. Shows a filterable grid of System cards.

**Toolbar:** Search input (filters by name + category) + plant select + count display  
**Status chips:** All / Ready / Draft / Needs Attention, each showing a count badge  
**Grid:** `repeat(auto-fill, minmax(400px, 1fr))` — 2 columns on wide screens

**Empty state:** Shown when filters return no results.

**`SystemCard`** — each card shows:
- System name + `StatusBadge`
- Category + plant (meta line)
- Description block (truncated to 2 lines)
- Integration count ("N integrations · N active")
- Error notification email (if set)
- Red error badge (if `system.errorBadge` is set)
- Amber warning if `errorEmail` is missing and status is not draft
- "View →" button (stops propagation to prevent double-navigation)
- Blue left border on hover

Clicking anywhere on the card navigates to the System Detail Page.

---

### System Detail Page

**Component:** `SystemDetailPage`

Accessed by clicking a System Card or after saving a new system.

**Header bar:** System name + `StatusBadge` (lg) + System Code/Category/Plant metadata strip + "Edit System" and "+ Add Integration" buttons

**Incomplete setup banner:** Amber warning banner if system is draft with no error email. Shows "Complete Setup" button that opens EditSystemDrawer.

**Flow Strip (`FlowStrip`):** Shows up to 4 active (non-disabled, non-draft) integrations as directional flow rows: `Source → object type → Destination` with method and status badges. Hidden if no active integrations. Each row has a teal (inbound) or purple (outbound) left border.

**Summary + Stats layout:** Two-column: left is `SummaryCard` (system details), right is a 2×2 `StatCard` grid.

`SummaryCard` fields: System Code (mono), Category, Plant, Error Email, Description (spans full width).

`StatCard` grid: Total Integrations, Active (green if >0), Items to Review (red if >0), Status.

**Connection details notice:** Teal info box explaining that connection details live at the integration level, not system level.

**Tabs:**
| Tab key | Component | Content |
|---|---|---|
| `integrations` | `IntegrationsTab` | List of integration cards with Edit/Disable actions |
| `activity` | `ActivityTab` | Static activity feed with colored status dots |
| `dlq` | `DLQTab` | Dead-letter queue entries with Replay/Discard stubs |
| `audit` | `AuditTab` | Audit log table (timestamp, user email, action) |

The Review Queue tab shows a red error count badge if `system.errorCount > 0`.

**`IntegrationCard`** — each card shows:
- Summary sentence (from `summaryLine()`)
- Integration name + `StatusBadge` + `DirectionBadge` + `MethodBadge`
- Metadata grid (4 columns): Product, Collections, How this runs, Last fetched/received
- Status-specific callout: draft (amber), ready_to_publish (blue), disabled (grey), failed (red)
- Edit and Enable/Disable buttons

**`DLQTab`** — amber intro callout + list of failed records. Each entry shows:
- Plain-English description: "A record from {integration} failed {N}h ago after {retries} attempts."
- Error message in a red callout box
- Record ID + retry count badge
- View record detail → opens `DLQInspectModal`
- Replay and Discard buttons (rendered but stubbed as "Coming Soon")

**`ActivityTab`** — static list of activity entries. Each row has a colored dot (green=success, amber=warning, blue=info, red=error), description text, and timestamp.

**`AuditTab`** — 3-column table: Timestamp (monospace), User email (monospace blue), Action text.

---

### Add System Drawer

**Component:** `AddSystemDrawer`

Slide-in drawer from the right (500px wide). Opens from the Systems Page "+ Add System" button.

**Fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| Plant | Select | Yes | PLANTS_OPTS |
| System Name | Text | Yes | Triggers code auto-generation |
| Category | Select | Yes | CATEGORIES |
| System Code | Read-only display | — | Auto-generated from name + category via `generateCode()`, shown in monospace blue |
| Description | Textarea | No | 2 rows |
| Error Notification Email | Text | Yes (for publish) | Validated as email format; not required for draft |

**Code auto-generation:** A `useEffect` watches `form.name` and `form.category`. If neither a code has been set yet (`!codeRef.current`), it calls `generateCode()` and stores the result in both `codeRef` and form state. The `codeRef` prevents regeneration on subsequent edits.

**Actions:**
- "Save as Draft" — skips email validation, sets `status: "draft"`
- "Save System" — full validation including email, sets `status: "ready"`, navigates directly to new system's Detail Page

**After save:** `App` prepends the new system to the systems array, sets `selectedId` to the new system's ID, and navigates to `"detail"`.

---

### Edit System Drawer

**Component:** `EditSystemDrawer`

500px right drawer. Opens from the "Edit System" button on System Detail Page or the "Complete Setup" button in the incomplete setup banner.

**Editable fields:** Name, Category, Plant, Description, Error Notification Email  
**Read-only:** System Code (displayed with `cursor: not-allowed`)

**Validation:** Name, Plant, Category, and Error Email are all required. Email format validated.

**Save behavior:** Calls `onSave` with updated system object (spread of original + changed fields). Sets `saved: true` which shows a green confirmation banner. Auto-closes after 900ms via `setTimeout`.

---

### Add Integration Drawer

**Component:** `AddIntegrationDrawer`

The most complex component. 580px right drawer. Conditionally renders a 2-step flow (with `StepIndicator`) or single-step flow (outbound webhook).

**Form state** is managed in `blankIntegrationForm()` which initializes all fields including `fieldMappings` (copy of SAMPLE_FIELDS). The `scrollRef` is used to reset scroll position to top on every step transition.

#### Step 1: Connection & Basics

**Section order:**

1. **Integration Name** — free text, required
2. **Direction** — two `SelectionCard` options:
   - "Bring data into Innovapptive" (Inbound)
   - "Send data from Innovapptive" (Outbound)
3. **Method** — shown after direction is selected. The framing question changes based on direction:
   - Inbound: "How should data arrive from the external system?"
   - Outbound: "How should Innovapptive deliver data to the external system?"

   Inbound options: Webhook (real-time event delivery), Polling (scheduled pull), File Import (disabled, Coming Soon)  
   Outbound options: Webhook (real-time delivery), File Export (disabled, Coming Soon)

4. **Product & Collections** — shown only for inbound after method is selected:
   - Product: single `FieldSelect` (PRODUCTS list)
   - Collections: `MultiSelectDropdown` populated from `PRODUCT_OBJECTS[product]`
   - Selected collections shown as blue chips below dropdown
   - Changing product resets collections to `[]`

5. **Connection config** — varies by method:

   **Inbound Webhook (`isInboundWebhook`):**
   - Listener Endpoint URL (required, validated as URL)
   - Incoming Authentication select (API Key / HMAC / None)
   - Conditional sub-fields for API Key (header name + key value) or HMAC (signing secret)
   - Teal InfoBox about registering the URL in the external system

   **Inbound Polling (`isPolling`):**
   - Base URL (required, validated as URL)
   - HTTP Method toggle buttons: GET or POST
   - Query Parameters (KVTable)
   - Request Headers (KVTable)
   - Request Body textarea (POST only)
   - POST Request Test button: simulates a 2s async test, shows success/error state with retry option
   - Authentication select (AUTH_TYPES) + `AuthCredentials` sub-form with `prefix="polling"`
   - Amber InfoBox about WAF whitelisting requirement

   **Outbound Webhook (`isOutboundWebhook`):**
   - Explanation text
   - Webhook select (from `webhooks` array passed as prop)
   - Selected webhook detail preview (target URL, event types)
   - "+ Create New Webhook" button → opens `WebhookRegistryModal`
   - Publish section at the bottom of Step 1 (no Step 2 for outbound webhook)

6. **Behavior** — shown for all methods after method is selected:
   - "When should this run?" (Trigger): Always / Manual review approval
   - "What happens if it fails?" (Failure handling): 4 options

**Footer (Step 1):**
- Cancel
- "Save as Draft"
- "Next: Mapping & Runtime →" (inbound/polling) OR "Publish Integration" (outbound webhook, disabled until webhook selected)

Outbound webhook publishes in one step. All other methods proceed to Step 2.

#### Step 2: Mapping, Runtime & Publish

**Section order:**

**Inbound Webhook:**
1. Connection Summary — 2×2 grid showing Listener URL, Incoming Auth, Runtime, Product
2. Data Mapping card — status-driven card + "Open Mapping Workspace →" button
3. "How this runs" — teal InfoBox: always real-time, no schedule

**Inbound Polling:**
1. Request Context — read-only summary of Step 1 settings, with "Edit" button to go back
2. Data Mapping card — same as webhook
3. How this runs — Frequency (required) + Start Time (local time) inputs in 2-column grid

**Both inbound:**

4. Readiness Checklist — 6 items:
   - Integration name set
   - Direction and method set
   - Connection configured
   - Product and collections set
   - Required mappings complete (checks `unmappedRequired === 0 && fieldMappings.some(m => m.target)`)
   - Runtime settings valid (polling: `!!form.frequency`)

5. Advanced runtime settings (collapsible):
   - Idempotency Key Field
   - Rate Limit (req/min)
   - Retry Policy
   - Error Email (inherits system email if blank)

6. Integration Summary — read-only key-value list

**Footer (Step 2):**
- "← Back"
- "Save as Draft"
- Context-aware primary CTA:
  - "Continue →" → opens Mapping Workspace (when mapping incomplete)
  - "Publish Integration" → calls `handleSave(true)` (when mapping complete)

**Mapping completeness check:** `unmappedRequired > 0 || form.fieldMappings.every(m => !m.target)` → show "Continue →"; otherwise show "Publish Integration".

**After publish:** Transitions to a publish success screen (same drawer, `published` state). Shows green confirmation banner, integration summary, and "Done" button. "Edit Mapping" is shown as a disabled "Coming Soon" element.

---

### Edit Integration Drawer

**Component:** `EditIntegrationDrawer`

520px right drawer. Opens from the "Edit" button on an `IntegrationCard`.

**Read-only context block:** Shows direction, method, and status. Note that direction and method cannot be changed after creation.

**Editable fields:**
- Integration Name (required)
- Product (inbound only, required)
- Collections (inbound only — shown as toggle chip buttons, not MultiSelectDropdown)
- Frequency + Start Time (polling only)
- Trigger and Failure handling (all)

Note: The Edit drawer uses chip-toggle buttons for collections (not `MultiSelectDropdown`). This differs from the Add drawer by design — it's a simpler edit surface.

**Save behavior:** Same auto-close pattern as `EditSystemDrawer` (900ms timeout).

---

### Mapping Workspace

**Component:** `MappingWorkspace`

Full-screen `position: fixed` overlay (z-index 211) that replaces the drawer for inbound integrations. Renders when `mappingOpen && isInbound` is true in `AddIntegrationDrawer`. Not available for outbound integrations.

**State:**
- `autoMapRunning` / `autoMapResult` — AI Auto Map simulation state
- `validateRunning` / `validateResult` — Validate simulation state
- `valOpen` — validation panel open/close
- `fetchState` — "idle" | "loading" | "done" — sample pull state
- `filterText` — row filter input value
- `collapsedGrps` — object keyed by group name, tracks which tree groups are collapsed

All state resets when `open` becomes false.

**Computed values:**
- `collections` = `form.businessObjects`
- `targetOpts` = array of `{ value: "Col::path", label: "Col.path" }` for all fields across all selected collections in `NESTED_TARGET_SCHEMA[product]`
- `srcOpts` = all `src` paths from `SAMPLE_FIELDS`
- `unmappedRequired` = count of rows where `required && !target`
- `dupTargets` = array of target values that appear more than once
- `mappedCount` = count of rows where `target` is non-empty
- `mappingComplete` = `unmappedRequired === 0 && mappedCount > 0`
- `mappingStatus` = one of:
  - `{ label: "Ready to publish", color: green, ... }` when complete
  - `{ label: "Mapping required", color: red, ... }` when nothing mapped
  - `{ label: "Mapping incomplete — N required field(s) unmapped", color: amber, ... }` otherwise
- `filteredRows` = `fieldMappings` with `_idx` attached, filtered by `filterText` against `src` or `target`

#### Layout

```
[ Header: Back button | "Data Mapping" title | system name | mappingStatus + count ]
[ Body: Left Panel (320px) | Right Panel (flex 1) ]
[ Footer: mappingStatus | Back | Save as Draft | Publish Integration ]
```

**Left panel — Target Collections + Source Sample + Payload Field Tree:**

- Collections: Blue chip badges for each selected collection
- Source Sample: "Pull sample" button (only shown if `baseUrl` is set). Simulates a 1.8s fetch, populates `sampleJson` and `schemaSummary`. Schema summary shows counts: Fields, Nested, Arrays.
- Payload Field Tree: Collapsible tree of all `SAMPLE_FIELDS` grouped by path prefix. Root-level fields shown flat; grouped fields (e.g. all `asset.*`) shown under a collapsible group header.

**`FieldTreeRow`** sub-component: Shows `src` path (mono), optional "array" badge (purple) for array paths, ⚠ icon for ref-lookups, type label (right-aligned), "req" badge (red) for required fields.

**Right panel — Toolbar + Validation panel + Mapping table:**

**Toolbar:**
- `AIActionButton` "Auto Map" — simulates 1.2s async mapping. Iterates over `fieldMappings`, looks up each `m.src` in `AUTO_MAP_RULES`, then checks if the rule's target path exists in any selected collection's `NESTED_TARGET_SCHEMA`. Sets `target = "Col::target_path"` and `rowState = "auto-mapped"`. Only maps rows that don't already have a target.
- `AIActionButton` "Validate" — simulates 1s async validation. Counts required mapped, optional skipped, type conflicts (always 0 in prototype), ref lookups, and duplicate targets. Stores result in `form.validationResult`. Supports Show/Hide toggle.
- Duplicate target warning badge (amber) if any target appears on multiple rows
- Filter input: filters rows by `src` or `target` text

**Validation panel** (collapsible, shown after Validate runs): 5 metric chips — Required mapped, Optional skipped, Type conflicts, Duplicates, Ref lookups. Green (ok) or amber (issue).

**Mapping table** — 5 columns with CSS grid: `minmax(150px,1.3fr) 60px 74px 82px minmax(200px,1.6fr)`:

| Column | Content |
|---|---|
| Source Field | `<select>` dropdown of all `srcOpts` (editable source) |
| Type | `srcType` from SAMPLE_FIELDS (read-only, mono) |
| Required | "Required" (red) or "Optional" (grey) — frozen, not updated by source changes |
| Status | `rowState` badge: Auto (green), Manual (blue), — (grey) |
| Innovapptive Target | `<select>` dropdown of all `targetOpts` formatted as `Collection.path` |

**Row background colors:**
- Auto-mapped rows: `#F5FAF7` (green-tinted)
- Required + unmapped rows: `#FFF8F8` (red-tinted)
- Alternating: `C.bg0` / `C.bg1`

Target dropdown border: red when required+unmapped, amber when duplicate.

**`updateSrc(idx, newSrc)`:** Looks up `newSrc` in `SAMPLE_FIELDS`. Spreads metadata onto row EXCEPT `required` (destructured out to prevent overwriting). Resets `target` to `""` and `rowState` to `"unmapped"`. This protects the mandatory mapping gate from source-swap bypass.

**`updateMapping(idx, key, val)`:** Updates `target` (or other keys). Sets `rowState` to `"auto-mapped"` if it was already auto-mapped, `"manual"` if it now has a target, `"unmapped"` if target cleared.

**Footer:** Publish button is `disabled` and grayed-out when `!mappingComplete`. Title attribute shows `mappingStatus.label` as tooltip when disabled.

---

### Webhook Registry Modal

**Component:** `WebhookRegistryModal`

Centered modal (520px wide). Opens from the "Create New Webhook" button in the Outbound Webhook section of Step 1.

**Fields:**
| Field | Required | Notes |
|---|---|---|
| Webhook Name | Yes | Friendly display name |
| Target URL | Yes | Validated as valid http/https URL |
| Signing Secret | No | For payload signature verification |
| Event Types | No | Comma-separated event type strings |

**On save:** Calls `onSave` with a new webhook object (genId'd). The parent `AddIntegrationDrawer` adds the webhook to the app-level `webhooks` state via `onAddWebhook`, then auto-selects it in the form.

---

### DLQ Inspect Modal

**Component:** `DLQInspectModal`

Centered modal (620px, up to 82vh). Opens when "View record detail" is clicked in the DLQ tab.

**Content:**
- Plain-English summary block: which integration, when it failed, how many retries, what the error was
- Meta strip: Integration name, Failed at timestamp, Retry count
- "Raw event data" collapsible section (default closed):
  - Formatted JSON display (custom `fmtJson` recursive formatter)
  - Parsed field table showing field name, type, and value for top-level keys

**Footer actions:**
- Close
- "Copy payload" — calls `navigator.clipboard.writeText(entry.payload)`
- Replay (Coming Soon stub)
- Discard (Coming Soon stub)

---

## Page Routing & App Root

**Component:** `App`

The root component. Manages global state and renders the correct page based on the `page` variable.

**Global state:**
- `systems` — array of system objects (initialized from `INIT_SYSTEMS`)
- `integrations` — array of integration objects (initialized from `INIT_INTEGRATIONS`)
- `webhooks` — array of webhook objects (initialized from `DEMO_WEBHOOKS`)
- `page` — `"systems"` | `"detail"` (navigation state)
- `selectedId` — ID of the currently selected system
- `sysDrawer` — boolean, controls `AddSystemDrawer` visibility
- `intDrawer` — boolean, controls `AddIntegrationDrawer` visibility

**Navigation:**
- Systems Page → System Detail: `setSelected(id); setPage("detail")`
- System Detail → Systems Page: `setPage("systems"); setSelected(null)`
- Add System save: navigates directly to new system's Detail Page

**Mutation handlers (all immutable — use `map` or spread):**
- `handleUpdateSystem(u)` — replace matching system in array
- `handleUpdateIntegration(u)` — replace matching integration in array
- `handleDisableIntegration(id)` — toggle status between `"disabled"` and `"active"`
- `handleSaveIntegration(n)` — append new integration to array
- `handleAddWebhook(wh)` — append new webhook to array

**`TopNav`** — fixed-height dark top bar. Shows product logo mark and name. "Workflows" and "My Approvals" nav links are rendered but static (no navigation behavior).

---

## State Management

All state is local React state. There is no global store, no Context API, and no persistence layer.

**Form state pattern:** All drawer forms use the same pattern:
1. `form` object (initialized from blank form factory)
2. `set(key, value)` shorthand: `setForm(f => ({...f, [k]: v}))`
3. `errors` object (keyed by field name)
4. `touched` object (keyed by field name, used to defer showing errors until field is interacted with)
5. `validate()` function returns `{ fieldName: "error message" }` object
6. `useEffect([open])` to reset all state when drawer closes

**Timer refs:** `fetchTimer` and `postTestTimer` are stored in `useRef` to allow cleanup on unmount via `useEffect(() => () => clearTimeout(...), [])`.

**Scroll reset:** `scrollRef` is attached to the scrollable body div of the drawer. `useEffect([step])` fires `scrollRef.current.scrollTop = 0` on every step change.

---

## Validation Logic

### System Validation (`AddSystemDrawer`)

| Field | Rule |
|---|---|
| Plant | Must be selected |
| System Name | Must be non-empty |
| Category | Must be selected |
| Error Email | Non-empty + valid email format (regex) — skipped for draft |

### Integration Step 1 Validation

| Field | Rule |
|---|---|
| Name | Non-empty |
| Direction | Must be selected |
| Method | Must be selected |
| Listener Endpoint URL | Required + valid URL (inbound webhook only) |
| Base URL | Required + valid URL (polling only) |
| Product | Required (inbound only) |
| Collections | At least one selected (inbound only) |

Validation runs on "Next: Mapping & Runtime →". All fields are marked as touched simultaneously so all errors show at once.

### Integration Step 2 / Publish

Publish is gated by `mappingComplete` (exposed as a Publish button state in both the drawer footer and the Mapping Workspace footer). `mappingComplete = unmappedRequired === 0 && mappedCount > 0`.

The Readiness Checklist in Step 2 gives users a visual pre-flight check — it does not block the "Save as Draft" action.

---

## Integration Types — Full Flow Reference

### Inbound Polling

1. Step 1: Name → Inbound + Polling → Product + Collections → Request Config (URL, method, params, headers, body, auth) → Behavior
2. Step 2: Request Context summary → Data Mapping card → Open Workspace → map all required fields → Back to drawer → Runtime (frequency + start time) → Readiness Checklist → Publish

### Inbound Webhook

1. Step 1: Name → Inbound + Webhook → Product + Collections → Listener Endpoint URL + Incoming Auth → Behavior
2. Step 2: Connection Summary → Data Mapping card → Open Workspace → map all required fields → Back to drawer → Runtime note (real-time, no schedule) → Readiness Checklist → Publish

### Outbound Webhook

Single step: Name → Outbound + Webhook → Select webhook from registry (or create new) → Behavior → Publish (enabled once webhook selected)  
No Step 2. No mapping required.

---

## Feature Status

### Systems

| Capability | Status |
|---|---|
| Create system with full form (name, category, plant, code, description, error email) | ✅ |
| Auto-generate System Code from name + category | ✅ |
| Save as Draft (skips email validation) | ✅ |
| Navigate to System Detail after save | ✅ |
| Edit system (all fields except code) | ✅ |
| System status display (Ready, Draft, Needs Attention) | ✅ |
| System-level error count badge | ✅ |
| Incomplete setup banner | ✅ |
| Search + plant filter + status filter chips | ✅ |

### Integrations

| Capability | Status |
|---|---|
| Create integration — two-step guided drawer | ✅ |
| Direction selection: Inbound / Outbound | ✅ |
| Method selection: Webhook / Polling | ✅ |
| Inbound webhook — listener URL + incoming auth (API Key, HMAC) | ✅ |
| Inbound polling — Base URL, HTTP method, params, headers, body | ✅ |
| POST request test + sample pull simulation | ✅ |
| Authentication configuration (API Key, Basic, Bearer, OAuth 2.0, HMAC) | ✅ |
| Outbound webhook — Webhook Registry selection or creation | ✅ |
| Product selection (single-select) | ✅ |
| Collections multi-select dropdown | ✅ |
| Behavior: trigger condition + failure handling | ✅ |
| Runtime: frequency + start time (polling) | ✅ |
| Readiness checklist in Step 2 | ✅ |
| Advanced runtime settings (idempotency, rate limit, retry, error email) | ✅ |
| Mapping Workspace — full-screen overlay | ✅ |
| Payload field tree — collapsible groups, type/required badges | ✅ |
| Source field dropdown per mapping row | ✅ |
| Target dropdown — Collection.path format, per-collection schema | ✅ |
| Auto Map (AI-simulated, rule-based) | ✅ |
| Validate (checks required, duplicates, ref lookups) | ✅ |
| Filter mapping rows by field name | ✅ |
| Mandatory mapping gate — Publish disabled until complete | ✅ |
| Required-field preservation on source edits (security fix) | ✅ |
| Save as Draft | ✅ |
| Publish Integration | ✅ |
| Publish success screen with summary | ✅ |
| Edit integration (name, product, collections, frequency) | ✅ |
| Disable / Re-enable integration | ✅ |
| Review Queue (DLQ) tab — dead-letter record inspection | ✅ |
| DLQ Inspect Modal — plain-English summary + raw payload + copy | ✅ |
| Audit log tab | ✅ |
| Activity feed on System Detail | ✅ |
| Active data flows strip on System Detail | ✅ |
| Integration summary sentence on cards | ✅ |

---

## In Progress / Known Gaps

| Area | Status |
|---|---|
| `NESTED_TARGET_SCHEMA` for mInventory and Platform | Not yet populated — target dropdowns will be empty for these products |
| Multi-collection mapping — deduplication / grouping of targets across collections | Schema lookup works, but cross-collection grouping in the table is not implemented |
| Edit Mapping post-publish | Stubbed as "Coming Soon" on publish success screen |
| Replay / Discard in DLQ | Buttons rendered but not wired |
| Validation panel — richer diff-style review view | Currently shows a basic metrics row; a detailed diff view is planned |
| File Import / File Export methods | Rendered as disabled "Coming Soon" cards in method selection |
| Workflows and My Approvals nav links | Rendered but not navigable |
