# Integration Manager — Prototype

A single-page prototype for the Integration Manager product. Used to explore and validate the UX for defining Systems and Integrations in a low-code, business-friendly interface.

---

## What this is

Integration Manager lets users configure data flows between external systems (e.g. AVEVA PI, SEEQ, Augury) and Innovapptive products (iMaintenance, EHS, mRounds, etc.).

The prototype covers:

- Creating and managing **Systems** — identity containers for an external system, including category, plant assignment, and error notifications
- Creating and managing **Integrations** under a System — defining direction (inbound/outbound), method (webhook/polling), connection, authentication, field mapping, and runtime settings
- A guided two-step Add Integration flow for both polling and webhook integration types
- A dedicated **Mapping Workspace** for field-level source → target mapping

This is a frontend-only prototype. There is no backend. All state is in-memory and resets on page refresh.

---

## Key capabilities

### Systems

| Capability | Status |
|---|---|
| Create system (name, category, plant, code, description, error email) | ✅ |
| Auto-generate System Code from name + category | ✅ |
| Save as Draft or publish immediately | ✅ |
| Route to System Detail page after save | ✅ |
| Edit system (name, category, plant, code, description, error email) | ✅ |
| System status display (Ready, Draft, Needs Attention) | ✅ |
| System-level error count badge | ✅ |

### Integrations

| Capability | Status |
|---|---|
| Create integration under a system (two-step drawer) | ✅ |
| Direction selection: Inbound / Outbound | ✅ |
| Method selection: Webhook / Polling | ✅ |
| Inbound webhook — listener URL + incoming auth | ✅ |
| Inbound polling — Base URL, HTTP method, params, headers, request body | ✅ |
| POST request test + sample pull simulation | ✅ |
| Authentication configuration (API Key, Basic, Bearer, OAuth 2.0, HMAC) | ✅ |
| Outbound webhook — Webhook Registry selection or creation | ✅ |
| Product selection (single-select) | ✅ |
| Collections / Business Objects (multi-select dropdown) | ✅ |
| Behavior: trigger condition + failure handling | ✅ |
| Runtime: frequency + start time (polling) | ✅ |
| Field mapping via dedicated Mapping Workspace | ✅ |
| Auto Map (AI-assistive, simulated) | ✅ |
| Validate (checks required fields, duplicates, ref lookups) | ✅ |
| Save as Draft | ✅ |
| Publish Integration | ✅ |
| Edit integration (name, product, collections, frequency) | ✅ |
| Disable integration | ✅ |
| Review Queue (DLQ) tab — dead-letter record inspection | ✅ |
| Audit log tab | ✅ |
| Activity feed on System Detail | ✅ |
| Active data flows strip on System Detail | ✅ |

---

## Recent UX and design updates

### Design system / theming

- Token system updated to align with Figma v2 — all colors sourced from a central `C` object
- Typography switched to **Roboto** (body) and **Roboto Mono** (code/paths) via Google Fonts
- `bg1 = #FAFAFA` used for surface separation (sidebars, hover rows, info blocks) — distinct from `pageBg = #F5F5F5` and `bg0 = #FFFFFF`
- Active nav item uses a dedicated `navActiveBg` token (`#2A3EB1`) instead of a global primary override

### Flow improvements

- Add System routes directly to the new system's detail page after save
- CTA labels made consistent throughout: `Add Integration` (not "Create"), `Done` on publish success
- 2-column form rows aligned correctly — helper text no longer causes field height drift between columns
- Step 2 scroll position resets to top on every step transition (forward and back)

### Product & Collections

- Product remains a single-select dropdown
- Collections (previously "Business Object") upgraded to a **multi-select dropdown**: trigger button shows selection count, dropdown panel has checkbox rows, selected collections summarized as chips below
- Product & Collections section moved earlier in Step 1 — now appears immediately after Method selection, before Request Configuration and Authentication

### Mapping workspace

- Mapping moved out of the drawer into a **dedicated full-screen workspace** — necessary for the side-by-side source/target panel layout
- Step 2 Data Mapping section shows a status card ("N of M fields mapped") with an **"Open Mapping Workspace →"** CTA
- Footer CTA in Step 2 is context-aware:
  - **"Continue →"** when mapping is incomplete — opens the workspace
  - **"Publish Integration"** once all required fields are mapped
- The workspace toolbar uses `AIActionButton` components (purple-blue gradient, dashed border, `✦` icon) to visually distinguish AI-assistive actions (Auto Map, Validate) from commit actions

---

## AI-assisted mapping direction

Auto Map and Validate are intentionally styled as **assistive, non-destructive actions** — they suggest or check, they do not commit on behalf of the user.

The current implementation simulates AI behavior (rule-based mapping, static validation). The visual and interaction pattern — distinct button style, result feedback inline, no modal interruption — is designed to be forward-compatible with a real AI recommendation layer.

Planned direction:

- Auto Map backed by a model that reasons over source schema + target schema + prior mappings
- Validate extended to include type inference and semantic mismatch detection
- Mapping workspace showing AI confidence scores per row

---

## In-progress / next areas

The following are being actively shaped but are not yet fully implemented:

- **Nested path structures** in the mapping table — `NESTED_TARGET_SCHEMA` is defined for iMaintenance, EHS, and mRounds; mInventory and Platform schemas are not yet populated
- **Multi-collection mapping** — the workspace lists targets namespaced as `Collection::path` but cross-collection deduplication and grouping are not yet implemented
- **Mapping review / validation UX** — the validation panel in the workspace is functional but the display is minimal; a richer diff-style review view is planned
- **Edit Mapping post-publish** — the "Edit Mapping" action on the publish success screen is stubbed as Coming Soon
- **Replay / Discard in Review Queue** — DLQ entry actions are rendered but not wired

---

## UX decisions and rationale

**Why does Product & Collections appear before Request Configuration?**
Product and Collections define *what* data this integration handles. That is a higher-level decision than *how* the connection is configured. Asking for it earlier sets context for the rest of the form.

**Why is Collections multi-select?**
A single integration can pull data that maps to multiple object types (e.g. an Observation feed that populates both Observations and Work Orders). Forcing a single selection creates artificial workarounds.

**Why does mapping open in a dedicated workspace instead of the drawer?**
The mapping table needs a two-panel layout (source schema on the left, mapping rows on the right). A 580px drawer cannot accommodate this without horizontal scrolling or truncation. Full-screen is the right surface for this density of information.

**Why were the CTA labels simplified?**
"Configure Mapping & Publish →" combined two unrelated intents (open a surface, then commit). It created ambiguity about what clicking would do. Separating into "Continue →" and "Publish Integration" makes each action unambiguous.

---

## Running locally

> **Note:** Opening `index.html` directly via `file://` will fail in most browsers due to CORS restrictions on local script loading. Serve it over localhost instead.

```bash
cd /path/to/prototype-integration-manager-demo
python3 -m http.server 8000
```

Then open:

```
http://localhost:8000
```

No build step, no dependencies to install. The prototype loads React 18, ReactDOM, and Babel from CDN.

---

## Deployment

The prototype is deployed to **GitHub Pages** via GitHub Actions on every push to `main`.

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

Live URL: `https://innosandeep.github.io/externalsystems-integration-manager/`

Deployments trigger automatically. There is no manual step required after merging to `main`.
