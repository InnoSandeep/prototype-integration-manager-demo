/*
 * Integration Manager Prototype — IntegrationManager.js
 *
 * This is the entire application in a single file.
 * It runs in the browser with no build step (React and Babel load from CDN).
 *
 * What React does: React components describe what the screen should look like
 * based on the current data. When data changes, React automatically updates
 * only the parts of the screen that need to change.
 *
 * File structure (top to bottom):
 *  1. Theme & fonts             — colors and typography used across the whole UI
 *  2. Static / seed data        — dropdown options, field schemas, demo records
 *  3. Helper functions          — small utilities (generate code, format text, etc.)
 *  4. Primitive UI components   — buttons, inputs, labels, badges (reusable building blocks)
 *  5. Complex UI components     — multi-select dropdown, auth form, AI action buttons
 *  6. Feature surfaces          — Add/Edit System drawer, Add/Edit Integration drawer,
 *                                 Mapping Workspace, Webhook Registry modal, DLQ inspect modal
 *  7. Page components           — Systems list page, System Detail page
 *  8. App root                  — navigation state, top-level data, renders the right page
 */

// Pull in the React hooks we need.
// useState: holds data that can change (form values, open/closed drawers, etc.)
// useMemo: caches expensive calculations so they don't re-run on every render
// useEffect: runs side-effects when data changes (e.g. reset form when drawer opens)
// useRef: holds a value that persists across renders without triggering a re-render
const { useState, useMemo, useEffect, useRef } = React;

// ─── THEME (v2 — Figma-aligned) ───────────────────────────────────────────────
// All colors used in the UI are defined here as named tokens.
// Instead of scattering hex codes through the code, every component references
// these names (e.g. C.blue, C.red). Changing a token here updates it everywhere.
// Colors are aligned with the Figma v2 design specification.
const C = {
  pageBg:      "#F5F5F5",   // grey-100
  bg0:         "#FFFFFF",   // White — cards, modals, inputs
  bg1:         "#FAFAFA",   // slightly above pageBg — hover rows, sidebars, info blocks
  bg2:         "#EEEEEE",   // grey-200 — disabled fill, divider bg
  bg3:         "#E0E0E0",   // grey-300 — stronger divider
  border0:     "#E0E0E0",   // grey-300 — default border
  border1:     "#BDBDBD",   // grey-400 — medium emphasis border
  border2:     "#9E9E9E",   // grey-500 — strong border
  text0:       "#212121",   // text-primary — headings, labels
  text1:       "#3D3D3D",   // text-secondary — body text
  text2:       "#757575",   // grey-600 — secondary/meta
  text3:       "#9E9E9E",   // grey-500 — placeholder, disabled
  navBg:       "#1A2233",
  navBorder:   "#2A3447",
  navText:     "#C8D0DC",
  navActive:   "#FFFFFF",
  navActiveBg: "#2A3EB1",   // alpha/primary-700 — active nav item pill
  blue:        "#3D4FD6",   // alpha/primary-500
  blueHover:   "#2A3EB1",   // alpha/primary-700
  blueBg:      "#EEF0FB",   // alpha/primary-50
  blueBorder:  "#D5D9F5",   // alpha/primary-100
  teal:        "#00796B",   // gamma/accent/cyan — inbound, info
  tealBg:      "#E0F2F1",
  tealBorder:  "#80CBC4",
  amber:       "#C47D0A",   // gamma/accent/orange — warning, draft
  amberBg:     "#FFF8E1",
  amberBorder: "#FFE082",
  red:         "#C62828",   // gamma/accent/red — error, failed
  redBg:       "#FFEBEE",
  redBorder:   "#EF9A9A",
  green:       "#2E7D32",   // gamma/accent/green — active, success
  greenBg:     "#E8F5E9",
  greenBorder: "#A5D6A7",
  purple:      "#6A1B9A",   // gamma/accent/purple — outbound
  purpleBg:    "#F3E5F5",
  purpleBorder:"#CE93D8",
};
const FONT = "'Roboto', 'Segoe UI', system-ui, sans-serif";
const MONO = "'Roboto Mono', 'Fira Code', 'Consolas', monospace";

// ─── STATIC DATA ─────────────────────────────────────────────────────────────
// These constants define the fixed options that appear in dropdowns throughout the UI.
// Changing a value here updates every dropdown that uses it.
const PLANTS_OPTS = ["Houston Plant","Dallas Refinery","Austin Facility","Corpus Christi Terminal"];
const PLANTS_ALL  = ["All Plants",...PLANTS_OPTS];
const CATEGORIES  = ["Historian","Analytics Platform","Process Safety","Consulting Integration","ERP","IoT Platform","CMMS","Other"];
const AUTH_TYPES  = ["— Select auth type —","API Key","Basic Auth","Bearer Token","OAuth 2.0","HMAC / Signature Secret","No Authentication"];
const HTTP_METHODS = ["GET","POST"];
const TRIGGER_OPTIONS = ["Always","Manual review approval"];
const FAILURE_OPTIONS = ["Auto-retry 3x then DLQ","Mark for review","Skip and log","Block subsequent events until resolved"];
const FREQ_OPTIONS    = ["Every 5 min","Every 15 min","Every 30 min","Every 1 hour","Every 6 hours","Daily at start time"];
const INCOMING_AUTH_TYPES = ["API Key (header)","HMAC Signature","No Authentication"];


// Maps each Innovapptive product to the collection types (business objects) it supports.
// When a user selects a product in the integration form, the Collections dropdown
// is automatically populated from this list.
const PRODUCT_OBJECTS = {
  "iMaintenance": ["Observation","Work Order","Notification","Measurement Point","Work Log","Operation","Component","Equipment","Functional Location","Attachment","Failure Reporting"],
  "mRounds":      ["Round","Issue","Task","Action","Round Plan","Asset","Location","Assignment"],
  "mInventory":   ["Material","Goods Receipt","Goods Issue","Plant","Storage Location","Storage Bin","Stock","Reservation","Transfer Posting","Cycle Count","Label"],
  "EHS":          ["Observation","Incident","Action","Permit","Risk Assessment","Audit","JHA"],
  "Platform":     ["External System","Transition Compound Object","Audit"],
};
const PRODUCTS = Object.keys(PRODUCT_OBJECTS);

// Simulates the fields that come from an external system's API response.
// This is the "source" side of the field mapping — it represents what the external
// payload looks like (e.g. a sensor observation event from AVEVA PI).
//
// In a real product, this schema would be discovered automatically by pulling
// a live sample from the endpoint. Here it is hardcoded to simulate that behavior.
//
// Each field has:
//   src        — the dot-path where this value sits in the JSON payload
//   srcType    — the data type (string, datetime, number, enum, url)
//   required   — if true, this field MUST be mapped before the integration can be published
//   refLookup  — if true, this field references another entity (shown with ⚠ in the workspace)
//   nested     — true if the path contains a "." (e.g. "asset.id")
//   arrayPath  — true if the path contains "[]" (e.g. "measurements[].value")
//   target     — starts empty; filled in during the mapping step
//   rowState   — "unmapped" initially; becomes "manual" or "auto-mapped" after mapping
//
// IMPORTANT: The "required" flag is fixed at initialization and must never be changed
// when the user swaps the source field. This protects the publish gate from being bypassed.
const SAMPLE_FIELDS = [
  { src:"id",                    srcType:"string",   required:true,  refLookup:false, nested:false, arrayPath:false, target:"", rowState:"unmapped" },
  { src:"timestamp",             srcType:"datetime", required:true,  refLookup:false, nested:false, arrayPath:false, target:"", rowState:"unmapped" },
  { src:"asset.id",              srcType:"string",   required:true,  refLookup:true,  nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
  { src:"asset.name",            srcType:"string",   required:false, refLookup:true,  nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
  { src:"asset.location.site",   srcType:"string",   required:false, refLookup:false, nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
  { src:"measurements[].value",  srcType:"number",   required:true,  refLookup:false, nested:false, arrayPath:true,  target:"", rowState:"unmapped" },
  { src:"measurements[].unit",   srcType:"string",   required:false, refLookup:false, nested:false, arrayPath:true,  target:"", rowState:"unmapped" },
  { src:"severity",              srcType:"enum",     required:false, refLookup:false, nested:false, arrayPath:false, target:"", rowState:"unmapped" },
  { src:"description",           srcType:"string",   required:false, refLookup:false, nested:false, arrayPath:false, target:"", rowState:"unmapped" },
  { src:"links.workOrder.href",  srcType:"url",      required:false, refLookup:true,  nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
  { src:"metadata.source",       srcType:"string",   required:false, refLookup:false, nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
  { src:"metadata.version",      srcType:"string",   required:false, refLookup:false, nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
];

// Defines the fields that Innovapptive products expect to receive — the "target" side of mapping.
// Structure: Product name → Collection name → list of target fields
//
// When a user selects a product (e.g. iMaintenance) and one or more collections
// (e.g. "Observation", "Work Order"), the Mapping Workspace uses this schema to
// populate the target field dropdown for each row.
//
// Target field paths are displayed in the workspace as "Collection.fieldPath"
// (e.g. "Observation.asset.id") so users know which collection each field belongs to.
//
// "required: true" means the Innovapptive product needs this field to create a valid record.
//
// Currently populated for: iMaintenance, EHS, mRounds
// NOT YET populated for: mInventory, Platform — target dropdowns will be empty for those.
const NESTED_TARGET_SCHEMA = {
  "iMaintenance": {
    "Observation": [
      { path:"id",                    type:"string",   required:true  },
      { path:"observation_time",      type:"datetime", required:true  },
      { path:"asset.id",              type:"string",   required:true  },
      { path:"asset.name",            type:"string",   required:false },
      { path:"asset.location.site",   type:"string",   required:false },
      { path:"measurements[].value",  type:"number",   required:true,  array:true },
      { path:"measurements[].unit",   type:"string",   required:false, array:true },
      { path:"severity",              type:"enum",     required:false },
      { path:"description",           type:"string",   required:false },
      { path:"work_order_ref",        type:"url",      required:false },
      { path:"source_system",         type:"string",   required:false },
      { path:"schema_version",        type:"string",   required:false },
      { path:"created_by",            type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
    "Work Order": [
      { path:"id",                    type:"string",   required:true  },
      { path:"title",                 type:"string",   required:true  },
      { path:"asset.id",              type:"string",   required:true  },
      { path:"asset.name",            type:"string",   required:false },
      { path:"priority",              type:"enum",     required:false },
      { path:"plannedStart",          type:"datetime", required:false },
      { path:"plannedEnd",            type:"datetime", required:false },
      { path:"status",                type:"enum",     required:false },
      { path:"assignee.id",           type:"string",   required:false },
      { path:"description",           type:"string",   required:false },
    ],
    "Notification": [
      { path:"id",                    type:"string",   required:true  },
      { path:"type",                  type:"enum",     required:true  },
      { path:"asset.id",              type:"string",   required:true  },
      { path:"message",               type:"string",   required:false },
      { path:"priority",              type:"enum",     required:false },
      { path:"created_at",            type:"datetime", required:false },
    ],
    "Measurement Point": [
      { path:"id",                    type:"string",   required:true  },
      { path:"asset.id",              type:"string",   required:true  },
      { path:"characteristic",        type:"string",   required:true  },
      { path:"value",                 type:"number",   required:true  },
      { path:"unit",                  type:"string",   required:false },
      { path:"measured_at",           type:"datetime", required:false },
      { path:"source_system",         type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
    "Work Log": [
      { path:"id",                    type:"string",   required:true  },
      { path:"work_order.id",         type:"string",   required:true  },
      { path:"performed_at",          type:"datetime", required:false },
      { path:"performed_by.id",       type:"string",   required:false },
      { path:"duration_minutes",      type:"number",   required:false },
      { path:"description",           type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
  },
  "EHS": {
    "Observation": [
      { path:"id",                    type:"string",   required:true  },
      { path:"observation_time",      type:"datetime", required:true  },
      { path:"location.site",         type:"string",   required:true  },
      { path:"location.area",         type:"string",   required:false },
      { path:"observer.id",           type:"string",   required:false },
      { path:"category",              type:"enum",     required:false },
      { path:"severity",              type:"enum",     required:false },
      { path:"description",           type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
    "Incident": [
      { path:"id",                    type:"string",   required:true  },
      { path:"occurred_at",           type:"datetime", required:true  },
      { path:"location.site",         type:"string",   required:true  },
      { path:"type",                  type:"enum",     required:true  },
      { path:"severity",              type:"enum",     required:true  },
      { path:"description",           type:"string",   required:false },
      { path:"involved_parties[].id", type:"string",   required:false, array:true },
      { path:"status",                type:"enum",     required:false },
    ],
    "Action": [
      { path:"id",                    type:"string",   required:true  },
      { path:"title",                 type:"string",   required:true  },
      { path:"due_date",              type:"date",     required:false },
      { path:"assignee.id",           type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
    "Permit": [
      { path:"id",                    type:"string",   required:true  },
      { path:"type",                  type:"enum",     required:true  },
      { path:"location.site",         type:"string",   required:true  },
      { path:"issued_at",             type:"datetime", required:false },
      { path:"expires_at",            type:"datetime", required:false },
      { path:"issued_to.id",          type:"string",   required:false },
      { path:"description",           type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
    "Risk Assessment": [
      { path:"id",                    type:"string",   required:true  },
      { path:"title",                 type:"string",   required:true  },
      { path:"location.site",         type:"string",   required:false },
      { path:"assessed_at",           type:"datetime", required:false },
      { path:"assessed_by.id",        type:"string",   required:false },
      { path:"severity",              type:"enum",     required:false },
      { path:"description",           type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
  },
  "mRounds": {
    "Round": [
      { path:"id",                    type:"string",   required:true  },
      { path:"name",                  type:"string",   required:true  },
      { path:"scheduled_at",          type:"datetime", required:false },
      { path:"status",                type:"enum",     required:false },
      { path:"assignee.id",           type:"string",   required:false },
    ],
    "Issue": [
      { path:"id",                    type:"string",   required:true  },
      { path:"title",                 type:"string",   required:true  },
      { path:"asset.id",              type:"string",   required:false },
      { path:"severity",              type:"enum",     required:false },
      { path:"description",           type:"string",   required:false },
      { path:"created_at",            type:"datetime", required:false },
      { path:"status",                type:"enum",     required:false },
    ],
    "Task": [
      { path:"id",                    type:"string",   required:true  },
      { path:"title",                 type:"string",   required:true  },
      { path:"asset.id",              type:"string",   required:false },
      { path:"due_at",                type:"datetime", required:false },
      { path:"assignee.id",           type:"string",   required:false },
      { path:"description",           type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
    "Action": [
      { path:"id",                    type:"string",   required:true  },
      { path:"title",                 type:"string",   required:true  },
      { path:"due_date",              type:"date",     required:false },
      { path:"assignee.id",           type:"string",   required:false },
      { path:"description",           type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
  },
  "mInventory": {
    "Material": [
      { path:"id",                    type:"string",   required:true  },
      { path:"description",           type:"string",   required:true  },
      { path:"plant.id",              type:"string",   required:true  },
      { path:"material_type",         type:"enum",     required:false },
      { path:"unit_of_measure",       type:"string",   required:false },
      { path:"base_unit",             type:"string",   required:false },
      { path:"source_system",         type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
    "Goods Receipt": [
      { path:"id",                    type:"string",   required:true  },
      { path:"material.id",           type:"string",   required:true  },
      { path:"plant.id",              type:"string",   required:true  },
      { path:"quantity",              type:"number",   required:true  },
      { path:"unit_of_measure",       type:"string",   required:false },
      { path:"posting_date",          type:"datetime", required:false },
      { path:"reference_document",    type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
    "Goods Issue": [
      { path:"id",                    type:"string",   required:true  },
      { path:"material.id",           type:"string",   required:true  },
      { path:"plant.id",              type:"string",   required:true  },
      { path:"quantity",              type:"number",   required:true  },
      { path:"unit_of_measure",       type:"string",   required:false },
      { path:"posting_date",          type:"datetime", required:false },
      { path:"cost_center",           type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
  },
  "Platform": {
    "External System": [
      { path:"id",                    type:"string",   required:true  },
      { path:"name",                  type:"string",   required:true  },
      { path:"type",                  type:"enum",     required:false },
      { path:"endpoint_url",          type:"url",      required:false },
      { path:"description",           type:"string",   required:false },
      { path:"status",                type:"enum",     required:false },
    ],
    "Transition Compound Object": [
      { path:"id",                    type:"string",   required:true  },
      { path:"source_id",             type:"string",   required:true  },
      { path:"source_system",         type:"string",   required:true  },
      { path:"object_type",           type:"enum",     required:false },
      { path:"payload",               type:"string",   required:false },
      { path:"created_at",            type:"datetime", required:false },
      { path:"status",                type:"enum",     required:false },
    ],
  },
};

// The rule set that powers the "Auto Map" AI-assistive feature in the Mapping Workspace.
// Each entry says: "if the source field path is X, suggest target field path Y".
//
// When a user clicks "Auto Map", the system checks each unmapped source field against
// these rules, then looks up whether the suggested target path actually exists in the
// selected product's schema. If it does, the mapping is filled in automatically.
//
// In a real product, this would be replaced by an AI/ML model that reasons over
// source and target schemas, plus prior mappings from similar integrations.
// The current simulation uses this flat rule table as a stand-in.
// The visual pattern (distinct button style, inline result, no silent auto-commit)
// is intentionally designed to stay compatible with a real AI layer.
const AUTO_MAP_RULES = {
  "id":"id",
  "timestamp":"observation_time",
  "asset.id":"asset.id",
  "asset.name":"asset.name",
  "asset.location.site":"asset.location.site",
  "measurements[].value":"measurements[].value",
  "measurements[].unit":"measurements[].unit",
  "severity":"severity",
  "description":"description",
  "links.workOrder.href":"work_order_ref",
  "metadata.source":"source_system",
  "metadata.version":"schema_version",
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────
// Pre-loaded demo data that appears when the prototype first loads.
// This makes the prototype feel like a real product with existing content.
// All data resets to these values on page refresh — nothing is saved to a server.

// The five demo systems that appear on the Systems list page at startup.
// Systems are lightweight identity records — name, category, plant, error email.
// Connection details (URL, auth) live inside individual integrations, not here.
const INIT_SYSTEMS = [
  { id:"sys_pi",        name:"AVEVA PI System",  category:"Historian",             code:"AVEVA-PI-001", plant:"Houston Plant",           errorEmail:"ops-alerts@company.com", status:"ready",           errorCount:0, description:"OSIsoft PI System historian for real-time sensor and process data." },
  { id:"sys_augury",    name:"Augury",           category:"Analytics Platform",    code:"AUGRY-001",    plant:"Houston Plant",           errorEmail:"augury-ops@company.com", status:"ready",           errorCount:0, description:"Predictive maintenance and machine health analytics." },
  { id:"sys_seeq",      name:"SEEQ",             category:"Analytics Platform",    code:"SEEQ-001",     plant:"Dallas Refinery",         errorEmail:"seeq-ops@company.com",   status:"needs_attention", errorCount:2, description:"Advanced analytics and process data investigation platform.", errorBadge:"2 items need review" },
  { id:"sys_hexion",    name:"Hexion PSI",        category:"Process Safety",        code:"HXPSI-001",    plant:"Corpus Christi Terminal", errorEmail:"safety@company.com",     status:"ready",           errorCount:0, description:"Process safety incident management and reporting." },
  { id:"sys_accenture", name:"Accenture",         category:"Consulting Integration",code:"ACCNT-001",    plant:"Austin Facility",         errorEmail:"",                       status:"draft",           errorCount:0, description:"Enterprise integration layer for Accenture-managed data pipelines." },
];
// Three demo integrations pre-loaded under the AVEVA PI system.
// These show different directions, methods, and statuses so reviewers can
// see what active, draft, and ready-to-publish integrations look like.
const INIT_INTEGRATIONS = [
  { id:"int_obs",    systemId:"sys_pi", name:"Observation Polling", status:"active",          direction:"inbound",  method:"polling", product:"iMaintenance", businessObjects:["Observation"], lastRunAt:"2025-04-14T08:30:00Z", frequency:"Every 15 min" },
  { id:"int_wo",     systemId:"sys_pi", name:"WO Dispatch",         status:"active",          direction:"outbound", method:"webhook", product:null,           businessObjects:[],              lastRunAt:"2025-04-14T07:15:00Z", frequency:null },
  { id:"int_alerts", systemId:"sys_pi", name:"Alert Intake",        status:"ready_to_publish",direction:"inbound",  method:"webhook", product:"EHS",          businessObjects:["Observation"], lastRunAt:null, frequency:null },
];
// A pre-seeded webhook in the Webhook Registry so the outbound webhook flow
// has something to select. Users can also create new webhooks inline.
const DEMO_WEBHOOKS = [
  { id:"wh_001", name:"CMMS Work Order Sync", targetUrl:"https://cmms.company.com/webhooks/inno", signingSecret:"whsec_abc123", eventTypes:"work_order.created,work_order.updated" },
];
// Static activity feed entries shown in the "User Activity" tab on System Detail.
// In a real product, these would be live events from a backend log.
const ACTIVITY = [
  { id:"a1", timestamp:"2025-04-14T08:30:00Z", status:"success", desc:"Observation Polling executed — 14 records pulled into iMaintenance" },
  { id:"a2", timestamp:"2025-04-14T07:15:00Z", status:"success", desc:"WO Dispatch triggered — event sent to external endpoint" },
  { id:"a3", timestamp:"2025-04-13T22:01:00Z", status:"warning", desc:"Alert Intake not yet published — no data flowing" },
  { id:"a4", timestamp:"2025-04-13T09:10:00Z", status:"info",    desc:"Integration edited by admin@company.com" },
  { id:"a5", timestamp:"2025-04-10T14:22:00Z", status:"success", desc:"System created: AVEVA PI System" },
];
// Dead-letter queue (DLQ) entries — records that failed to process and were held for review.
// These appear in the "Review Queue" tab on System Detail for the SEEQ system.
// A DLQ is a standard data-pipeline pattern: instead of silently dropping failed records,
// they are held here so a user can inspect, replay, or discard them.
const DLQ_ENTRIES = [
  { id:"dlq_001", systemId:"sys_seeq", integrationName:"Trend Sync", timestamp:"2025-04-14T07:12:00Z", retryCount:3, errorMessage:"Connection timeout after 30s — host unreachable", payload:'{"asset":"Pump-12","value":98.4,"timestamp":"2025-04-14T07:11:58Z"}' },
  { id:"dlq_002", systemId:"sys_seeq", integrationName:"Trend Sync", timestamp:"2025-04-13T23:44:00Z", retryCount:3, errorMessage:"HTTP 503 — Service Unavailable",                  payload:'{"asset":"Pump-07","value":102.1,"timestamp":"2025-04-13T23:43:50Z"}' },
];
// Static audit log entries shown in the "Audit Log" tab on System Detail.
// Each entry records who did what and when — for compliance and change tracking.
const AUDIT_LOG = [
  { id:"au1", timestamp:"2025-04-10T14:22:00Z", userEmail:"admin@company.com",  action:"System created: AVEVA PI System (AVEVA-PI-001)" },
  { id:"au2", timestamp:"2025-04-10T15:05:00Z", userEmail:"admin@company.com",  action:"Integration created: Observation Polling under AVEVA PI System" },
  { id:"au3", timestamp:"2025-04-11T09:30:00Z", userEmail:"jsmith@company.com", action:"Integration published: WO Dispatch — status changed to Active" },
];
// Maps each status key to its display label and color combination.
// Every status badge, filter chip, and colored border in the UI reads from this object.
// Adding a new status just means adding one entry here — nothing else needs to change.
const STATUS_CONFIG = {
  ready:                 { label:"Ready",                color:C.green,  bg:C.greenBg,  border:C.greenBorder  },
  connection_incomplete: { label:"Connection Incomplete", color:C.amber,  bg:C.amberBg,  border:C.amberBorder  },
  draft:                 { label:"Draft",                color:C.amber,  bg:C.amberBg,  border:C.amberBorder  },
  needs_attention:       { label:"Needs Attention",      color:C.red,    bg:C.redBg,    border:C.redBorder    },
  active:                { label:"Active",               color:C.green,  bg:C.greenBg,  border:C.greenBorder  },
  ready_to_publish:      { label:"Ready to Publish",     color:C.blue,   bg:C.blueBg,   border:C.blueBorder   },
  failed:                { label:"Failed",               color:C.red,    bg:C.redBg,    border:C.redBorder    },
  disabled:              { label:"Disabled",             color:C.text2,  bg:C.bg2,      border:C.border0      },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
// Small utility functions used across multiple components.

// Auto-generates a System Code when a user types a name and category in the Add System form.
// Format: first 4 letters of name + first 3 letters of category + 3 random digits
// Example: "AVEVA PI System" + "Historian" → "AVEV-HIS-423"
// This code is used in audit logs, API references, and the system detail header.
// It is generated once at creation and cannot be changed afterward.
function generateCode(name, category) {
  if (!name && !category) return "";
  const n=(name||"SYS").replace(/[^A-Za-z0-9]/g,"").slice(0,4).toUpperCase().padEnd(4,"X");
  const c=(category||"GEN").replace(/[^A-Za-z0-9]/g,"").slice(0,3).toUpperCase().padEnd(3,"X");
  return `${n}-${c}-${String(Math.floor(Math.random()*900)+100)}`;
}
function genId(pfx="id") { return pfx+"_"+Math.random().toString(36).slice(2,8); }
function isValidUrl(v) {
  if (!v) return false;
  try { const u=new URL(v); return (u.protocol==="http:"||u.protocol==="https:")&&u.hostname.includes("."); } catch { return false; }
}

// Generates the plain-English sentence shown at the top of each Integration Card.
// Goal: a non-technical user should immediately understand what an integration does
// without needing to decode the direction/method/product/collection fields manually.
//
// Examples:
//   "Pulls Observation data from AVEVA PI into iMaintenance every 15 min."
//   "Receives Observation events from SEEQ in real time."
//   "Sends Innovapptive events to an external endpoint in real time."
function summaryLine(integration, systemName) {
  const sys = systemName || "external system";
  if (integration.status==="draft") return "Not yet active — complete configuration to start data flow.";
  if (integration.status==="disabled") return "Paused — no data is flowing.";
  const objs = integration.businessObjects || [];
  const obj = objs[0] || null;
  const prod = integration.product;
  const freq = integration.frequency ? integration.frequency.toLowerCase() : "on a schedule";
  const { direction, method } = integration;
  if (direction==="inbound" && method==="polling") {
    if (obj && prod) return `Pulls ${obj} data from ${sys} into ${prod} ${freq}.`;
    return `Fetches data from ${sys} ${freq}.`;
  }
  if (direction==="inbound" && method==="webhook") {
    if (obj) return `Receives ${obj} events from ${sys} in real time.`;
    return `Receives real-time events from ${sys}.`;
  }
  if (direction==="outbound" && method==="webhook") {
    return `Sends Innovapptive events to an external endpoint in real time.`;
  }
  return direction==="inbound" ? `Pulls data from ${sys}.` : `Sends data to ${sys}.`;
}

// Returns a fresh, empty form object for the Add System drawer.
// Called each time the drawer opens to ensure no previous input lingers.
function blankAddSystemForm() {
  return { plant:"", name:"", category:"", code:"", description:"", errorEmail:"" };
}
// Returns one empty key-value row for the query parameters / headers table.
function blankKV() { return [{ key:"", value:"" }]; }

// Returns a fresh, empty form object for the Add Integration drawer.
// Initializes fieldMappings by copying SAMPLE_FIELDS so each integration
// gets its own independent set of mapping rows (not a shared reference).
function blankIntegrationForm() {
  return {
    name:"", direction:"", method:"",
    // Inbound Webhook
    listenerEndpointUrl:"",
    incomingAuthType:"",
    incomingApiKeyHeader:"X-API-Key", incomingApiKeyValue:"",
    incomingHmacSecret:"",
    // Inbound Polling
    baseUrl:"",
    httpMethod:"GET",
    requestParams: blankKV(),
    requestHeaders: blankKV(),
    requestBody:"",
    postTestState:"idle",   // "idle" | "loading" | "success" | "error"
    postTestError:"",
    pollingAuthType:"",
    pollingApiKey:"", pollingApiKeyHeader:"X-API-Key",
    pollingBasicUser:"", pollingBasicPass:"",
    pollingBearerToken:"",
    pollingOauthClientId:"", pollingOauthClientSecret:"", pollingOauthTokenUrl:"",
    pollingHmacSecret:"", pollingHmacHeader:"X-Signature",
    // Outbound Webhook
    selectedWebhookId:"",
    // Common inbound
    product:"", businessObjects:[],
    triggerOn:"Always", failureBehavior:"Auto-retry 3x then DLQ",
    // Step 2 runtime
    frequency:"Every 15 min", startTime:"06:00",
    // Advanced
    idempotencyKey:"", rateLimit:"60", retryPolicy:"Auto-retry 3x then DLQ", advErrorEmail:"",
    // Mapping
    fieldMappings: SAMPLE_FIELDS.map(f=>({...f})),
    sampleMode:"pull", sampleJson:"", sampleFetched:false,
    schemaSummary:null, validationResult:null,
  };
}

// ─── SHARED PRIMITIVES ────────────────────────────────────────────────────────
// Small, reusable building-block components used throughout the UI.
// They accept props (inputs) and render a piece of the screen consistently.

// A colored pill that shows the status of a system or integration.
// The colored dot + text label gives both color-blind and sighted users the signal.
// Reads colors from STATUS_CONFIG so the look stays consistent everywhere.
function StatusBadge({ status, size="sm" }) {
  const cfg=STATUS_CONFIG[status]||{label:status,color:C.text2,bg:C.bg2,border:C.border0};
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,background:cfg.bg,border:`1px solid ${cfg.border}`,padding:size==="lg"?"4px 10px":"2px 8px",fontFamily:FONT,fontSize:size==="lg"?12:11,fontWeight:600,color:cfg.color,whiteSpace:"nowrap"}}><span style={{width:6,height:6,borderRadius:"50%",background:cfg.color,flexShrink:0}}/>{cfg.label}</span>;
}
// Teal "↓ Inbound" or purple "↑ Outbound" pill shown on Integration Cards and drawers.
function DirectionBadge({ direction }) {
  const isIn=direction==="inbound";
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:isIn?C.tealBg:C.purpleBg,border:`1px solid ${isIn?C.tealBorder:C.purpleBorder}`,padding:"2px 8px",fontSize:11,fontFamily:FONT,fontWeight:600,color:isIn?C.teal:C.purple}}>{isIn?"↓ Inbound":"↑ Outbound"}</span>;
}
// Grey monospace badge showing the integration method: POLLING, WEBHOOK, etc.
function MethodBadge({ method }) {
  const labels={polling:"POLLING",webhook:"WEBHOOK",file_import:"FILE IMPORT",file_export:"FILE EXPORT"};
  return <span style={{display:"inline-flex",alignItems:"center",background:C.bg2,border:`1px solid ${C.border1}`,padding:"2px 8px",fontSize:11,fontFamily:MONO,fontWeight:500,color:C.text1}}>{labels[method]||method?.toUpperCase()}</span>;
}
function MonoText({ children, color, size=12 }) {
  return <span style={{fontFamily:MONO,fontSize:size,color:color||C.blue}}>{children}</span>;
}
// A horizontal divider with an uppercase section label on the left.
// Used to visually separate sections inside drawers and forms.
function SectionRule({ label }) {
  return <div style={{display:"flex",alignItems:"center",gap:10,margin:"0 0 14px"}}><span style={{fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text3,letterSpacing:"0.1em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span><div style={{flex:1,height:1,background:C.border0}}/></div>;
}
// The label block that sits above every form field.
// Shows the field name, an optional sublabel (e.g. "Local time"), a red * for required fields,
// and optional helper text below the label for extra guidance.
function FieldLabel({ label, required, helper, sublabel }) {
  return (
    <div style={{marginBottom:5}}>
      <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"nowrap"}}>
        <span style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text1,whiteSpace:"nowrap"}}>{label}</span>
        {sublabel&&<span style={{fontFamily:FONT,fontSize:10,color:C.text3,letterSpacing:"0.04em",whiteSpace:"nowrap",flexShrink:0}}>{sublabel}</span>}
        {required&&<span style={{color:C.red,marginLeft:2,fontSize:12}}>*</span>}
      </div>
      {helper&&<div style={{fontFamily:FONT,fontSize:11,color:C.text3,marginTop:2,lineHeight:1.4}}>{helper}</div>}
    </div>
  );
}
function FieldInput({ value, onChange, placeholder, error, disabled, mono, type="text", onBlur }) {
  const [f,setF]=useState(false);
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} onFocus={()=>setF(true)} onBlur={()=>{setF(false);onBlur&&onBlur();}} style={{width:"100%",boxSizing:"border-box",fontFamily:mono?MONO:FONT,fontSize:13,background:disabled?C.bg2:C.bg0,border:`1px solid ${error?C.red:f?C.blue:C.border1}`,color:disabled?C.text2:C.text0,padding:"7px 10px",outline:"none",cursor:disabled?"not-allowed":"text"}}/>;
}
function FieldSelect({ value, onChange, options, error, placeholder, disabled }) {
  const [f,setF]=useState(false);
  return <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:"100%",boxSizing:"border-box",fontFamily:FONT,fontSize:13,background:disabled?C.bg2:C.bg0,border:`1px solid ${error?C.red:f?C.blue:C.border1}`,color:value?"":C.text3,padding:"7px 10px",outline:"none",cursor:disabled?"not-allowed":"pointer"}}>{placeholder&&<option value="">{placeholder}</option>}{options.map(o=><option key={o} value={o} style={{color:C.text0}}>{o}</option>)}</select>;
}
function FieldTextarea({ value, onChange, placeholder, rows=3, mono }) {
  const [f,setF]=useState(false);
  return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:mono?MONO:FONT,fontSize:13,background:C.bg0,border:`1px solid ${f?C.blue:C.border1}`,color:C.text0,padding:"7px 10px",outline:"none"}}/>;
}
function FieldError({ msg }) {
  if (!msg) return null;
  return <div style={{fontFamily:FONT,fontSize:11,color:C.red,marginTop:4,display:"flex",alignItems:"center",gap:4}}><span>✕</span>{msg}</div>;
}
// A left-bordered info callout used to provide context or guidance inside forms.
// Variants: "teal" (informational), "amber" (warning), "blue" (neutral), "green" (success).
// Examples: whitelisting warning on polling, real-time note on webhook step 2.
function InfoBox({ variant="teal", children }) {
  const cfg={teal:{bg:C.tealBg,border:C.tealBorder,accent:C.teal,icon:"ℹ"},amber:{bg:C.amberBg,border:C.amberBorder,accent:C.amber,icon:"▲"},blue:{bg:C.blueBg,border:C.blueBorder,accent:C.blue,icon:"ℹ"},green:{bg:C.greenBg,border:C.greenBorder,accent:C.green,icon:"✓"}}[variant];
  return <div style={{background:cfg.bg,border:`1px solid ${cfg.border}`,borderLeft:`3px solid ${cfg.accent}`,padding:"8px 10px",display:"flex",gap:7,alignItems:"flex-start",marginBottom:0}}><span style={{color:cfg.accent,fontSize:12,flexShrink:0,marginTop:1,fontWeight:700}}>{cfg.icon}</span><div style={{fontFamily:FONT,fontSize:12,color:C.text1,lineHeight:1.5}}>{children}</div></div>;
}
function Spinner({ size=14 }) {
  return <span style={{display:"inline-block",width:size,height:size,border:`2px solid ${C.border0}`,borderTop:`2px solid ${C.blue}`,borderRadius:"50%",animation:"imSpin 0.7s linear infinite",flexShrink:0}}><style>{`@keyframes imSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style></span>;
}

// ─── KEY-VALUE TABLE (Postman-like params/headers) ────────────────────────────
// A table of editable key-value pairs, similar to what you'd see in Postman.
// Used for Query Parameters and Request Headers in the Inbound Polling config.
// Rows can be added or removed. Always keeps at least one row visible.
function KVTable({ rows, onChange, addLabel="Add row" }) {
  function updateRow(i,field,val) { const r=[...rows]; r[i]={...r[i],[field]:val}; onChange(r); }
  function addRow()  { onChange([...rows,{key:"",value:""}]); }
  function removeRow(i) { const r=rows.filter((_,idx)=>idx!==i); onChange(r.length?r:[{key:"",value:""}]); }
  return (
    <div>
      <div style={{border:`1px solid ${C.border0}`}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 26px",padding:"4px 8px",background:C.bg2,borderBottom:`1px solid ${C.border0}`}}>
          {["Key","Value",""].map(h=><div key={h} style={{fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.07em"}}>{h}</div>)}
        </div>
        {rows.map((row,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 26px",borderBottom:i<rows.length-1?`1px solid ${C.border0}`:"none"}}>
            <input value={row.key} onChange={e=>updateRow(i,"key",e.target.value)} placeholder="key" style={{fontFamily:MONO,fontSize:12,background:C.bg0,border:"none",borderRight:`1px solid ${C.border0}`,padding:"5px 8px",outline:"none",color:C.text0}}/>
            <input value={row.value} onChange={e=>updateRow(i,"value",e.target.value)} placeholder="value" style={{fontFamily:MONO,fontSize:12,background:C.bg0,border:"none",borderRight:`1px solid ${C.border0}`,padding:"5px 8px",outline:"none",color:C.text0}}/>
            <button onClick={()=>removeRow(i)} style={{background:"none",border:"none",color:C.text3,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        ))}
      </div>
      <button onClick={addRow} style={{marginTop:5,background:"none",border:`1px solid ${C.border1}`,color:C.blue,fontFamily:FONT,fontSize:11,fontWeight:600,padding:"3px 10px",cursor:"pointer"}}>+ {addLabel}</button>
    </div>
  );
}

// ─── AUTH CREDENTIALS SUB-FORM ────────────────────────────────────────────────
// Renders the right credential fields based on which authentication type is selected.
// The "prefix" parameter namespaces the field keys so the same component can be used
// for both inbound webhook auth (prefix="incoming") and polling auth (prefix="polling")
// without the two sets of credentials interfering with each other.
// Shows nothing if auth type is unset or "No Authentication".
function AuthCredentials({ authType, form, set, prefix="" }) {
  const k = key => prefix+key;
  if (!authType || authType==="— Select auth type —" || authType==="No Authentication") return null;
  return (
    <div style={{background:C.bg1,border:`1px solid ${C.border0}`,padding:"12px 12px 4px",marginTop:8}}>
      {authType==="API Key"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px",marginBottom:8}}>
        <div><FieldLabel label="API Key" required/><FieldInput value={form[k("ApiKey")]||""} onChange={v=>set(k("ApiKey"),v)} placeholder="sk-••••••••" mono/></div>
        <div><FieldLabel label="Header Name"/><FieldInput value={form[k("ApiKeyHeader")]||"X-API-Key"} onChange={v=>set(k("ApiKeyHeader"),v)} placeholder="X-API-Key" mono/></div>
      </div>}
      {authType==="Basic Auth"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px",marginBottom:8}}>
        <div><FieldLabel label="Username" required/><FieldInput value={form[k("BasicUser")]||""} onChange={v=>set(k("BasicUser"),v)} placeholder="service-account"/></div>
        <div><FieldLabel label="Password" required/><FieldInput value={form[k("BasicPass")]||""} onChange={v=>set(k("BasicPass"),v)} placeholder="••••••••" mono/></div>
      </div>}
      {authType==="Bearer Token"&&<div style={{marginBottom:8}}><FieldLabel label="Bearer Token" required/><FieldInput value={form[k("BearerToken")]||""} onChange={v=>set(k("BearerToken"),v)} placeholder="eyJhbGciOiJSUzI1NiJ9…" mono/></div>}
      {authType==="OAuth 2.0"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px",marginBottom:8}}>
        <div><FieldLabel label="Client ID" required/><FieldInput value={form[k("OauthClientId")]||""} onChange={v=>set(k("OauthClientId"),v)} placeholder="client-id" mono/></div>
        <div><FieldLabel label="Client Secret" required/><FieldInput value={form[k("OauthClientSecret")]||""} onChange={v=>set(k("OauthClientSecret"),v)} placeholder="••••••••" mono/></div>
        <div style={{gridColumn:"1/-1"}}><FieldLabel label="Token URL" required/><FieldInput value={form[k("OauthTokenUrl")]||""} onChange={v=>set(k("OauthTokenUrl"),v)} placeholder="https://auth.provider.com/oauth/token" mono/></div>
      </div>}
      {authType==="HMAC / Signature Secret"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px",marginBottom:8}}>
        <div><FieldLabel label="Signing Secret" required/><FieldInput value={form[k("HmacSecret")]||""} onChange={v=>set(k("HmacSecret"),v)} placeholder="whsec_••••••••" mono/></div>
        <div><FieldLabel label="Signature Header"/><FieldInput value={form[k("HmacHeader")]||"X-Signature"} onChange={v=>set(k("HmacHeader"),v)} placeholder="X-Signature" mono/></div>
      </div>}
    </div>
  );
}

// ─── MULTI-SELECT DROPDOWN ───────────────────────────────────────────────────
// A custom dropdown that lets users pick multiple items (collections) at once.
// Standard HTML dropdowns don't support checkboxes, so this is built from scratch.
//
// How it works:
//   - Trigger button shows a summary: empty → placeholder, 1 selected → item name,
//     multiple selected → "N collections selected"
//   - Clicking the button opens a panel below it with checkbox rows
//   - Clicking outside the open panel automatically closes it (via a document click listener)
//   - Selected items are shown as blue chip tags below (rendered by the parent, not here)
//
// Used in: Step 1 of Add Integration (Collections field)
function MultiSelectDropdown({ options, value, onChange, placeholder, disabled, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    if(!open) return;
    function handler(e){ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown",handler);
    return ()=>document.removeEventListener("mousedown",handler);
  },[open]);
  const selected = value||[];
  const toggle = opt => onChange(selected.includes(opt)?selected.filter(o=>o!==opt):[...selected,opt]);
  const label = selected.length===0?(placeholder||"— Select —"):selected.length===1?selected[0]:`${selected.length} collections selected`;
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>!disabled&&setOpen(o=>!o)} disabled={disabled} style={{
        width:"100%",boxSizing:"border-box",fontFamily:FONT,fontSize:13,
        background:disabled?C.bg2:C.bg0,
        border:`1px solid ${error?C.red:open?C.blue:C.border1}`,
        color:selected.length?C.text0:C.text3,
        padding:"7px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",
        cursor:disabled?"not-allowed":"pointer",textAlign:"left",outline:"none",
      }}>
        <span>{label}</span>
        <span style={{color:C.text3,fontSize:10,flexShrink:0,marginLeft:6}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{
          position:"absolute",top:"100%",left:0,right:0,zIndex:20,
          background:C.bg0,border:`1px solid ${C.blue}`,borderTop:"none",
          maxHeight:230,overflowY:"auto",boxShadow:"0 4px 16px rgba(0,0,0,0.10)",
        }}>
          {options.map(opt=>{
            const checked=selected.includes(opt);
            return (
              <div key={opt} onClick={()=>toggle(opt)} style={{
                display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
                background:checked?C.blueBg:C.bg0,
                borderBottom:`1px solid ${C.border0}`,cursor:"pointer",
              }}>
                <div style={{
                  width:14,height:14,flexShrink:0,
                  border:`1.5px solid ${checked?C.blue:C.border1}`,
                  background:checked?C.blue:"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}>
                  {checked&&<span style={{color:"#fff",fontSize:9,fontWeight:900,lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontFamily:FONT,fontSize:12,color:C.text0}}>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AI ACTION BUTTON ────────────────────────────────────────────────────────
// The visually distinct button used for AI-assistive actions: "Auto Map" and "Validate".
//
// Design intent: the purple gradient background, dashed border, and ✦ icon signal
// to users that this is an assistive action — it suggests or checks, it does NOT
// commit changes on their behalf. The user stays in control.
//
// Behavior:
//   - Idle: shows label + desc (e.g. "Auto Map" + "Match fields automatically")
//   - Running: shows ⏳ + "Auto Map…" (disabled while running)
//   - Done: shows ✦ + label + result (e.g. "8 fields mapped")
//
// This pattern is designed to be forward-compatible with a real AI model.
function AIActionButton({ label, desc, running, result, onClick }) {
  return (
    <button onClick={onClick} disabled={running} style={{
      display:"flex",flexDirection:"column",alignItems:"flex-start",
      background:"linear-gradient(135deg,#F3E5F5 0%,#EEF0FB 100%)",
      border:`1px dashed ${C.purpleBorder}`,padding:"7px 14px",
      cursor:running?"wait":"pointer",minWidth:170,textAlign:"left",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
        <span style={{fontSize:11,color:C.purple}}>{running?"⏳":"✦"}</span>
        <span style={{fontFamily:FONT,fontSize:12,fontWeight:700,color:C.purple}}>{running?`${label}…`:label}</span>
      </div>
      {!result&&!running&&<span style={{fontFamily:FONT,fontSize:10,color:C.text3,lineHeight:1.3}}>{desc}</span>}
      {result&&<span style={{fontFamily:FONT,fontSize:10,color:C.purple,lineHeight:1.3}}>{result}</span>}
    </button>
  );
}

// ─── SELECTION CARD ───────────────────────────────────────────────────────────
// The large clickable card used to choose Direction and Method in Step 1 of the Add Integration flow.
// Each card has a radio dot, a main label, a sublabel (e.g. "Inbound"), and a short description.
// This pattern helps users make informed choices without needing to know technical terms upfront.
// Cards can be marked "Coming Soon" (disabled=true, tag="Coming Soon") for future methods.
function SelectionCard({ label, sublabel, description, selected, onClick, disabled, tag }) {
  const [hov,setHov]=useState(false);
  return (
    <div onClick={disabled?undefined:onClick} onMouseEnter={()=>!disabled&&setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{flex:1,padding:"14px 16px",cursor:disabled?"not-allowed":"pointer",border:`2px solid ${selected?C.blue:hov?C.border1:C.border0}`,background:selected?C.blueBg:disabled?"#FAFAFA":hov?C.bg1:C.bg0,opacity:disabled?0.55:1,position:"relative",transition:"border-color 0.12s,background 0.12s"}}>
      {tag&&<span style={{position:"absolute",top:8,right:8,background:C.bg3,border:`1px solid ${C.border0}`,fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text3,padding:"2px 6px",letterSpacing:"0.05em"}}>{tag}</span>}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <div style={{width:16,height:16,border:`2px solid ${selected?C.blue:C.border1}`,borderRadius:"50%",background:selected?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {selected&&<div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}}/>}
        </div>
        <span style={{fontFamily:FONT,fontSize:13,fontWeight:700,color:disabled?C.text3:selected?C.blue:C.text0}}>{label}</span>
        {sublabel&&<span style={{fontFamily:FONT,fontSize:10,color:selected?C.blue:C.text3,marginLeft:2,letterSpacing:"0.04em"}}>{sublabel}</span>}
      </div>
      <div style={{fontFamily:FONT,fontSize:12,color:C.text2,lineHeight:1.5,paddingLeft:24}}>{description}</div>
    </div>
  );
}

// The step progress bar at the top of the Add Integration drawer.
// Shows numbered circles with labels. Completed steps show a checkmark.
// Only shown for inbound integrations — outbound webhook is a single-step flow.
function StepIndicator({ current, steps }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:0,padding:"0 22px",height:44,borderBottom:`1px solid ${C.border0}`,background:C.bg1,flexShrink:0}}>
      {steps.map((s,i)=>{
        const done=i<current-1, active=i===current-1;
        return (
          <div key={s} style={{display:"flex",alignItems:"center",gap:0}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${done||active?C.blue:C.border1}`,background:done?C.blue:active?C.blueBg:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {done?<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>:<span style={{fontFamily:MONO,fontSize:11,color:active?C.blue:C.text3,fontWeight:700}}>{i+1}</span>}
              </div>
              <span style={{fontFamily:FONT,fontSize:12,fontWeight:active?700:400,color:active?C.text0:done?C.text1:C.text3}}>{s}</span>
            </div>
            {i<steps.length-1&&<div style={{width:28,height:1,background:C.border0,margin:"0 8px"}}/>}
          </div>
        );
      })}
    </div>
  );
}

// ─── WEBHOOK REGISTRY MODAL ───────────────────────────────────────────────────
// A centered modal for creating a new outbound webhook endpoint.
// Opens when the user clicks "+ Create New Webhook" in the Outbound Webhook config section.
//
// Why a separate registry instead of configuring inline?
// Webhooks are shared endpoints. Multiple integrations may deliver events to the
// same external URL. Managing them in a central registry prevents duplicates and
// makes it easy to update a URL in one place rather than hunting across integrations.
//
// After saving, the new webhook is auto-selected in the integration form.
function WebhookRegistryModal({ open, onClose, onSave }) {
  const blank = {name:"",targetUrl:"",signingSecret:"",eventTypes:""};
  const [form,setForm] = useState(blank);
  const [errors,setErrors] = useState({});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{ if(open){ setForm(blank); setErrors({}); } },[open]);
  if(!open) return null;

  function validate() {
    const e={};
    if(!form.name.trim()) e.name="Webhook name is required";
    if(!form.targetUrl.trim()) e.targetUrl="Target URL is required";
    else if(!isValidUrl(form.targetUrl.trim())) e.targetUrl="Must be a valid URL";
    return e;
  }
  function handleSave() {
    const e=validate(); setErrors(e);
    if(Object.keys(e).length>0) return;
    onSave({id:genId("wh"),name:form.name.trim(),targetUrl:form.targetUrl.trim(),signingSecret:form.signingSecret.trim(),eventTypes:form.eventTypes.trim()});
  }

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.5)",zIndex:300}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:520,background:C.bg0,border:`1px solid ${C.border0}`,zIndex:301,display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
        <div style={{padding:"0 20px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.border0}`,background:C.bg1,flexShrink:0}}>
          <div>
            <div style={{fontFamily:FONT,fontWeight:700,fontSize:15,color:C.text0}}>Webhook Registry</div>
            <div style={{fontFamily:FONT,fontSize:11,color:C.text3}}>Register a new outbound webhook endpoint</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border1}`,color:C.text2,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>×</button>
        </div>
        <div style={{padding:"20px 20px 8px",overflowY:"auto"}}>
          <InfoBox variant="teal">This creates a webhook endpoint in the Webhook Registry. Innovapptive will deliver event payloads to the target URL when triggered.</InfoBox>
          <div style={{marginTop:16,marginBottom:12}}>
            <FieldLabel label="Webhook Name" required helper="A friendly name to identify this webhook"/>
            <FieldInput value={form.name} onChange={v=>set("name",v)} placeholder="e.g. CMMS Work Order Sync" error={errors.name}/>
            <FieldError msg={errors.name}/>
          </div>
          <div style={{marginBottom:12}}>
            <FieldLabel label="Target URL" required helper="The external endpoint that will receive event payloads"/>
            <FieldInput value={form.targetUrl} onChange={v=>set("targetUrl",v)} placeholder="https://your-system.com/webhooks/inno" mono error={errors.targetUrl}/>
            <FieldError msg={errors.targetUrl}/>
          </div>
          <div style={{marginBottom:12}}>
            <FieldLabel label="Signing Secret" helper="Used to sign payloads — the receiver verifies this to confirm authenticity"/>
            <FieldInput value={form.signingSecret} onChange={v=>set("signingSecret",v)} placeholder="whsec_••••••••" mono/>
          </div>
          <div style={{marginBottom:16}}>
            <FieldLabel label="Event Types" helper="Comma-separated list of events to deliver, e.g. work_order.created, inspection.completed"/>
            <FieldInput value={form.eventTypes} onChange={v=>set("eventTypes",v)} placeholder="work_order.created, work_order.updated"/>
          </div>
        </div>
        <div style={{borderTop:`1px solid ${C.border0}`,padding:"10px 20px",background:C.bg1,display:"flex",gap:8,justifyContent:"flex-end",flexShrink:0}}>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border0}`,color:C.text2,fontFamily:FONT,fontSize:13,padding:"6px 14px",cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"6px 16px",cursor:"pointer"}}>Create Webhook</button>
        </div>
      </div>
    </>
  );
}

// ─── MAPPING WORKSPACE ────────────────────────────────────────────────────────
// The full-screen field mapping surface for inbound integrations (both webhook and polling).
//
// What it does: lets users connect incoming source fields (what the external system sends)
// to Innovapptive target fields (what iMaintenance, EHS, mRounds, etc. expect to receive).
//
// Why full-screen instead of inside the drawer?
// Field mapping needs a two-panel layout: source payload tree on the left, mapping table
// on the right. A 580px drawer can't fit this without awkward horizontal scrolling.
//
// Layout:
//   Left panel (320px): target collections + payload sample pull + collapsible field tree
//   Right panel (flex):  AI toolbar + filter + 5-column mapping table
//   Footer: status indicator + Back / Save as Draft / Publish Integration
//
// The Publish gate: the "Publish Integration" button stays disabled (greyed out) until
// ALL required fields have a target mapped AND at least one field is mapped overall.
// This prevents broken integrations from going live with missing critical data.
//
// The mapping is opened from Step 2 of the Add Integration drawer via "Open Mapping Workspace →".
// When the user clicks "Back", they return to Step 2 with their mapping progress saved.
function MappingWorkspace({ open, form, setForm, system, onBack, onSave }) {
  const [autoMapRunning, setAutoMapRunning] = useState(false);
  const [autoMapResult, setAutoMapResult]   = useState(null);
  const [validateRunning, setValidateRunning] = useState(false);
  const [validateResult, setValidateResult]   = useState(null);
  const [valOpen, setValOpen]               = useState(false);
  const [fetchState, setFetch]              = useState("idle");
  const [filterText, setFilterText]         = useState("");
  const [collapsedGrps, setCollapsedGrps]   = useState({});
  const fetchTimer = useRef(null);
  // Always holds the latest form value so setTimeout callbacks can read current
  // state without a stale closure and without needing side effects inside updaters.
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(()=>{
    if(!open){
      setAutoMapResult(null); setValidateResult(null); setValOpen(false);
      setFetch("idle"); setFilterText(""); setCollapsedGrps({});
    }
  },[open]);
  useEffect(()=>()=>clearTimeout(fetchTimer.current),[]);
  if(!open) return null;

  const collections    = form.businessObjects || [];
  const product        = form.product || "";
  const hasPullEndpoint = !!form.baseUrl; // true for polling integrations (has a URL to pull from)

  // Build the list of available target fields from NESTED_TARGET_SCHEMA.
  // Each option is formatted as: value = "Collection::path", label = "Collection.path"
  // The "Collection." prefix in the label helps users know which Innovapptive object
  // a field belongs to (e.g. "Observation.asset.id" vs "WorkOrder.asset.id").
  function allTargetOpts() {
    const all = [];
    collections.forEach(col=>{
      (NESTED_TARGET_SCHEMA[product]?.[col]||[]).forEach(f=>{
        all.push({ value:`${col}::${f.path}`, label:`${col}.${f.path}` });
      });
    });
    return all;
  }
  const targetOpts = allTargetOpts();

  // Source options from SAMPLE_FIELDS
  const srcOpts = SAMPLE_FIELDS.map(f=>f.src);

  // Groups SAMPLE_FIELDS into a tree for the left panel.
  // Fields like "id", "timestamp", "severity" are "roots" (no dot in path).
  // Fields like "asset.id", "asset.name", "measurements[].value" are grouped by their
  // prefix (e.g. all "asset.*" fields go under an "asset" collapsible group).
  // This makes it easier to navigate a large payload without scrolling through all fields.
  function buildTree() {
    const groups = {}, roots = [];
    SAMPLE_FIELDS.forEach(f=>{
      const m = f.src.match(/^([a-z_]+)[\.\[]/);
      if(m){ const g=m[1]; if(!groups[g])groups[g]=[]; groups[g].push(f); }
      else roots.push(f);
    });
    return { roots, groups };
  }
  const { roots, groups } = buildTree();

  function toggleGrp(g){ setCollapsedGrps(s=>({...s,[g]:!s[g]})); }

  // Updates a field in one mapping row (typically the "target" field).
  // Tracks row state: "auto-mapped" if it was set by Auto Map, "manual" if user-set,
  // "unmapped" if the target is cleared. The state controls the color and badge on each row.
  function updateMapping(idx, key, val) {
    setForm(f=>{
      const m=[...f.fieldMappings];
      m[idx]={...m[idx],[key]:val,rowState:val?(m[idx].rowState==="auto-mapped"?"auto-mapped":"manual"):"unmapped"};
      return {...f,fieldMappings:m};
    });
  }
  function updateSrc(idx, newSrc) {
    const sf = SAMPLE_FIELDS.find(f=>f.src===newSrc)||{src:newSrc,srcType:"string",refLookup:false,nested:newSrc.includes("."),arrayPath:newSrc.includes("[]")};
    // Preserve row.required — it reflects the target's constraint, not the source field's metadata.
    // Spreading sf without required ensures the mandatory mapping gate can't be bypassed by swapping sources.
    const { required: _ignored, ...srcMeta } = sf;
    setForm(f=>{ const m=[...f.fieldMappings]; m[idx]={...m[idx],...srcMeta,target:"",rowState:"unmapped"}; return {...f,fieldMappings:m}; });
  }

  function handleFetchSample() {
    setFetch("loading"); clearTimeout(fetchTimer.current);
    fetchTimer.current=setTimeout(()=>{
      const sample=`{\n  "id": "OBS-1042",\n  "timestamp": "2025-04-14T08:30:00Z",\n  "asset": {\n    "id": "PUMP-12",\n    "name": "Primary Feed Pump",\n    "location": { "site": "Houston Plant" }\n  },\n  "measurements": [\n    { "value": 98.4, "unit": "degC" }\n  ],\n  "severity": "warning",\n  "description": "Temperature threshold exceeded",\n  "links": { "workOrder": { "href": "/api/workorders/WO-9921" } },\n  "metadata": { "source": "PI-historian", "version": "2.1" }\n}`;
      setForm(f=>({...f,sampleJson:sample,sampleFetched:true,schemaSummary:{recordsReturned:1,fieldsDetected:12,nestedObjects:4,arraysDetected:1,referenceLikeFields:2,pulledAt:new Date().toISOString()}}));
      setFetch("done");
    },1800);
  }

  function handleAutoMap() {
    setAutoMapRunning(true); setAutoMapResult(null);
    setTimeout(()=>{
      // Read latest state from ref — avoids stale closure without needing side effects
      // inside the setForm updater (which React 18 may invoke asynchronously or
      // more than once in Strict Mode, making mutable counters unreliable).
      const f = formRef.current;
      const updated = f.fieldMappings.map(m=>{
        const rule = AUTO_MAP_RULES[m.src];
        if(!rule||m.target) return m.target?{...m,rowState:"manual"}:m;
        let matched = null;
        for(const col of (f.businessObjects||[])){
          const fields = NESTED_TARGET_SCHEMA[f.product]?.[col]||[];
          if(fields.some(fd=>fd.path===rule)){ matched=`${col}::${rule}`; break; }
        }
        return matched ? {...m,target:matched,rowState:"auto-mapped"} : m;
      });
      // Pure derivation: rows that moved from unmapped → auto-mapped this run.
      const n = updated.filter((m,i)=>m.rowState==="auto-mapped"&&!f.fieldMappings[i].target).length;
      setForm(prev=>({...prev,fieldMappings:updated}));
      setAutoMapResult(`${n} field${n!==1?"s":""} mapped`);
      setAutoMapRunning(false);
    },1200);
  }

  function handleValidate() {
    setValidateRunning(true); setValidateResult(null);
    setTimeout(()=>{
      const mp=form.fieldMappings;
      const mapped=mp.filter(m=>m.target).map(m=>m.target);
      const dups=mapped.filter((t,i)=>mapped.indexOf(t)!==i);
      // Real type-conflict check: compare each source field's type against the
      // target field's declared type in NESTED_TARGET_SCHEMA.
      // We allow compatible pairings (url→string, datetime→date) to avoid false alarms.
      const typeConflicts=mp.filter(m=>{
        if(!m.target) return false;
        const [col,...rest]=m.target.split("::");
        const targetPath=rest.join("::");
        const tf=(NESTED_TARGET_SCHEMA[form.product]?.[col]||[]).find(f=>f.path===targetPath);
        if(!tf) return false;
        if(m.srcType==="url"&&tf.type==="string") return false;
        if(m.srcType==="datetime"&&tf.type==="date") return false;
        return m.srcType!==tf.type;
      }).length;
      const result={
        requiredMapped:mp.filter(m=>m.required&&m.target).length,
        requiredTotal:mp.filter(m=>m.required).length,
        optionalSkipped:mp.filter(m=>!m.required&&!m.target).length,
        typeConflicts,
        refLookups:mp.filter(m=>m.refLookup&&m.target).length,
        duplicateTargets:dups.length,
        unmappedRequired:mp.filter(m=>m.required&&!m.target).length,
        ranAt:new Date().toISOString(),
      };
      setForm(f=>({...f,validationResult:result}));
      setValidateRunning(false);
      const issues = result.unmappedRequired + result.duplicateTargets + result.typeConflicts;
      setValidateResult(issues===0?"All checks passed":`${issues} issue${issues!==1?"s":""} found`);
    },1000);
  }

  // How many required fields still don't have a target mapped?
  const unmappedRequired = form.fieldMappings.filter(m=>m.required&&!m.target).length;
  // Are any two rows pointing to the same target field? (That would cause a data conflict.)
  const dupTargets = (()=>{ const mp=form.fieldMappings.filter(m=>m.target).map(m=>m.target); return mp.filter((t,i)=>mp.indexOf(t)!==i); })();
  // How many rows have ANY target mapped (required or optional)?
  const mappedCount = form.fieldMappings.filter(m=>m.target).length;
  // The publish gate: true only when all required fields are mapped AND at least one field total is mapped.
  const mappingComplete = unmappedRequired===0 && mappedCount>0;

  // Drives the status label, color, and border shown in the header and footer.
  // Three states: green (ready), red (nothing mapped yet), amber (partial — some required fields missing).
  const mappingStatus = mappingComplete
    ? {label:"Ready to publish", color:C.green, bg:C.greenBg, border:C.greenBorder}
    : mappedCount===0
      ? {label:"Mapping required", color:C.red, bg:C.redBg, border:C.redBorder}
      : {label:`Mapping incomplete — ${unmappedRequired} required field${unmappedRequired!==1?"s":""} unmapped`, color:C.amber, bg:C.amberBg, border:C.amberBorder};

  // Apply the filter text from the search box in the toolbar.
  // We attach the original index (_idx) before filtering so updates
  // go back to the right row in the full fieldMappings array.
  const filteredRows = form.fieldMappings
    .map((m,i)=>({...m,_idx:i}))
    .filter(m=>!filterText.trim()||m.src.toLowerCase().includes(filterText.toLowerCase())||m.target.toLowerCase().includes(filterText.toLowerCase()));

  function FieldTreeRow({ f, indent }) {
    const typeColors={string:C.text2,datetime:C.teal,number:C.blue,enum:C.purple,url:C.amber};
    return (
      <div style={{display:"flex",alignItems:"center",gap:6,padding:`5px ${indent?28:14}px 5px ${indent?28:14}px`,borderBottom:`1px solid ${C.border0}`,background:C.bg0}}>
        <MonoText size={11} color={C.text0}>{f.src}</MonoText>
        {f.arrayPath&&<span style={{fontSize:8,fontWeight:700,color:C.purple,background:C.purpleBg,border:`1px solid ${C.purpleBorder}`,padding:"0 3px"}}>array</span>}
        {f.refLookup&&<span style={{color:C.amber,fontSize:11}}>⚠</span>}
        <span style={{marginLeft:"auto",fontFamily:MONO,fontSize:10,color:typeColors[f.srcType]||C.text3}}>{f.srcType}</span>
        {f.required&&<span style={{fontSize:9,fontWeight:700,color:C.red}}>req</span>}
      </div>
    );
  }

  return (
    <>
      <div style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.35)",zIndex:210}}/>
      <div style={{position:"fixed",inset:0,zIndex:211,display:"flex",flexDirection:"column",background:C.bg0}}>
        {/* Header */}
        <div style={{height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",borderBottom:`1px solid ${C.border0}`,background:C.bg1,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:12,fontWeight:600,padding:"5px 12px",cursor:"pointer"}}>← Back</button>
            <div>
              <span style={{fontFamily:FONT,fontWeight:700,fontSize:15,color:C.text0}}>Data Mapping</span>
              {system&&<span style={{fontFamily:FONT,fontSize:11,color:C.text3,marginLeft:8}}>· {system.name}</span>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:FONT,fontSize:11,fontWeight:700,color:mappingStatus.color,background:mappingStatus.bg,border:`1px solid ${mappingStatus.border}`,padding:"3px 10px"}}>{mappingStatus.label}</span>
            <span style={{fontFamily:FONT,fontSize:12,color:C.text3}}>{mappedCount}/{form.fieldMappings.length} mapped</span>
          </div>
        </div>

        {/* Body */}
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>

          {/* Left panel: target collections + payload field tree */}
          <div style={{width:320,flexShrink:0,borderRight:`1px solid ${C.border0}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* Collections */}
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border0}`,flexShrink:0}}>
              <div style={{fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Target Collections</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {collections.map(col=>(
                  <span key={col} style={{background:C.blueBg,border:`1px solid ${C.blueBorder}`,fontFamily:FONT,fontSize:11,fontWeight:700,color:C.blue,padding:"2px 8px"}}>{col}</span>
                ))}
              </div>
            </div>

            {/* Sample pull */}
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border0}`,flexShrink:0}}>
              <div style={{fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Source Sample</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                {hasPullEndpoint?(
                  fetchState==="idle"?<button onClick={handleFetchSample} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.blue,fontFamily:FONT,fontSize:12,fontWeight:600,padding:"4px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>▶ Pull sample</button>:
                  fetchState==="loading"?<button disabled style={{background:C.bg0,border:`1px solid ${C.border0}`,color:C.text3,fontFamily:FONT,fontSize:12,padding:"4px 10px",display:"flex",alignItems:"center",gap:5}}><Spinner size={11}/> Pulling…</button>:
                  <button onClick={handleFetchSample} style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,color:C.green,fontFamily:FONT,fontSize:12,fontWeight:600,padding:"4px 10px",cursor:"pointer"}}>✓ Re-pull</button>
                ):(
                  <span style={{fontFamily:FONT,fontSize:11,color:C.text3}}>Paste JSON in mapping row to inspect values</span>
                )}
              </div>
              {form.schemaSummary&&(
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {[{label:"Fields",val:form.schemaSummary.fieldsDetected},{label:"Nested",val:form.schemaSummary.nestedObjects},{label:"Arrays",val:form.schemaSummary.arraysDetected}].map(s=>(
                    <div key={s.label} style={{display:"flex",alignItems:"baseline",gap:3}}><span style={{fontFamily:FONT,fontSize:14,fontWeight:700,color:C.text0}}>{s.val}</span><span style={{fontFamily:FONT,fontSize:10,color:C.text2}}>{s.label}</span></div>
                  ))}
                </div>
              )}
            </div>

            {/* Payload field tree */}
            <div style={{flex:1,overflowY:"auto"}}>
              <div style={{padding:"8px 14px 4px",fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.08em",background:C.bg2,borderBottom:`1px solid ${C.border0}`,position:"sticky",top:0}}>
                Payload Fields
              </div>
              {roots.map(f=><FieldTreeRow key={f.src} f={f} indent={false}/>)}
              {Object.entries(groups).map(([grp,fields])=>(
                <div key={grp}>
                  <div onClick={()=>toggleGrp(grp)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:C.bg1,borderBottom:`1px solid ${C.border0}`,cursor:"pointer",userSelect:"none"}}>
                    <span style={{fontSize:9,color:C.text3}}>{collapsedGrps[grp]?"▶":"▼"}</span>
                    <MonoText size={11} color={C.text1}>{grp}</MonoText>
                    <span style={{marginLeft:"auto",fontFamily:FONT,fontSize:10,color:C.text3}}>{fields.length} fields</span>
                  </div>
                  {!collapsedGrps[grp]&&fields.map(f=><FieldTreeRow key={f.src} f={f} indent={true}/>)}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: mapping table */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* Toolbar */}
            <div style={{padding:"10px 20px",borderBottom:`1px solid ${C.border0}`,display:"flex",alignItems:"center",gap:10,flexShrink:0,background:C.bg0,flexWrap:"wrap"}}>
              <AIActionButton label="Auto Map" desc="Match source fields to target paths automatically" running={autoMapRunning} result={autoMapResult} onClick={handleAutoMap}/>
              <AIActionButton label="Validate" desc="Check required fields, types, and duplicates" running={validateRunning} result={validateResult} onClick={handleValidate}/>
              <div style={{flex:1}}/>
              {dupTargets.length>0&&<span style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,fontFamily:FONT,fontSize:11,fontWeight:700,color:C.amber,padding:"3px 8px"}}>Duplicate target</span>}
              {form.validationResult&&<button onClick={()=>setValOpen(o=>!o)} style={{background:"none",border:`1px solid ${C.border0}`,fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text1,padding:"4px 10px",cursor:"pointer"}}>{valOpen?"Hide":"Show"} validation</button>}
              <div style={{display:"flex",alignItems:"center",gap:0,border:`1px solid ${C.border1}`,background:C.bg0}}>
                <span style={{padding:"0 8px",color:C.text3,fontSize:12,lineHeight:"30px"}}>⌕</span>
                <input
                  value={filterText}
                  onChange={e=>setFilterText(e.target.value)}
                  placeholder="Filter fields…"
                  style={{fontFamily:FONT,fontSize:12,border:"none",outline:"none",padding:"5px 8px 5px 0",width:160,color:C.text0,background:"transparent"}}
                />
                {filterText&&<button onClick={()=>setFilterText("")} style={{background:"none",border:"none",color:C.text3,fontSize:13,cursor:"pointer",padding:"0 6px",lineHeight:"30px"}}>×</button>}
              </div>
            </div>

            {/* Validation panel */}
            {valOpen&&form.validationResult&&(
              <div style={{padding:"8px 20px",background:C.bg1,borderBottom:`1px solid ${C.border0}`,flexShrink:0}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {[
                    {label:"Required mapped",ok:form.validationResult.unmappedRequired===0,detail:`${form.validationResult.requiredMapped}/${form.validationResult.requiredTotal}`},
                    {label:"Optional skipped",ok:true,detail:`${form.validationResult.optionalSkipped}`},
                    {label:"Type conflicts",ok:form.validationResult.typeConflicts===0,detail:`${form.validationResult.typeConflicts}`},
                    {label:"Duplicates",ok:form.validationResult.duplicateTargets===0,detail:`${form.validationResult.duplicateTargets}`},
                    {label:"Ref lookups",ok:true,detail:`${form.validationResult.refLookups}`},
                  ].map(row=>(
                    <div key={row.label} style={{background:row.ok?C.greenBg:C.amberBg,border:`1px solid ${row.ok?C.greenBorder:C.amberBorder}`,padding:"3px 8px",display:"flex",alignItems:"center",gap:5}}>
                      <span style={{color:row.ok?C.green:C.amber,fontWeight:700,fontSize:11}}>{row.ok?"✓":"!"}</span>
                      <span style={{fontFamily:FONT,fontSize:11,color:C.text1}}>{row.label}:</span>
                      <span style={{fontFamily:FONT,fontSize:11,fontWeight:700,color:row.ok?C.text0:C.amber}}>{row.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{flex:1,overflowY:"auto"}}>
              <div style={{display:"grid",gridTemplateColumns:"minmax(150px,1.3fr) 60px 74px 82px minmax(200px,1.6fr)",padding:"6px 20px",background:C.bg2,borderBottom:`1px solid ${C.border0}`,position:"sticky",top:0,zIndex:1}}>
                {["Source Field","Type","Required","Status","Innovapptive Target"].map(h=>(
                  <div key={h} style={{fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.07em"}}>{h}</div>
                ))}
              </div>
              {filteredRows.length===0&&(
                <div style={{padding:"24px 20px",fontFamily:FONT,fontSize:12,color:C.text3,textAlign:"center"}}>No fields match "{filterText}"</div>
              )}
              {filteredRows.map((m,visIdx)=>{
                const idx = m._idx;
                const rowBg=m.rowState==="auto-mapped"?"#F5FAF7":(!m.target&&m.required)?"#FFF8F8":visIdx%2===0?C.bg0:C.bg1;
                const stateLabel={
                  "auto-mapped":{label:"Auto",color:C.green,bg:C.greenBg,border:C.greenBorder},
                  "manual":{label:"Manual",color:C.blue,bg:C.blueBg,border:C.blueBorder},
                  "unmapped":{label:"—",color:C.text3,bg:"transparent",border:"transparent"},
                }[m.rowState]||{label:"—",color:C.text3,bg:"transparent",border:"transparent"};
                return (
                  <div key={m.src+idx} style={{display:"grid",gridTemplateColumns:"minmax(150px,1.3fr) 60px 74px 82px minmax(200px,1.6fr)",padding:"4px 20px",borderBottom:`1px solid ${C.border0}`,background:rowBg,alignItems:"center",gap:0}}>
                    <select
                      value={m.src}
                      onChange={e=>updateSrc(idx,e.target.value)}
                      style={{fontFamily:MONO,fontSize:11,background:"transparent",border:`1px solid ${C.border0}`,color:C.text0,padding:"3px 5px",outline:"none",cursor:"pointer",width:"100%"}}
                    >
                      {srcOpts.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                    <span style={{fontFamily:MONO,fontSize:10,color:C.text2,paddingLeft:4}}>{m.srcType}</span>
                    <span style={{fontFamily:FONT,fontSize:10,fontWeight:700,color:m.required?C.red:C.text3,paddingLeft:4}}>{m.required?"Required":"Optional"}</span>
                    <span style={{fontFamily:FONT,fontSize:10,fontWeight:600,color:stateLabel.color,background:stateLabel.bg,border:`1px solid ${stateLabel.border}`,padding:"1px 5px",whiteSpace:"nowrap"}}>{stateLabel.label}</span>
                    <select
                      value={m.target}
                      onChange={e=>updateMapping(idx,"target",e.target.value)}
                      style={{fontFamily:FONT,fontSize:12,background:C.bg0,border:`1px solid ${(!m.target&&m.required)?C.redBorder:dupTargets.includes(m.target)?C.amberBorder:C.border1}`,color:m.target?C.text0:C.text3,padding:"4px 6px",outline:"none",cursor:"pointer",width:"100%"}}
                    >
                      <option value="">— Select target —</option>
                      {targetOpts.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{height:64,display:"flex",alignItems:"center",padding:"0 24px",borderTop:`1px solid ${C.border0}`,background:C.bg1,flexShrink:0,gap:10}}>
          <div style={{flex:1}}/>
          <button onClick={onBack} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"8px 20px",cursor:"pointer"}}>Back</button>
          <button onClick={()=>onSave(false)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"8px 20px",cursor:"pointer"}}>Save as Draft</button>
          <button
            onClick={()=>onSave(true)}
            disabled={!mappingComplete}
            title={!mappingComplete?mappingStatus.label:""}
            style={{background:mappingComplete?C.blue:C.bg2,border:`1px solid ${mappingComplete?C.blueHover:C.border1}`,color:mappingComplete?"#fff":C.text3,fontFamily:FONT,fontSize:13,fontWeight:700,padding:"8px 24px",cursor:mappingComplete?"pointer":"not-allowed"}}
          >Publish Integration</button>
        </div>
      </div>
    </>
  );
}

// ─── ADD INTEGRATION DRAWER ───────────────────────────────────────────────────
// The guided two-step drawer for creating a new integration under a system.
//
// Step 1 — Connection & Basics:
//   User sets the name, direction (inbound/outbound), method (webhook/polling),
//   product & collections (inbound only), and connection configuration.
//   Section order: Name → Direction → Method → Product & Collections → Connection config → Behavior
//
// Step 2 — Mapping, Runtime & Publish:
//   Data Mapping card (opens Mapping Workspace) → runtime schedule (polling only)
//   → Readiness Checklist → Advanced settings → Summary → Publish
//
// Outbound webhooks skip Step 2 entirely — they publish directly from Step 1
// because they don't require field mapping.
//
// Scroll resets to the top on every step transition (forward and back)
// so users always start reading from the beginning of each step.
function AddIntegrationDrawer({ open, system, onClose, onSave, onGoToSystem, webhooks, onAddWebhook }) {
  const [step,setStep]       = useState(1);
  const [form,setForm]       = useState(blankIntegrationForm());
  const [errors,setErrors]   = useState({});
  const [touched,setTouched] = useState({});
  const [advOpen,setAdvOpen] = useState(false);
  const [valOpen,setValOpen] = useState(false);
  const [fetchState,setFetch]= useState("idle");
  const [published,setPublished] = useState(null);
  const [wbModal,setWbModal] = useState(false);
  const [mappingOpen,setMappingOpen] = useState(false);
  const fetchTimer    = useRef(null);
  const postTestTimer = useRef(null);
  const scrollRef     = useRef(null);

  // Shorthand for updating one form field. e.g. set("name", "My Integration")
  const set   = (k,v) => setForm(f=>({...f,[k]:v}));
  // Marks a field as "touched" so validation errors become visible on it.
  // Errors are hidden until a field is touched — avoids showing red on fields the user hasn't seen yet.
  const touch = k     => setTouched(t=>({...t,[k]:true}));

  // Reset all state when the drawer opens, ensuring no data lingers from a previous session.
  useEffect(()=>{
    if(open){ setStep(1);setForm(blankIntegrationForm());setErrors({});setTouched({});setAdvOpen(false);setValOpen(false);setFetch("idle");setPublished(null);setWbModal(false);setMappingOpen(false); }
  },[open]);
  // Pre-fill the advanced error email from the parent system so the user doesn't have to re-enter it.
  useEffect(()=>{ if(system?.errorEmail) set("advErrorEmail",system.errorEmail); },[system]);
  // Clean up any running timers when the component unmounts (prevents state updates after close).
  useEffect(()=>()=>{ clearTimeout(fetchTimer.current); clearTimeout(postTestTimer.current); },[]);
  // Scroll to the top of the form content whenever the user moves between Step 1 and Step 2.
  useEffect(()=>{ if(scrollRef.current) scrollRef.current.scrollTop=0; },[step]);
  if(!open) return null;

  // Convenience boolean flags to make the conditional rendering below easier to read.
  const isInbound        = form.direction==="inbound";
  const isOutbound       = form.direction==="outbound";
  const isWebhook        = form.method==="webhook";
  const isPolling        = form.method==="polling";
  const isInboundWebhook = isInbound && isWebhook;
  const isOutboundWebhook= isOutbound && isWebhook;
  const showStepper      = !isOutboundWebhook; // Outbound webhook publishes in one step — no stepper needed

  function validateStep1() {
    const e={};
    if(!form.name.trim()) e.name="Integration name is required";
    if(!form.direction)   e.direction="Select a direction";
    if(!form.method)      e.method="Select a method";
    if(isInboundWebhook&&!form.listenerEndpointUrl.trim()) e.listenerEndpointUrl="Listener Endpoint URL is required";
    if(isInboundWebhook&&form.listenerEndpointUrl.trim()&&!isValidUrl(form.listenerEndpointUrl.trim())) e.listenerEndpointUrl="Must be a valid URL, e.g. https://hooks.company.com/inno-listener";
    if(isPolling&&!form.baseUrl.trim()) e.baseUrl="Base URL is required";
    if(isPolling&&form.baseUrl.trim()&&!isValidUrl(form.baseUrl.trim())) e.baseUrl="Must be a valid URL";
    if(isInbound&&!form.product)                   e.product="Select a product";
    if(isInbound&&form.product&&form.businessObjects.length===0) e.businessObjects="Select at least one collection";
    return e;
  }
  function handleNext() {
    setTouched({name:true,direction:true,method:true,listenerEndpointUrl:true,baseUrl:true,product:true,businessObjects:true});
    const e=validateStep1(); setErrors(e);
    if(Object.keys(e).length!==0) return;
    // If POST request was already tested successfully, pre-seed fetchState so Step 2 skips the pull step
    if(isPolling&&form.httpMethod==="POST"&&form.postTestState==="success") setFetch("done");
    setStep(2);
  }

  function handlePostTest() {
    set("postTestState","loading"); set("postTestError","");
    clearTimeout(postTestTimer.current);
    postTestTimer.current=setTimeout(()=>{
      if(!form.baseUrl.trim()){ set("postTestState","error"); set("postTestError","No Base URL configured — add a Base URL before testing."); return; }
      // Simulate success for demo
      set("postTestState","success");
      set("schemaSummary",{recordsReturned:1,fieldsDetected:12,nestedObjects:4,arraysDetected:1,referenceLikeFields:2,pulledAt:new Date().toISOString()});
      set("sampleFetched",true);
    },2000);
  }

  // Mapping
  const unmappedRequired = form.fieldMappings.filter(m=>m.required&&!m.target).length;
  const dupTargets = (()=>{ const mp=form.fieldMappings.filter(m=>m.target).map(m=>m.target); return mp.filter((t,i)=>mp.indexOf(t)!==i); })();

  function updateMapping(idx,key,val) {
    setForm(f=>{ const m=[...f.fieldMappings]; m[idx]={...m[idx],[key]:val,rowState:val?(m[idx].rowState==="auto-mapped"?"auto-mapped":"manual"):"unmapped"}; return {...f,fieldMappings:m}; });
  }
  function handleAutoMap() {
    setForm(f=>({...f,fieldMappings:f.fieldMappings.map(m=>{ const mp=AUTO_MAP_RULES[m.src]; return mp&&!m.target?{...m,target:mp,rowState:"auto-mapped"}:m.target?{...m,rowState:"manual"}:m; })}));
  }
  function handleValidate() {
    const mp=form.fieldMappings, mapped=mp.filter(m=>m.target).map(m=>m.target), dups=mapped.filter((t,i)=>mapped.indexOf(t)!==i);
    const result={requiredMapped:mp.filter(m=>m.required&&m.target).length,requiredTotal:mp.filter(m=>m.required).length,optionalSkipped:mp.filter(m=>!m.required&&!m.target).length,typeConflicts:0,refLookups:mp.filter(m=>m.refLookup&&m.target).length,duplicateTargets:dups.length,unmappedRequired:mp.filter(m=>m.required&&!m.target).length,ranAt:new Date().toISOString()};
    setForm(f=>({...f,validationResult:result}));
  }
  function handleFetchSample() {
    setFetch("loading"); clearTimeout(fetchTimer.current);
    fetchTimer.current=setTimeout(()=>{
      const sample=`{\n  "id": "OBS-1042",\n  "timestamp": "2025-04-14T08:30:00Z",\n  "asset": {\n    "id": "PUMP-12",\n    "name": "Primary Feed Pump",\n    "location": { "site": "Houston Plant" }\n  },\n  "measurements": [\n    { "value": 98.4, "unit": "degC" }\n  ],\n  "severity": "warning",\n  "description": "Temperature threshold exceeded",\n  "links": { "workOrder": { "href": "/api/workorders/WO-9921" } },\n  "metadata": { "source": "PI-historian", "version": "2.1" }\n}`;
      set("sampleJson",sample); set("sampleFetched",true);
      set("schemaSummary",{recordsReturned:1,fieldsDetected:12,nestedObjects:4,arraysDetected:1,referenceLikeFields:2,pulledAt:new Date().toISOString()});
      setFetch("done");
    },1800);
  }

  // The pre-publish readiness checklist shown in Step 2.
  // Each item shows a green ✓ or grey ○ depending on whether that condition is met.
  // This gives users a clear, scannable summary of what's complete and what still needs attention.
  // It does NOT block saving as draft — only the Publish button enforces the full gate.
  const readiness=[
    {label:"Integration name set", ok:!!form.name.trim()},
    {label:"Direction and method set", ok:!!form.direction&&!!form.method},
    {label:"Connection configured", ok:isPolling?isValidUrl(form.baseUrl):isInboundWebhook?isValidUrl(form.listenerEndpointUrl):isOutboundWebhook?!!form.selectedWebhookId:true},
    {label:"Product and collections set", ok:isOutbound?true:!!form.product&&form.businessObjects.length>0},
    {label:"Required mappings complete", ok:isInbound?(unmappedRequired===0&&form.fieldMappings.some(m=>m.target)):true},
    {label:"Runtime settings valid", ok:isPolling?!!form.frequency:true},
  ];

  function handleSave(publish) {
    const selectedWh = webhooks.find(w=>w.id===form.selectedWebhookId);
    const newInt={
      id:genId("int"), systemId:system?.id, name:form.name, direction:form.direction, method:form.method,
      product:isInbound?form.product:null, businessObjects:isInbound?form.businessObjects:[],
      frequency:isPolling?form.frequency:null,
      status:publish?"active":"draft", lastRunAt:null,
    };
    onSave(newInt);
    if(publish) setPublished({...newInt,publishedAt:new Date().toISOString()});
    else resetAndClose();
  }
  function resetAndClose() { clearTimeout(fetchTimer.current); onClose(); }

  // Publish success screen
  if(published) return (
    <>
      <div onClick={resetAndClose} style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.30)",zIndex:200}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:560,background:C.bg0,borderLeft:`1px solid ${C.border0}`,zIndex:201,display:"flex",flexDirection:"column",boxShadow:"-4px 0 20px rgba(0,0,0,0.09)"}}>
        <div style={{padding:"0 22px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.border0}`,background:C.bg1,flexShrink:0}}>
          <span style={{fontFamily:FONT,fontWeight:700,fontSize:15,color:C.text0}}>Integration Published</span>
          <button onClick={resetAndClose} style={{background:"none",border:`1px solid ${C.border1}`,color:C.text2,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"32px 22px"}}>
          <div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderLeft:`4px solid ${C.green}`,padding:"16px 18px",marginBottom:24,display:"flex",alignItems:"flex-start",gap:12}}>
            <span style={{color:C.green,fontSize:22,lineHeight:1}}>✓</span>
            <div><div style={{fontFamily:FONT,fontWeight:700,fontSize:14,color:C.green,marginBottom:3}}>Integration is now active</div><div style={{fontFamily:FONT,fontSize:12,color:C.text1}}>Data will begin flowing according to the configured runtime settings.</div></div>
          </div>
          <div style={{background:C.bg1,border:`1px solid ${C.border0}`,padding:"16px 18px",marginBottom:20}}>
            <SectionRule label="Integration Summary"/>
            {[
              {label:"Name",      value:published.name},
              {label:"Direction", value:published.direction==="inbound"?"Inbound to Innovapptive":"Outbound from Innovapptive"},
              {label:"Method",    value:published.method==="polling"?"Polling (Scheduled)":"Webhook (Real-time)"},
              ...(published.product?[{label:"Product",value:published.product},{label:"Collections",value:(published.businessObjects||[]).join(", ")||"—"}]:[]),
              {label:"Published", value:new Date(published.publishedAt).toLocaleString()},
            ].map(row=>(
              <div key={row.label} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border0}`}}>
                <span style={{fontFamily:FONT,fontSize:12,color:C.text3}}>{row.label}</span>
                <span style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text0}}>{row.value}</span>
              </div>
            ))}
            <div style={{marginTop:10}}><StatusBadge status="active" size="lg"/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <span title="Edit Mapping will be available in a future release" style={{display:"inline-flex",alignItems:"center",gap:6,background:C.bg2,border:`1px solid ${C.border0}`,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"8px 16px",color:C.text3,cursor:"not-allowed"}}>Edit Mapping <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.05em"}}>COMING SOON</span></span>
            <button onClick={()=>{resetAndClose();onGoToSystem&&onGoToSystem();}} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"8px 16px",cursor:"pointer"}}>Done</button>
          </div>
        </div>
      </div>
    </>
  );

  // Inbound mapping workspace — full-screen overlay (both webhook and polling)
  if(mappingOpen&&isInbound) return (
    <MappingWorkspace
      open={mappingOpen}
      form={form}
      setForm={setForm}
      system={system}
      onBack={()=>setMappingOpen(false)}
      onSave={(publish)=>{ setMappingOpen(false); handleSave(publish); }}
    />
  );

  return (
    <>
      <WebhookRegistryModal open={wbModal} onClose={()=>setWbModal(false)} onSave={wh=>{onAddWebhook(wh);set("selectedWebhookId",wh.id);setWbModal(false);}}/>
      <div onClick={resetAndClose} style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.30)",zIndex:200}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:580,background:C.bg0,borderLeft:`1px solid ${C.border0}`,zIndex:201,display:"flex",flexDirection:"column",boxShadow:"-4px 0 20px rgba(0,0,0,0.09)"}}>
        <div style={{padding:"0 22px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.border0}`,background:C.bg1,flexShrink:0}}>
          <div>
            <div style={{fontFamily:FONT,fontWeight:700,fontSize:15,color:C.text0}}>Add Integration</div>
            {system&&<div style={{fontFamily:FONT,fontSize:11,color:C.text3}}>under <MonoText size={11} color={C.blue}>{system.name}</MonoText></div>}
          </div>
          <button onClick={resetAndClose} style={{background:"none",border:`1px solid ${C.border1}`,color:C.text2,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>×</button>
        </div>
        {showStepper&&<StepIndicator current={step} steps={["Connection & Basics","Mapping, Runtime & Publish"]}/>}

        <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"22px 22px 8px"}}>
          {step===1&&(
            <>
              {/* Name */}
              <div style={{marginBottom:22}}>
                <FieldLabel label="Integration Name" required/>
                <FieldInput value={form.name} onChange={v=>{set("name",v);touch("name");}} placeholder="e.g. Observation Polling, WO Dispatch" error={touched.name&&errors.name}/>
                <FieldError msg={touched.name&&errors.name}/>
              </div>

              {/* Direction — Phase 2: two-layer labels */}
              <div style={{marginBottom:22}}>
                <SectionRule label="Direction"/>
                <div style={{fontFamily:FONT,fontSize:11,color:C.text2,marginBottom:10}}>Where does data originate, and where does it go?</div>
                <div style={{display:"flex",gap:10}}>
                  <SelectionCard label="Bring data into Innovapptive" sublabel="Inbound" description="Data originates in the external system and is pulled or pushed into Innovapptive." selected={form.direction==="inbound"} onClick={()=>{set("direction","inbound");set("method","");}}/>
                  <SelectionCard label="Send data from Innovapptive" sublabel="Outbound" description="Data originates in Innovapptive and is delivered to an external system." selected={form.direction==="outbound"} onClick={()=>{set("direction","outbound");set("method","");}}/>
                </div>
                <FieldError msg={touched.direction&&errors.direction}/>
              </div>

              {/* Method — Phase 2: two-layer + Phase 3: framing question */}
              {form.direction&&(
                <div style={{marginBottom:22}}>
                  <SectionRule label="Method"/>
                  {/* Phase 3: framing question */}
                  <div style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text1,marginBottom:8}}>
                    {isInbound?"How should data arrive from the external system?":"How should Innovapptive deliver data to the external system?"}
                  </div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    {isInbound&&<>
                      <SelectionCard label="Real-time event delivery" sublabel="Webhook" description="The external system pushes events to an Innovapptive listener as they happen." selected={form.method==="webhook"} onClick={()=>set("method","webhook")}/>
                      <SelectionCard label="Scheduled data pull" sublabel="Polling" description="Innovapptive fetches records from the external system on a set schedule." selected={form.method==="polling"} onClick={()=>set("method","polling")}/>
                      <SelectionCard label="Batch file import" sublabel="File Import" description="Import records from a file on a schedule." selected={false} disabled tag="Coming Soon"/>
                    </>}
                    {isOutbound&&<>
                      <SelectionCard label="Send events in real time" sublabel="Webhook" description="Innovapptive delivers event payloads to an external endpoint immediately when triggered." selected={form.method==="webhook"} onClick={()=>set("method","webhook")}/>
                      <SelectionCard label="Batch file export" sublabel="File Export" description="Export records to a file on a schedule." selected={false} disabled tag="Coming Soon"/>
                    </>}
                  </div>
                  <FieldError msg={touched.method&&errors.method}/>
                </div>
              )}

              {/* Product + Collections — inbound only, appears right after Method */}
              {form.method&&isInbound&&(
                <div style={{marginBottom:22}}>
                  <SectionRule label="Product & Collections"/>
                  <div style={{marginBottom:12}}>
                    <FieldLabel label="Product" required/>
                    <FieldSelect value={form.product} onChange={v=>{set("product",v);set("businessObjects",[]);touch("product");}} options={PRODUCTS} placeholder="— Select product —" error={touched.product&&errors.product}/>
                    <FieldError msg={touched.product&&errors.product}/>
                  </div>
                  {form.product&&(
                    <div>
                      <FieldLabel label="Collections" required helper="Select all object types this integration maps to"/>
                      <MultiSelectDropdown
                        options={PRODUCT_OBJECTS[form.product]||[]}
                        value={form.businessObjects}
                        onChange={v=>{set("businessObjects",v);touch("businessObjects");}}
                        placeholder="— Select collections —"
                        error={touched.businessObjects&&!!errors.businessObjects}
                      />
                      {touched.businessObjects&&errors.businessObjects&&<FieldError msg={errors.businessObjects}/>}
                      {(form.businessObjects||[]).length>0&&(
                        <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:5}}>
                          {form.businessObjects.map(col=>(
                            <span key={col} style={{background:C.blueBg,border:`1px solid ${C.blueBorder}`,fontFamily:FONT,fontSize:11,fontWeight:600,color:C.blue,padding:"2px 9px"}}>{col}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* INBOUND WEBHOOK config */}
              {isInboundWebhook&&(
                <div style={{marginBottom:22}}>
                  <SectionRule label="Listener Endpoint"/>
                  <div style={{marginBottom:12}}>
                    <FieldLabel label="Listener Endpoint URL" required helper="Enter the URL where Innovapptive should receive incoming events. Paste or type the endpoint URL, then register it in your external system's webhook settings."/>
                    <FieldInput
                      value={form.listenerEndpointUrl}
                      onChange={v=>{set("listenerEndpointUrl",v);touch("listenerEndpointUrl");}}
                      placeholder="https://hooks.company.com/inno-listener"
                      mono
                      error={touched.listenerEndpointUrl&&errors.listenerEndpointUrl}
                    />
                    <FieldError msg={touched.listenerEndpointUrl&&errors.listenerEndpointUrl}/>
                  </div>
                  <div style={{marginBottom:12}}>
                    <FieldLabel label="Incoming Authentication" helper="What authentication will the external system send when calling this endpoint?"/>
                    <FieldSelect value={form.incomingAuthType} onChange={v=>set("incomingAuthType",v)} options={INCOMING_AUTH_TYPES} placeholder="— Select —"/>
                    {form.incomingAuthType==="API Key (header)"&&(
                      <div style={{marginTop:8,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 12px"}}>
                        <div><FieldLabel label="Header Name"/><FieldInput value={form.incomingApiKeyHeader} onChange={v=>set("incomingApiKeyHeader",v)} placeholder="X-API-Key" mono/></div>
                        <div><FieldLabel label="Expected Key Value"/><FieldInput value={form.incomingApiKeyValue} onChange={v=>set("incomingApiKeyValue",v)} placeholder="shared-secret" mono/></div>
                      </div>
                    )}
                    {form.incomingAuthType==="HMAC Signature"&&(
                      <div style={{marginTop:8}}><FieldLabel label="Signing Secret"/><FieldInput value={form.incomingHmacSecret} onChange={v=>set("incomingHmacSecret",v)} placeholder="whsec_••••••••" mono/></div>
                    )}
                  </div>
                  <InfoBox variant="teal">Once you have a URL, register it in your external system's webhook settings using the authentication method configured here. Innovapptive will begin receiving events immediately after you publish this integration.</InfoBox>
                </div>
              )}

              {/* INBOUND POLLING config */}
              {isPolling&&(
                <div style={{marginBottom:22}}>
                  <SectionRule label="Request Configuration"/>
                  <div style={{marginBottom:12}}>
                    <FieldLabel label="Base URL" required helper="Full URL of the endpoint to poll, e.g. https://pi.company.com/api/v2/observations"/>
                    <FieldInput value={form.baseUrl} onChange={v=>{set("baseUrl",v);touch("baseUrl");}} placeholder="https://api.external-system.com/data/observations" mono error={touched.baseUrl&&errors.baseUrl}/>
                    <FieldError msg={touched.baseUrl&&errors.baseUrl}/>
                  </div>
                  <div style={{marginBottom:12}}>
                    <FieldLabel label="HTTP Method"/>
                    <div style={{display:"flex",gap:8}}>
                      {HTTP_METHODS.map(m=>(
                        <button key={m} onClick={()=>set("httpMethod",m)} style={{padding:"5px 16px",fontFamily:MONO,fontSize:12,fontWeight:700,cursor:"pointer",border:`1px solid ${form.httpMethod===m?C.blue:C.border1}`,background:form.httpMethod===m?C.blueBg:C.bg0,color:form.httpMethod===m?C.blue:C.text1}}>{m}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{marginBottom:12}}>
                    <FieldLabel label="Query Parameters" sublabel="key=value pairs sent in the URL"/>
                    <KVTable rows={form.requestParams} onChange={v=>set("requestParams",v)} addLabel="Add parameter"/>
                  </div>
                  <div style={{marginBottom:12}}>
                    <FieldLabel label="Headers" sublabel="custom request headers"/>
                    <KVTable rows={form.requestHeaders} onChange={v=>set("requestHeaders",v)} addLabel="Add header"/>
                  </div>
                  {form.httpMethod==="POST"&&(
                    <div style={{marginBottom:12}}>
                      <FieldLabel label="Request Body" helper="JSON body sent with the POST request"/>
                      <FieldTextarea value={form.requestBody} onChange={v=>{set("requestBody",v);if(form.postTestState!=="idle")set("postTestState","idle");}} placeholder={'{\n  "filter": "active",\n  "limit": 100\n}'} rows={4} mono/>
                    </div>
                  )}
                  {form.httpMethod==="POST"&&(
                    <div style={{marginBottom:12}}>
                      <button
                        onClick={handlePostTest}
                        disabled={form.postTestState==="loading"||!form.baseUrl}
                        style={{background:form.postTestState==="success"?C.greenBg:form.postTestState==="error"?C.redBg:C.bg0,border:`1px solid ${form.postTestState==="success"?C.greenBorder:form.postTestState==="error"?C.redBorder:C.border1}`,color:form.postTestState==="success"?C.green:form.postTestState==="error"?C.red:(!form.baseUrl?C.text3:C.blue),fontFamily:FONT,fontSize:12,fontWeight:600,padding:"7px 16px",cursor:(form.postTestState==="loading"||!form.baseUrl)?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:7,opacity:!form.baseUrl?0.5:1}}
                      >
                        {form.postTestState==="loading"?<><Spinner size={12}/><span>Testing…</span></>:form.postTestState==="success"?"✓ Request validated — re-test":"▶ Test Request & Pull Sample"}
                      </button>
                      {form.postTestState==="success"&&(
                        <div style={{marginTop:8}}><InfoBox variant="green">Request succeeded — sample response received. Proceed to Step 2 to map fields.</InfoBox></div>
                      )}
                      {form.postTestState==="error"&&(
                        <div style={{marginTop:8,display:"flex",alignItems:"flex-start",gap:8}}>
                          <div style={{flex:1}}><InfoBox variant="amber">Request failed — {form.postTestError||"check your Base URL, authentication, and request body before continuing."}</InfoBox></div>
                          <button onClick={()=>set("postTestState","idle")} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:11,fontWeight:600,padding:"5px 10px",cursor:"pointer",flexShrink:0,marginTop:1}}>Retry</button>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{marginBottom:12}}>
                    <FieldLabel label="Authentication"/>
                    <FieldSelect value={form.pollingAuthType} onChange={v=>set("pollingAuthType",v)} options={AUTH_TYPES.filter(o=>o!=="— Select auth type —")} placeholder="— Select auth type —"/>
                    {form.pollingAuthType&&form.pollingAuthType!=="No Authentication"&&<AuthCredentials authType={form.pollingAuthType} form={form} set={set} prefix="polling"/>}
                    {form.pollingAuthType==="No Authentication"&&<div style={{marginTop:8}}><InfoBox variant="blue">No authentication will be sent. Ensure this endpoint is secured at the network level.</InfoBox></div>}
                  </div>
                  <InfoBox variant="amber">The IP address or domain of this endpoint must be whitelisted by Innovapptive DevOps in WAF policies before this integration can run in production.</InfoBox>
                </div>
              )}

              {/* OUTBOUND WEBHOOK config */}
              {isOutboundWebhook&&(
                <div style={{marginBottom:22}}>
                  <SectionRule label="Webhook Registry"/>
                  <div style={{fontFamily:FONT,fontSize:12,color:C.text1,marginBottom:14,lineHeight:1.6}}>Select a registered webhook as the delivery target for this integration. Webhooks are configured and managed centrally in the Webhook Registry — not inline inside individual integrations.</div>
                  <div style={{marginBottom:12}}>
                    <FieldLabel label="Registered Webhook" helper="Select from your organization's Webhook Registry"/>
                    <FieldSelect value={form.selectedWebhookId} onChange={v=>set("selectedWebhookId",v)} options={webhooks.map(w=>w.id)} placeholder={webhooks.length?"— Select a webhook —":"No webhooks registered yet"} disabled={!webhooks.length}/>
                    {form.selectedWebhookId&&(()=>{
                      const wh=webhooks.find(w=>w.id===form.selectedWebhookId);
                      return wh?<div style={{marginTop:6,padding:"7px 10px",background:C.bg1,border:`1px solid ${C.border0}`}}>
                        <div style={{fontFamily:FONT,fontSize:11,color:C.text3,marginBottom:2}}>Target URL</div>
                        <MonoText size={11} color={C.text1}>{wh.targetUrl}</MonoText>
                        {wh.eventTypes&&<div style={{marginTop:4,fontFamily:FONT,fontSize:11,color:C.text3}}>Events: {wh.eventTypes}</div>}
                      </div>:null;
                    })()}
                  </div>
                  <div>
                    <button onClick={()=>setWbModal(true)} style={{background:C.blueBg,border:`1px solid ${C.blueBorder}`,color:C.blue,fontFamily:FONT,fontSize:12,fontWeight:600,padding:"7px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>+ Create New Webhook</button>
                    <div style={{fontFamily:FONT,fontSize:11,color:C.text3,marginTop:5}}>Opens Webhook Registry to define a new delivery endpoint</div>
                  </div>
                </div>
              )}

              {/* Behavior — all methods */}
              {form.method&&(
                <div style={{marginBottom:22}}>
                  <SectionRule label="Behavior"/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 14px"}}>
                    <div>
                      <FieldLabel label="When should this run?" sublabel="Trigger"/>
                      <FieldSelect value={form.triggerOn} onChange={v=>set("triggerOn",v)} options={TRIGGER_OPTIONS}/>
                    </div>
                    <div>
                      <FieldLabel label="What happens if it fails?" sublabel="Failure handling"/>
                      <FieldSelect value={form.failureBehavior} onChange={v=>set("failureBehavior",v)} options={FAILURE_OPTIONS}/>
                    </div>
                  </div>
                </div>
              )}

              {/* Outbound webhook publish area */}
              {isOutboundWebhook&&(
                <div style={{marginBottom:22}}>
                  <SectionRule label="Publish"/>
                  {form.selectedWebhookId?(
                    <InfoBox variant="green">Webhook selected. This integration will deliver events to the registered endpoint when triggered.</InfoBox>
                  ):(
                    <InfoBox variant="amber">Select or create a webhook above before publishing.</InfoBox>
                  )}
                </div>
              )}
            </>
          )}

          {step===2&&(
            <>
              {/* Inbound Webhook Step 2: lightweight */}
              {isInboundWebhook&&(
                <>
                  <div style={{marginBottom:20}}>
                    <SectionRule label="Connection Summary"/>
                    <div style={{background:C.bg1,border:`1px solid ${C.border0}`,borderLeft:`3px solid ${C.teal}`,padding:"12px 14px"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 20px"}}>
                        {[
                          {label:"Listener URL",   value:form.listenerEndpointUrl||"—", mono:true},
                          {label:"Incoming Auth",  value:form.incomingAuthType||"None"},
                          {label:"How this runs",  sublabel:"Runtime", value:"Real-time"},
                          {label:"Product",        value:form.product||"—"},
                        ].map(row=>(
                          <div key={row.label}>
                            <div style={{fontFamily:FONT,fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>{row.label}{row.sublabel&&<span style={{fontFamily:FONT,fontSize:9,color:C.text3,marginLeft:4,letterSpacing:"0.04em"}}>{row.sublabel}</span>}</div>
                            {row.mono?<MonoText size={11} color={C.text1}>{row.value}</MonoText>:<div style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text0}}>{row.value}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{marginBottom:20}}>
                    <SectionRule label="Data Mapping"/>
                    {(()=>{
                      const mapped=form.fieldMappings.filter(m=>m.target).length;
                      const reqUnmapped=form.fieldMappings.filter(m=>m.required&&!m.target).length;
                      const complete=reqUnmapped===0&&mapped>0;
                      const statusLabel=complete?"Ready to publish":mapped===0?"Mapping required":`Mapping incomplete — ${reqUnmapped} required field${reqUnmapped!==1?"s":""} unmapped`;
                      const statusColor=complete?C.green:mapped===0?C.red:C.amber;
                      const statusBg=complete?C.greenBg:mapped===0?C.redBg:C.amberBg;
                      const statusBorder=complete?C.greenBorder:mapped===0?C.redBorder:C.amberBorder;
                      return (
                        <div style={{background:C.bg1,border:`1px solid ${statusBorder}`,borderLeft:`3px solid ${statusColor}`,padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
                          <div style={{flex:1}}>
                            <div style={{fontFamily:FONT,fontSize:12,fontWeight:700,color:statusColor,marginBottom:3}}>{statusLabel}</div>
                            {mapped>0&&<div style={{fontFamily:FONT,fontSize:11,color:C.text2}}>{mapped} of {form.fieldMappings.length} fields mapped</div>}
                            {mapped===0&&<div style={{fontFamily:FONT,fontSize:11,color:C.text2}}>Open the mapping workspace to connect incoming payload fields to target collections.</div>}
                          </div>
                          <button onClick={()=>setMappingOpen(true)} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:12,fontWeight:700,padding:"7px 16px",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
                            Open Mapping Workspace →
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{marginBottom:20}}>
                    <SectionRule label="How this runs"/>
                    <InfoBox variant="teal">Always real-time. This integration triggers on each verified incoming payload — no schedule required.</InfoBox>
                  </div>
                </>
              )}

              {/* Polling Step 2: full mapping + runtime */}
              {isPolling&&(
                <>
                  {/* Request Context — inherited from Step 1 */}
                  <div style={{marginBottom:20}}>
                    <SectionRule label="Request Context"/>
                    <div style={{background:C.bg1,border:`1px solid ${C.border0}`,borderLeft:`3px solid ${C.border1}`,padding:"12px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <span style={{fontFamily:FONT,fontSize:11,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.09em"}}>From Step 1</span>
                        <button onClick={()=>setStep(1)} style={{background:"none",border:`1px solid ${C.border1}`,color:C.blue,fontFamily:FONT,fontSize:11,fontWeight:600,padding:"3px 10px",cursor:"pointer"}}>Edit</button>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"6px 20px"}}>
                        {[
                          {label:"Base URL",    value:form.baseUrl||"Not set",   mono:true},
                          {label:"HTTP Method", value:form.httpMethod,            mono:true},
                          {label:"Auth Type",   value:form.pollingAuthType||"None"},
                          {label:"Parameters",  value:form.requestParams.filter(r=>r.key).map(r=>`${r.key}=${r.value}`).join(", ")||"None"},
                          ...(form.httpMethod==="POST"?[{label:"Request Body",value:form.requestBody?(form.requestBody.slice(0,50)+(form.requestBody.length>50?"…":"")):"None",mono:!!form.requestBody}]:[]),
                        ].map(row=>(
                          <div key={row.label}>
                            <div style={{fontFamily:FONT,fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>{row.label}</div>
                            {row.mono?<MonoText size={11} color={C.text1}>{row.value}</MonoText>:<div style={{fontFamily:FONT,fontSize:12,color:C.text0}}>{row.value}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Data Mapping — entry point to full-screen workspace */}
                  <div style={{marginBottom:20}}>
                    <SectionRule label="Data Mapping"/>
                    {(()=>{
                      const mapped=form.fieldMappings.filter(m=>m.target).length;
                      const reqUnmapped=form.fieldMappings.filter(m=>m.required&&!m.target).length;
                      const complete=reqUnmapped===0&&mapped>0;
                      const statusLabel=complete?"Ready to publish":mapped===0?"Mapping required":`Mapping incomplete — ${reqUnmapped} required field${reqUnmapped!==1?"s":""} unmapped`;
                      const statusColor=complete?C.green:mapped===0?C.red:C.amber;
                      const statusBg=complete?C.greenBg:mapped===0?C.redBg:C.amberBg;
                      const statusBorder=complete?C.greenBorder:mapped===0?C.redBorder:C.amberBorder;
                      return (
                        <div style={{background:C.bg1,border:`1px solid ${statusBorder}`,borderLeft:`3px solid ${statusColor}`,padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
                          <div style={{flex:1}}>
                            <div style={{fontFamily:FONT,fontSize:12,fontWeight:700,color:statusColor,marginBottom:3}}>{statusLabel}</div>
                            {mapped>0&&<div style={{fontFamily:FONT,fontSize:11,color:C.text2}}>{mapped} of {form.fieldMappings.length} fields mapped</div>}
                            {mapped===0&&<div style={{fontFamily:FONT,fontSize:11,color:C.text2}}>Open the mapping workspace to connect source fields to target paths.</div>}
                          </div>
                          <button onClick={()=>setMappingOpen(true)} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:12,fontWeight:700,padding:"7px 16px",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
                            Open Mapping Workspace →
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Runtime */}
                  <div style={{marginBottom:20}}>
                    <SectionRule label="How this runs"/>
                    <div style={{marginBottom:10,padding:"8px 12px",background:C.bg2,border:`1px solid ${C.border0}`,display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontFamily:FONT,fontSize:12,color:C.text2}}>Execution mode:</span>
                      <span style={{fontFamily:FONT,fontSize:12,fontWeight:700,color:C.text0}}>Scheduled</span>
                      <span style={{fontFamily:FONT,fontSize:11,color:C.text3}}>(Polling integrations always run on a schedule)</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px"}}>
                      <div><FieldLabel label="Frequency" required/><FieldSelect value={form.frequency} onChange={v=>set("frequency",v)} options={FREQ_OPTIONS}/></div>
                      <div><FieldLabel label="Start Time" sublabel="Local time"/><FieldInput value={form.startTime} onChange={v=>set("startTime",v)} placeholder="06:00" mono/></div>
                    </div>
                  </div>
                </>
              )}

              {/* Readiness Checklist */}
              <div style={{marginBottom:20}}>
                <SectionRule label="Readiness Checklist"/>
                <div style={{border:`1px solid ${C.border0}`,background:C.bg1}}>
                  {readiness.map((r,i)=>(
                    <div key={r.label} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:i<readiness.length-1?`1px solid ${C.border0}`:"none"}}>
                      <span style={{color:r.ok?C.green:C.text3,fontSize:15,fontWeight:700,width:18,textAlign:"center"}}>{r.ok?"✓":"○"}</span>
                      <span style={{fontFamily:FONT,fontSize:12,color:r.ok?C.text0:C.text2}}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced */}
              <div style={{marginBottom:20}}>
                <button onClick={()=>setAdvOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:`1px solid ${C.border0}`,width:"100%",padding:"8px 12px",cursor:"pointer",fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text1}}>
                  <span style={{color:C.text3,fontSize:11}}>{advOpen?"▼":"▶"}</span> Advanced runtime settings <span style={{fontFamily:FONT,fontSize:11,color:C.text3,fontWeight:400,marginLeft:4}}>— optional</span>
                </button>
                {advOpen&&(
                  <div style={{border:`1px solid ${C.border0}`,borderTop:"none",padding:"14px 14px 6px",background:C.bg1}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 14px"}}>
                      <div><FieldLabel label="Idempotency Key Field" helper="Field used to deduplicate records"/><FieldInput value={form.idempotencyKey} onChange={v=>set("idempotencyKey",v)} placeholder="id" mono/></div>
                      <div><FieldLabel label="Rate Limit (req/min)"/><FieldInput value={form.rateLimit} onChange={v=>set("rateLimit",v)} placeholder="60" mono/></div>
                      <div><FieldLabel label="Retry Policy"/><FieldSelect value={form.retryPolicy} onChange={v=>set("retryPolicy",v)} options={FAILURE_OPTIONS}/></div>
                      <div><FieldLabel label="Error Email" helper="Inherits system email if blank"/><FieldInput value={form.advErrorEmail} onChange={v=>set("advErrorEmail",v)} placeholder={system?.errorEmail||"ops@company.com"}/></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Integration summary */}
              <div style={{marginBottom:14}}>
                <SectionRule label="Integration Summary"/>
                <div style={{background:C.bg1,border:`1px solid ${C.border0}`,padding:"12px 14px"}}>
                  {[
                    {label:"Name",     value:form.name||"—"},
                    {label:"Direction",value:form.direction==="inbound"?"↓ Inbound":form.direction==="outbound"?"↑ Outbound":"—"},
                    {label:"Method",   value:form.method==="polling"?"Polling (Scheduled)":form.method==="webhook"?"Webhook (Real-time)":"—"},
                    ...(isInbound?[{label:"Product",value:form.product||"—"},{label:"Collections",value:(form.businessObjects||[]).join(", ")||"—"}]:[]),
                    {label:"How this runs",value:isWebhook?"Real-time":form.frequency||"Scheduled"},
                  ].map((row,i,arr)=>(
                    <div key={row.label} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<arr.length-1?`1px solid ${C.border0}`:"none"}}>
                      <span style={{fontFamily:FONT,fontSize:12,color:C.text3}}>{row.label}</span>
                      <span style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text0}}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{borderTop:`1px solid ${C.border0}`,padding:"12px 22px",background:C.bg1,flexShrink:0,display:"flex",alignItems:"center",gap:8}}>
          <button onClick={resetAndClose} style={{background:"none",border:`1px solid ${C.border0}`,color:C.text2,fontFamily:FONT,fontSize:13,padding:"7px 16px",cursor:"pointer"}}>Cancel</button>
          <div style={{flex:1}}/>
          {step===1&&!isOutboundWebhook&&(
            <>
              <button onClick={()=>handleSave(false)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"7px 16px",cursor:"pointer"}}>Save as Draft</button>
              <button onClick={handleNext} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"7px 18px",cursor:"pointer"}}>Next: Mapping & Runtime →</button>
            </>
          )}
          {step===1&&isOutboundWebhook&&(
            <>
              <button onClick={()=>handleSave(false)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"7px 16px",cursor:"pointer"}}>Save as Draft</button>
              <button onClick={()=>handleSave(true)} disabled={!form.selectedWebhookId} title={!form.selectedWebhookId?"Select or create a webhook above":""} style={{background:form.selectedWebhookId?C.blue:C.bg2,border:`1px solid ${form.selectedWebhookId?C.blueHover:C.border0}`,color:form.selectedWebhookId?"#fff":C.text3,fontFamily:FONT,fontSize:13,fontWeight:700,padding:"7px 18px",cursor:form.selectedWebhookId?"pointer":"not-allowed"}}>Publish Integration</button>
            </>
          )}
          {step===2&&isPolling&&(
            <>
              <button onClick={()=>setStep(1)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"7px 14px",cursor:"pointer"}}>← Back</button>
              <button onClick={()=>handleSave(false)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"7px 16px",cursor:"pointer"}}>Save as Draft</button>
              {unmappedRequired>0||form.fieldMappings.every(m=>!m.target)?(
                <button onClick={()=>setMappingOpen(true)} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"7px 18px",cursor:"pointer"}}>Continue →</button>
              ):(
                <button onClick={()=>handleSave(true)} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"7px 18px",cursor:"pointer"}}>Publish Integration</button>
              )}
            </>
          )}
          {step===2&&isInboundWebhook&&(
            <>
              <button onClick={()=>setStep(1)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"7px 14px",cursor:"pointer"}}>← Back</button>
              <button onClick={()=>handleSave(false)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"7px 16px",cursor:"pointer"}}>Save as Draft</button>
              {unmappedRequired>0||form.fieldMappings.every(m=>!m.target)?(
                <button onClick={()=>setMappingOpen(true)} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"7px 18px",cursor:"pointer"}}>Continue →</button>
              ):(
                <button onClick={()=>handleSave(true)} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"7px 18px",cursor:"pointer"}}>Publish Integration</button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── ADD SYSTEM DRAWER ───────────────────────────────────────────────────────
// Drawer for registering a new external system — the parent container for integrations.
//
// A System is a lightweight identity record: name, category, plant, error email.
// It does NOT store connection details (URL, auth credentials).
// Those live inside each integration because one system can have multiple integrations
// that connect to different endpoints with different authentication.
//
// "Save as Draft" skips email validation — useful when the user doesn't have the
// error email address handy. They can complete it later via Edit System.
// "Save System" requires full validation and navigates directly to the new system's detail page.
function AddSystemDrawer({ open, onClose, onSave }) {
  const [form,setForm]     = useState(blankAddSystemForm());
  const [errors,setErrors] = useState({});
  const [touched,setTouched] = useState({});
  const codeRef = useRef("");

  useEffect(()=>{
    if((form.name||form.category)&&!codeRef.current){
      const c=generateCode(form.name,form.category); codeRef.current=c; setForm(f=>({...f,code:c}));
    }
  },[form.name,form.category]);

  const set   = (k,v)=>setForm(f=>({...f,[k]:v}));
  const touch = k   =>setTouched(t=>({...t,[k]:true}));

  function validate(asDraft) {
    const e={};
    if(!form.plant)       e.plant="Select a plant";
    if(!form.name.trim()) e.name ="System name is required";
    if(!form.category)    e.category="Select a category";
    if(!asDraft){
      if(!form.errorEmail.trim())                                          e.errorEmail="Error notification email is required";
      else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.errorEmail.trim())) e.errorEmail="Enter a valid email address";
    }
    return e;
  }
  function handleSave(asDraft) {
    setTouched({plant:true,name:true,category:true,errorEmail:true});
    const e=validate(asDraft); setErrors(e);
    if(Object.keys(e).length>0) return;
    onSave({id:genId("sys"),name:form.name.trim(),category:form.category,code:form.code,plant:form.plant,description:form.description.trim(),errorEmail:form.errorEmail.trim(),status:asDraft?"draft":"ready",errorCount:0});
    resetAndClose();
  }
  function resetAndClose() { setForm(blankAddSystemForm());setErrors({});setTouched({});codeRef.current="";onClose(); }
  if(!open) return null;

  return (
    <>
      <div onClick={resetAndClose} style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.30)",zIndex:200}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:500,background:C.bg0,borderLeft:`1px solid ${C.border0}`,zIndex:201,display:"flex",flexDirection:"column",boxShadow:"-4px 0 20px rgba(0,0,0,0.09)"}}>
        <div style={{padding:"0 22px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.border0}`,background:C.bg1,flexShrink:0}}>
          <div>
            <div style={{fontFamily:FONT,fontWeight:700,fontSize:15,color:C.text0}}>Add System</div>
            <div style={{fontFamily:FONT,fontSize:11,color:C.text3}}>Give this platform an identity. Connection details are configured when you create integrations under it.</div>
          </div>
          <button onClick={resetAndClose} style={{background:"none",border:`1px solid ${C.border1}`,color:C.text2,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"22px 22px 8px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 16px",marginBottom:14}}>
            <div><FieldLabel label="Plant" required/><FieldSelect value={form.plant} onChange={v=>{set("plant",v);touch("plant");}} options={PLANTS_OPTS} placeholder="Select plant" error={touched.plant&&errors.plant}/><FieldError msg={touched.plant&&errors.plant}/></div>
            <div><FieldLabel label="System Name" required/><FieldInput value={form.name} onChange={v=>{set("name",v);touch("name");}} placeholder="e.g. AVEVA PI System" error={touched.name&&errors.name}/><FieldError msg={touched.name&&errors.name}/></div>
            <div><FieldLabel label="Category" required/><FieldSelect value={form.category} onChange={v=>{set("category",v);touch("category");}} options={CATEGORIES} placeholder="Select category" error={touched.category&&errors.category}/><FieldError msg={touched.category&&errors.category}/></div>
            <div>
              <FieldLabel label="System Code"/>
              <div style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",background:C.bg2,border:`1px solid ${C.border1}`,fontFamily:MONO,fontSize:13,color:form.code?C.blue:C.text3,cursor:"not-allowed"}}>
                {form.code||<span style={{fontFamily:FONT,fontSize:13,color:C.text3}}>Generated from name + category</span>}
              </div>
              <div style={{fontFamily:FONT,fontSize:11,color:C.text3,marginTop:4}}>Auto-generated — used in audit logs and API references</div>
            </div>
          </div>
          <div style={{marginBottom:18}}><FieldLabel label="Description"/><FieldTextarea value={form.description} onChange={v=>set("description",v)} placeholder="Briefly describe what this system does." rows={2}/></div>
          <div><FieldLabel label="Error Notification Email" required helper="Failure alerts for integrations under this system will be sent here"/><FieldInput value={form.errorEmail} onChange={v=>{set("errorEmail",v);touch("errorEmail");}} placeholder="ops-alerts@company.com" error={touched.errorEmail&&errors.errorEmail}/><FieldError msg={touched.errorEmail&&errors.errorEmail}/></div>
        </div>
        <div style={{borderTop:`1px solid ${C.border0}`,padding:"12px 22px",background:C.bg1,flexShrink:0,display:"flex",gap:8}}>
          <button onClick={resetAndClose} style={{background:"none",border:`1px solid ${C.border0}`,color:C.text2,fontFamily:FONT,fontSize:13,padding:"7px 16px",cursor:"pointer"}}>Cancel</button>
          <div style={{flex:1}}/>
          <button onClick={()=>handleSave(true)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"7px 16px",cursor:"pointer"}}>Save as Draft</button>
          <button onClick={()=>handleSave(false)} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"7px 18px",cursor:"pointer"}}>Save System</button>
        </div>
      </div>
    </>
  );
}

// ─── EDIT SYSTEM DRAWER ───────────────────────────────────────────────────────
// Allows editing a system's metadata after it was created.
// The System Code field is read-only — it was assigned at creation and is referenced
// in audit logs and API calls, so it must remain stable.
// After saving, shows a green confirmation banner for 900ms then auto-closes.
function EditSystemDrawer({ open, system, onClose, onSave }) {
  const [form,setForm]=useState(null); const [errors,setErrors]=useState({}); const [touched,setTouched]=useState({}); const [saved,setSaved]=useState(false);
  useEffect(()=>{if(open&&system){setForm({name:system.name,category:system.category,plant:system.plant,description:system.description||"",errorEmail:system.errorEmail||""});setErrors({});setTouched({});setSaved(false);}},[open,system]);
  if(!open||!form||!system) return null;
  const set=(k,v)=>setForm(f=>({...f,[k]:v})); const touch=k=>setTouched(t=>({...t,[k]:true}));
  function validate(){const e={};if(!form.name.trim())e.name="Required";if(!form.plant)e.plant="Required";if(!form.category)e.category="Required";if(!form.errorEmail.trim())e.errorEmail="Required";else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.errorEmail.trim()))e.errorEmail="Enter a valid email address";return e;}
  function handleSave(){setTouched({name:true,plant:true,category:true,errorEmail:true});const e=validate();setErrors(e);if(Object.keys(e).length>0)return;onSave({...system,name:form.name.trim(),category:form.category,plant:form.plant,description:form.description.trim(),errorEmail:form.errorEmail.trim()});setSaved(true);setTimeout(onClose,900);}
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.30)",zIndex:200}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:500,background:C.bg0,borderLeft:`1px solid ${C.border0}`,zIndex:201,display:"flex",flexDirection:"column",boxShadow:"-4px 0 20px rgba(0,0,0,0.09)"}}>
        <div style={{padding:"0 22px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.border0}`,background:C.bg1,flexShrink:0}}>
          <div><div style={{fontFamily:FONT,fontWeight:700,fontSize:15,color:C.text0}}>Edit System</div><div style={{fontFamily:FONT,fontSize:11,color:C.text3}}>{system.name} <MonoText size={11} color={C.blue}>{system.code}</MonoText></div></div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border1}`,color:C.text2,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"22px 22px 8px"}}>
          {saved&&<div style={{marginBottom:14,background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderLeft:`3px solid ${C.green}`,padding:"8px 12px",fontFamily:FONT,fontSize:12,color:C.green,display:"flex",alignItems:"center",gap:6}}><span>✓</span>System updated</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 16px",marginBottom:14}}>
            <div><FieldLabel label="Plant" required/><FieldSelect value={form.plant} onChange={v=>{set("plant",v);touch("plant");}} options={PLANTS_OPTS} placeholder="Select plant" error={touched.plant&&errors.plant}/><FieldError msg={touched.plant&&errors.plant}/></div>
            <div><FieldLabel label="System Name" required/><FieldInput value={form.name} onChange={v=>{set("name",v);touch("name");}} placeholder="System name" error={touched.name&&errors.name}/><FieldError msg={touched.name&&errors.name}/></div>
            <div><FieldLabel label="Category" required/><FieldSelect value={form.category} onChange={v=>{set("category",v);touch("category");}} options={CATEGORIES} placeholder="Select category" error={touched.category&&errors.category}/><FieldError msg={touched.category&&errors.category}/></div>
            <div>
              <FieldLabel label="System Code"/>
              <div style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",background:C.bg2,border:`1px solid ${C.border1}`,fontFamily:MONO,fontSize:13,color:C.blue,cursor:"not-allowed"}}>{system.code}</div>
              <div style={{fontFamily:FONT,fontSize:11,color:C.text3,marginTop:4}}>Read-only — set at creation</div>
            </div>
          </div>
          <div style={{marginBottom:14}}><FieldLabel label="Description"/><FieldTextarea value={form.description} onChange={v=>set("description",v)} placeholder="Briefly describe this system." rows={2}/></div>
          <div><FieldLabel label="Error Notification Email" required/><FieldInput value={form.errorEmail} onChange={v=>{set("errorEmail",v);touch("errorEmail");}} placeholder="ops@company.com" error={touched.errorEmail&&errors.errorEmail}/><FieldError msg={touched.errorEmail&&errors.errorEmail}/></div>
        </div>
        <div style={{borderTop:`1px solid ${C.border0}`,padding:"12px 22px",background:C.bg1,flexShrink:0,display:"flex",gap:8}}>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border0}`,color:C.text2,fontFamily:FONT,fontSize:13,padding:"7px 16px",cursor:"pointer"}}>Cancel</button>
          <div style={{flex:1}}/>
          <button onClick={handleSave} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"7px 18px",cursor:"pointer"}}>Save Changes</button>
        </div>
      </div>
    </>
  );
}

// ─── EDIT INTEGRATION DRAWER ─────────────────────────────────────────────────
// Allows editing certain fields of an existing integration.
//
// Direction and method are read-only after creation. Why?
// They are architectural choices that determine the connection config, runtime behavior,
// and mapping structure. Changing them post-creation would invalidate all existing settings.
// If a user needs a different direction/method, they should create a new integration.
//
// Editable fields: name, product, collections, frequency, trigger, failure handling.
// Not editable: direction, method, connection URL, authentication, field mappings.
function EditIntegrationDrawer({ open, integration, system, onClose, onSave }) {
  const [form,setForm]=useState(null); const [errors,setErrors]=useState({}); const [touched,setTouched]=useState({}); const [saved,setSaved]=useState(false);
  useEffect(()=>{if(open&&integration){setForm({name:integration.name,product:integration.product||"",businessObjects:integration.businessObjects||[],triggerOn:"Always",failureBehavior:"Auto-retry 3x then DLQ",frequency:integration.frequency||"Every 15 min",startTime:"06:00"});setErrors({});setTouched({});setSaved(false);}},[open,integration]);
  if(!open||!form||!integration) return null;
  const set=(k,v)=>setForm(f=>({...f,[k]:v})); const touch=k=>setTouched(t=>({...t,[k]:true}));
  const isInbound=integration.direction==="inbound";
  function toggleBO(col){ const cur=form.businessObjects||[]; set("businessObjects",cur.includes(col)?cur.filter(c=>c!==col):[...cur,col]); touch("businessObjects"); }
  function validate(){const e={};if(!form.name.trim())e.name="Required";if(isInbound&&!form.product)e.product="Required";if(isInbound&&(form.businessObjects||[]).length===0)e.businessObjects="Select at least one";return e;}
  function handleSave(){setTouched({name:true,product:true,businessObjects:true});const e=validate();setErrors(e);if(Object.keys(e).length>0)return;onSave({...integration,name:form.name.trim(),product:isInbound?form.product:null,businessObjects:isInbound?form.businessObjects:[],frequency:integration.method==="polling"?form.frequency:null});setSaved(true);setTimeout(onClose,900);}
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.30)",zIndex:200}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:520,background:C.bg0,borderLeft:`1px solid ${C.border0}`,zIndex:201,display:"flex",flexDirection:"column",boxShadow:"-4px 0 20px rgba(0,0,0,0.09)"}}>
        <div style={{padding:"0 22px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.border0}`,background:C.bg1,flexShrink:0}}>
          <div><div style={{fontFamily:FONT,fontWeight:700,fontSize:15,color:C.text0}}>Edit Integration</div>{system&&<div style={{fontFamily:FONT,fontSize:11,color:C.text3}}>under <MonoText size={11} color={C.blue}>{system.name}</MonoText></div>}</div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border1}`,color:C.text2,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"22px 22px 8px"}}>
          {saved&&<div style={{marginBottom:14,background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderLeft:`3px solid ${C.green}`,padding:"8px 12px",fontFamily:FONT,fontSize:12,color:C.green,display:"flex",alignItems:"center",gap:6}}><span>✓</span>Integration updated</div>}
          <div style={{marginBottom:18,padding:"10px 14px",background:C.bg1,border:`1px solid ${C.border0}`}}>
            <div style={{fontFamily:FONT,fontSize:11,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Context — read only</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 20px"}}>
              {[{label:"Direction",value:integration.direction==="inbound"?"↓ Inbound":"↑ Outbound"},{label:"Method",value:integration.method==="polling"?"Polling":"Webhook"},{label:"Status",node:<StatusBadge status={integration.status}/>}].map(row=>(
                <div key={row.label}><div style={{fontFamily:FONT,fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>{row.label}</div>{row.node||<span style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text0}}>{row.value}</span>}</div>
              ))}
            </div>
            <div style={{marginTop:8,fontFamily:FONT,fontSize:11,color:C.text3}}>Direction and method cannot be changed after creation.</div>
          </div>
          <div style={{marginBottom:14}}><FieldLabel label="Integration Name" required/><FieldInput value={form.name} onChange={v=>{set("name",v);touch("name");}} placeholder="Integration name" error={touched.name&&errors.name}/><FieldError msg={touched.name&&errors.name}/></div>
          {isInbound&&<div style={{marginBottom:14}}>
            <div style={{marginBottom:10}}><FieldLabel label="Product" required/><FieldSelect value={form.product} onChange={v=>{set("product",v);set("businessObjects",[]);touch("product");}} options={PRODUCTS} placeholder="— Select product —" error={touched.product&&errors.product}/><FieldError msg={touched.product&&errors.product}/></div>
            {form.product&&<div>
              <FieldLabel label="Collections" required helper="Select all object types in this integration"/>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
                {(PRODUCT_OBJECTS[form.product]||[]).map(col=>{
                  const active=(form.businessObjects||[]).includes(col);
                  return <button key={col} onClick={()=>toggleBO(col)} style={{padding:"4px 10px",fontFamily:FONT,fontSize:12,fontWeight:active?700:400,cursor:"pointer",border:`1px solid ${active?C.blue:C.border1}`,background:active?C.blueBg:C.bg0,color:active?C.blue:C.text1,display:"flex",alignItems:"center",gap:4}}>{active&&<span style={{fontSize:9,fontWeight:900}}>✓</span>}{col}</button>;
                })}
              </div>
              {touched.businessObjects&&errors.businessObjects&&<FieldError msg={errors.businessObjects}/>}
            </div>}
          </div>}
          {integration.method==="polling"&&<div style={{marginBottom:14}}>
            <SectionRule label="How this runs"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px"}}>
              <div><FieldLabel label="Frequency"/><FieldSelect value={form.frequency} onChange={v=>set("frequency",v)} options={FREQ_OPTIONS}/></div>
              <div><FieldLabel label="Start Time"/><FieldInput value={form.startTime} onChange={v=>set("startTime",v)} placeholder="06:00" mono/></div>
            </div>
          </div>}
          {integration.method==="webhook"&&<div style={{marginBottom:14}}><SectionRule label="How this runs"/><InfoBox variant="teal">Always real-time. Triggers on each verified incoming payload.</InfoBox></div>}
          <div style={{marginBottom:14}}>
            <SectionRule label="Behavior"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 14px"}}>
              <div><FieldLabel label="When should this run?" sublabel="Trigger"/><FieldSelect value={form.triggerOn} onChange={v=>set("triggerOn",v)} options={TRIGGER_OPTIONS}/></div>
              <div><FieldLabel label="What happens if it fails?" sublabel="Failure handling"/><FieldSelect value={form.failureBehavior} onChange={v=>set("failureBehavior",v)} options={FAILURE_OPTIONS}/></div>
            </div>
          </div>
        </div>
        <div style={{borderTop:`1px solid ${C.border0}`,padding:"12px 22px",background:C.bg1,flexShrink:0,display:"flex",gap:8}}>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border0}`,color:C.text2,fontFamily:FONT,fontSize:13,padding:"7px 16px",cursor:"pointer"}}>Cancel</button>
          <div style={{flex:1}}/>
          <button onClick={handleSave} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"7px 18px",cursor:"pointer"}}>Save Changes</button>
        </div>
      </div>
    </>
  );
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
// The fixed dark top bar that appears on every page.
// "Workflows" and "My Approvals" are placeholder links — they render but don't navigate.
// The nav bar is purely decorative in this prototype to simulate a real product shell.
function TopNav() {
  return (
    <div style={{height:46,background:C.navBg,borderBottom:`1px solid ${C.navBorder}`,display:"flex",alignItems:"center",padding:"0 24px",position:"sticky",top:0,zIndex:100,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:20,height:20,background:C.blue,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:8,height:8,background:"#fff"}}/></div>
        <span style={{fontFamily:FONT,fontWeight:700,fontSize:13,color:C.navActive,letterSpacing:"0.08em"}}>INTEGRATION MANAGER</span>
      </div>
      <div style={{width:1,height:18,background:C.navBorder,margin:"0 20px"}}/>
      {["Workflows","My Approvals"].map(l=><NavLink key={l} label={l}/>)}
      <div style={{flex:1}}/>
    </div>
  );
}
function NavLink({ label }) {
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"0 12px",height:46,opacity:0.7,cursor:"default"}}>
      <span style={{fontFamily:FONT,fontSize:13,fontWeight:500,color:C.navText}}>{label}</span>
    </div>
  );
}

// ─── SYSTEM CARD ─────────────────────────────────────────────────────────────
// A card on the Systems list page representing one external system.
//
// Shows: name, status badge, category, plant, description, integration count,
// error notification email, and a red error badge if there are items in the Review Queue.
//
// Amber warning shown at the bottom if the system has no error email configured
// (failure alerts would be undeliverable in that case).
//
// Clicking anywhere on the card opens the System Detail page.
// The "View →" button also navigates but stops click propagation to prevent double-firing.
function SystemCard({ system, integrations, onClick }) {
  const [hov,setHov]=useState(false);
  const liveCount  = integrations.filter(i=>i.systemId===system.id&&i.status!=="disabled").length;
  const activeCount= integrations.filter(i=>i.systemId===system.id&&i.status==="active").length;
  return (
    <div onClick={()=>onClick(system.id)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:hov?C.bg1:C.bg0,border:`1px solid ${hov?C.border1:C.border0}`,borderLeft:`3px solid ${hov?C.blue:C.border0}`,padding:"14px 18px",cursor:"pointer",transition:"background 0.1s,border-color 0.1s"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><span style={{fontFamily:FONT,fontWeight:700,fontSize:14,color:C.text0}}>{system.name}</span><StatusBadge status={system.status}/></div>
          <div style={{fontFamily:FONT,fontSize:12,color:C.text2}}>{system.category}<span style={{margin:"0 6px",color:C.border1}}>·</span>{system.plant}</div>
        </div>
        <button onClick={e=>{e.stopPropagation();onClick(system.id);}} style={{background:"none",border:`1px solid ${C.border1}`,color:C.blue,fontFamily:FONT,fontSize:12,fontWeight:600,padding:"4px 12px",cursor:"pointer",flexShrink:0}}>View →</button>
      </div>
      <div style={{background:C.bg1,border:`1px solid ${C.border0}`,padding:"5px 8px",marginBottom:10,fontFamily:FONT,fontSize:11,color:C.text2,lineHeight:1.4}}>
        {system.description||<span style={{color:C.text3,fontStyle:"italic"}}>No description</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontFamily:FONT,fontSize:12,color:C.text2}}><span style={{color:C.text0,fontWeight:700}}>{liveCount}</span> integration{liveCount!==1?"s":""}{liveCount>0&&activeCount!==liveCount&&<span style={{color:C.text3,fontSize:11}}> · {activeCount} active</span>}</div>
          {system.errorEmail&&<div style={{fontFamily:FONT,fontSize:11,color:C.text2}}>Alerts: <MonoText size={11} color={C.text1}>{system.errorEmail}</MonoText></div>}
        </div>
        {system.errorBadge&&<span style={{background:C.redBg,border:`1px solid ${C.redBorder}`,padding:"2px 8px",fontSize:11,fontFamily:FONT,fontWeight:600,color:C.red}}>{system.errorBadge}</span>}
      </div>
      {!system.errorEmail&&system.status!=="draft"&&<div style={{marginTop:10,background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderLeft:`3px solid ${C.amber}`,padding:"5px 10px",fontFamily:FONT,fontSize:11,color:C.amber,display:"flex",alignItems:"center",gap:6}}><span>▲</span>Error notification email not configured.</div>}
    </div>
  );
}

// ─── SYSTEMS PAGE ────────────────────────────────────────────────────────────
// The main landing page. Shows all external systems as cards in a responsive grid.
//
// Filtering: search box (name or category) + plant select + status chip filters
// all work together. The count "N of M systems" updates live as filters change.
//
// The page intro copy explains the System → Integration hierarchy at a glance
// for users who may be new to the product.
function SystemsPage({ systems, integrations, onViewSystem, onAddSystem }) {
  const [search,setSearch]=useState(""); const [plant,setPlant]=useState("All Plants"); const [statusF,setStatusF]=useState("all");
  const statusCounts=useMemo(()=>{const c={all:systems.length};systems.forEach(s=>{c[s.status]=(c[s.status]||0)+1;});return c;},[systems]);
  const chips=[{key:"all",label:"All"},{key:"ready",label:"Ready"},{key:"draft",label:"Draft"},{key:"needs_attention",label:"Needs Attention"}];
  const filtered=useMemo(()=>systems.filter(s=>{const q=search.toLowerCase();return(s.name.toLowerCase().includes(q)||s.category.toLowerCase().includes(q))&&(plant==="All Plants"||s.plant===plant)&&(statusF==="all"||s.status===statusF);}),[systems,search,plant,statusF]);
  const inp={background:C.bg0,border:`1px solid ${C.border1}`,color:C.text0,fontFamily:FONT,fontSize:13,padding:"6px 10px",outline:"none",boxSizing:"border-box"};
  return (
    <div style={{padding:"24px 32px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}>
        <div>
          <h1 style={{fontFamily:FONT,fontSize:20,fontWeight:700,color:C.text0,margin:"0 0 4px"}}>External Systems</h1>
          <p style={{fontFamily:FONT,fontSize:13,color:C.text2,margin:0,lineHeight:1.5}}>
            A <strong style={{color:C.text0}}>System</strong> is an external platform you've connected.{" "}
            Each <strong style={{color:C.text0}}>Integration</strong> under it defines one specific data flow — what data moves, how it moves, and when.
          </p>
        </div>
        <button onClick={onAddSystem} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontWeight:700,fontSize:13,padding:"8px 18px",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:6}}>+ Add System</button>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",padding:"10px 12px",background:C.bg0,border:`1px solid ${C.border0}`,marginBottom:12,marginTop:16}}>
        <div style={{position:"relative",flex:"0 0 240px"}}><span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:C.text3,fontSize:14,pointerEvents:"none"}}>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or category…" style={{...inp,width:"100%",paddingLeft:26}}/></div>
        <div style={{width:1,height:22,background:C.border0}}/>
        <select value={plant} onChange={e=>setPlant(e.target.value)} style={{...inp,cursor:"pointer",minWidth:180}}>{PLANTS_ALL.map(p=><option key={p}>{p}</option>)}</select>
        <div style={{flex:1}}/><span style={{fontFamily:FONT,fontSize:12,color:C.text3}}>{filtered.length} of {systems.length} systems</span>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
        {chips.map(chip=>{const active=statusF===chip.key,cfg=STATUS_CONFIG[chip.key]||{};return <button key={chip.key} onClick={()=>setStatusF(chip.key)} style={{background:active?(cfg.bg||C.bg2):C.bg0,border:`1px solid ${active?(cfg.border||C.border1):C.border0}`,color:active?(cfg.color||C.text0):C.text1,fontFamily:FONT,fontSize:12,fontWeight:active?700:400,padding:"5px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>{active&&cfg.color&&<span style={{width:6,height:6,borderRadius:"50%",background:cfg.color}}/>}{chip.label}<span style={{background:active?"rgba(0,0,0,0.07)":C.bg2,border:`1px solid ${C.border0}`,color:active?(cfg.color||C.text1):C.text3,fontSize:11,padding:"0 5px",fontWeight:700}}>{statusCounts[chip.key]||0}</span></button>;})}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(400px, 1fr))",gap:8}}>
        {filtered.map(s=><SystemCard key={s.id} system={s} integrations={integrations} onClick={onViewSystem}/>)}
      </div>
      {filtered.length===0&&<div style={{background:C.bg0,border:`1px solid ${C.border0}`,padding:"44px 24px",textAlign:"center"}}><div style={{fontFamily:FONT,fontSize:14,color:C.text1,marginBottom:4}}>No systems match your filters</div><div style={{fontFamily:FONT,fontSize:12,color:C.text3}}>Try adjusting the search, plant, or status filter</div></div>}
    </div>
  );
}

// ─── DETAIL PAGE ─────────────────────────────────────────────────────────────
function SummaryCard({ system }) {
  return (
    <div style={{background:C.bg0,border:`1px solid ${C.border0}`,padding:"14px 18px"}}>
      <SectionRule label="System Details"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 28px"}}>
        {[
          {label:"System Code",  value:system.code,mono:true,color:C.blue},
          {label:"Category",     value:system.category},
          {label:"Plant",        value:system.plant},
          {label:"Error Email",  value:system.errorEmail||"Not configured",muted:!system.errorEmail},
          {label:"Description",  value:system.description||"No description",muted:!system.description,wide:true},
        ].map(row=>(
          <div key={row.label} style={row.wide?{gridColumn:"1/-1"}:{}}>
            <div style={{fontFamily:FONT,fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>{row.label}</div>
            {row.mono?<MonoText size={12} color={row.color||C.blue}>{row.value}</MonoText>:<div style={{fontFamily:FONT,fontSize:13,color:row.muted?C.text3:C.text0}}>{row.value}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
function StatCard({ label, value, color, sub, mono }) {
  return <div style={{background:C.bg1,padding:"12px 16px",borderLeft:`2px solid ${C.border0}`}}><div style={{fontFamily:FONT,fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>{label}</div><div style={{fontFamily:mono?MONO:FONT,fontSize:mono?13:20,fontWeight:mono?500:700,color:color||C.text0,lineHeight:1}}>{value}</div>{sub&&<div style={{fontFamily:FONT,fontSize:11,color:C.text3,marginTop:4}}>{sub}</div>}</div>;
}

// ─── FLOW STRIP ───────────────────────────────────────────────────────────────
// A compact visual summary of what data is actively moving through this system.
// Shows each active integration as a directional row: Source → data type → Destination
//
// Teal left border = inbound (data coming in from the external system).
// Purple left border = outbound (data going out from Innovapptive to the external system).
// Hidden entirely if there are no active or ready-to-publish integrations.
//
// Limited to 4 rows. If there are more, a "+N more" message appears at the bottom.
function FlowStrip({ system, integrations }) {
  const intgs = integrations.filter(i=>i.systemId===system.id&&i.status!=="disabled"&&i.status!=="draft");
  if(intgs.length===0) return null;
  const shown = intgs.slice(0,4);
  return (
    <div style={{marginBottom:10,border:`1px solid ${C.border0}`,background:C.bg0}}>
      <div style={{padding:"6px 14px",borderBottom:`1px solid ${C.border0}`,background:C.bg2,fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.08em"}}>Active data flows</div>
      {shown.map((intg,i)=>{
        const isIn=intg.direction==="inbound";
        const src=isIn?system.name:"Innovapptive";
        const dst=isIn?(intg.product||"Innovapptive"):system.name;
        const obj=(intg.businessObjects||[])[0]||(intg.method==="webhook"?"events":"data");
        return (
          <div key={intg.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderBottom:i<shown.length-1?`1px solid ${C.border0}`:"none",borderLeft:`3px solid ${isIn?C.teal:C.purple}`}}>
            <span style={{fontFamily:FONT,fontSize:12,fontWeight:700,color:C.text0,minWidth:120,flexShrink:0}}>{src}</span>
            <span style={{color:C.text3,fontSize:13}}>→</span>
            <span style={{fontFamily:FONT,fontSize:12,color:C.text1,flex:1}}>{obj}</span>
            <span style={{color:C.text3,fontSize:13}}>→</span>
            <span style={{fontFamily:FONT,fontSize:12,fontWeight:700,color:C.text0,minWidth:120,flexShrink:0,textAlign:"right"}}>{dst}</span>
            <div style={{marginLeft:8,display:"flex",gap:5,flexShrink:0}}>
              <MethodBadge method={intg.method}/>
              <StatusBadge status={intg.status}/>
            </div>
          </div>
        );
      })}
      {intgs.length>4&&<div style={{padding:"6px 14px",fontFamily:FONT,fontSize:11,color:C.text3}}>+{intgs.length-4} more integrations</div>}
    </div>
  );
}

// ─── INTEGRATION CARD ────────────────────────────────────────────────────────
// Represents one integration in the Integrations tab of System Detail.
//
// The plain-English summary sentence at the top (from summaryLine()) is the
// most important element — it tells a non-technical user what this integration does
// without needing to decode the direction/method/product/collection fields.
//
// Status-specific callout banners guide users to the next action:
//   Draft → "edit to complete configuration and publish"
//   Ready to publish → "edit to review and activate data flow"
//   Disabled → "no data will flow until re-enabled"
//   Failed → "check the Review Queue for details"
function IntegrationCard({ integration, systemName, onEdit, onDisable }) {
  const isDisabled=integration.status==="disabled";
  const runtimeLabel=integration.method==="polling"?"Scheduled":"Real-time";
  const lastLabel   =integration.method==="polling"?"Last fetched":"Last received";
  const summary     =summaryLine(integration,systemName);
  return (
    <div style={{background:isDisabled?C.bg1:C.bg0,border:`1px solid ${C.border0}`,borderLeft:`3px solid ${isDisabled?C.border1:integration.direction==="inbound"?C.teal:C.purple}`,padding:"12px 18px",opacity:isDisabled?0.75:1}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
        <div style={{flex:1}}>
          {/* Phase 2: summary sentence */}
          <div style={{fontFamily:FONT,fontSize:12,color:C.text2,marginBottom:6,lineHeight:1.5}}>{summary}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontFamily:FONT,fontSize:14,fontWeight:700,color:isDisabled?C.text2:C.text0,marginRight:4}}>{integration.name}</span>
            <StatusBadge status={integration.status}/>
            <DirectionBadge direction={integration.direction}/>
            <MethodBadge method={integration.method}/>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:10}}>
          <button onClick={()=>onEdit&&onEdit(integration)} style={{background:C.bg1,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:11,fontWeight:600,padding:"4px 10px",cursor:"pointer"}}>Edit</button>
          <button onClick={()=>onDisable&&onDisable(integration.id)} style={{background:isDisabled?C.greenBg:C.bg1,border:`1px solid ${isDisabled?C.greenBorder:C.border1}`,color:isDisabled?C.green:C.text1,fontFamily:FONT,fontSize:11,fontWeight:600,padding:"4px 10px",cursor:"pointer"}}>{isDisabled?"Enable":"Disable"}</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:C.bg1,border:`1px solid ${C.border0}`,padding:"8px 0"}}>
        {[
          {label:"Product",  value:integration.product||"—",  muted:!integration.product},
          {label:"Collections", value:(integration.businessObjects||[]).join(", ")||"—", muted:!(integration.businessObjects||[]).length},
          {label:"How this runs", value:runtimeLabel},
          {label:lastLabel,  value:integration.lastRunAt?new Date(integration.lastRunAt).toLocaleString():"Never", muted:!integration.lastRunAt},
        ].map((row,i,arr)=>(
          <div key={row.label} style={{padding:"0 14px",borderRight:i<arr.length-1?`1px solid ${C.border0}`:"none"}}>
            <div style={{fontFamily:FONT,fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>{row.label}</div>
            <div style={{fontFamily:FONT,fontSize:12,color:row.muted?C.text3:C.text0}}>{row.value}</div>
          </div>
        ))}
      </div>
      {integration.status==="draft"&&<div style={{marginTop:8,background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderLeft:`3px solid ${C.amber}`,padding:"6px 10px",fontFamily:FONT,fontSize:11,color:C.amber}}>Draft — edit to complete configuration and publish.</div>}
      {integration.status==="ready_to_publish"&&<div style={{marginTop:8,background:C.blueBg,border:`1px solid ${C.blueBorder}`,borderLeft:`3px solid ${C.blue}`,padding:"6px 10px",fontFamily:FONT,fontSize:11,color:C.blue}}>Ready to publish — edit to review and activate data flow.</div>}
      {isDisabled&&<div style={{marginTop:8,background:C.bg2,border:`1px solid ${C.border0}`,borderLeft:`3px solid ${C.border1}`,padding:"6px 10px",fontFamily:FONT,fontSize:11,color:C.text2}}>Disabled — no data will flow until re-enabled.</div>}
      {integration.status==="failed"&&<div style={{marginTop:8,background:C.redBg,border:`1px solid ${C.redBorder}`,borderLeft:`3px solid ${C.red}`,padding:"6px 10px",fontFamily:FONT,fontSize:11,color:C.red}}>Failed — check the Review Queue for details.</div>}
    </div>
  );
}
function IntegrationsTab({ system, integrations, onAddIntegration, onEditIntegration, onDisableIntegration }) {
  const intgs=integrations.filter(i=>i.systemId===system.id);
  if(intgs.length===0) return (
    <div style={{background:C.bg0,border:`1px solid ${C.border0}`,padding:"44px 32px",textAlign:"center"}}>
      <div style={{width:40,height:40,border:`2px solid ${C.border1}`,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontSize:20}}>⇄</div>
      <div style={{fontFamily:FONT,fontSize:14,fontWeight:700,color:C.text0,marginBottom:6}}>No integrations yet</div>
      <div style={{fontFamily:FONT,fontSize:13,color:C.text2,maxWidth:460,margin:"0 auto 6px",lineHeight:1.6}}>An Integration defines one specific data flow under this system — its direction, method, connection, and runtime.</div>
      <div style={{fontFamily:FONT,fontSize:12,color:C.text3,maxWidth:400,margin:"0 auto 20px"}}>Example: pull sensor readings from {system.name} every 15 minutes, or receive real-time alerts as they happen.</div>
      <button onClick={onAddIntegration} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontWeight:700,fontSize:13,padding:"8px 18px",cursor:"pointer"}}>+ Add Integration</button>
    </div>
  );
  return <div style={{display:"flex",flexDirection:"column",gap:8}}>{intgs.map(i=><IntegrationCard key={i.id} integration={i} systemName={system.name} onEdit={onEditIntegration} onDisable={onDisableIntegration}/>)}</div>;
}
function ActivityTab() {
  const DOT={success:C.green,warning:C.amber,info:C.blue,error:C.red};
  return <div style={{background:C.bg0,border:`1px solid ${C.border0}`}}>{ACTIVITY.map((a,idx)=><div key={a.id} style={{display:"flex",gap:12,padding:"10px 16px",borderBottom:idx<ACTIVITY.length-1?`1px solid ${C.border0}`:"none",background:idx%2===0?C.bg0:C.bg1,alignItems:"flex-start"}}><div style={{paddingTop:5,flexShrink:0}}><span style={{display:"block",width:8,height:8,borderRadius:"50%",background:DOT[a.status]||C.text3}}/></div><div style={{flex:1,fontFamily:FONT,fontSize:13,color:C.text0}}>{a.desc}</div><div style={{fontFamily:MONO,fontSize:11,color:C.text3,flexShrink:0}}>{new Date(a.timestamp).toLocaleString()}</div></div>)}</div>;
}

// ─── DLQ TAB (Review Queue) ───────────────────────────────────────────────────
// Shows dead-letter queue (DLQ) entries — records that failed to process after
// the maximum number of retries and were held here instead of being silently dropped.
//
// "Dead-letter queue" is a standard data-pipeline safety mechanism: failures are
// visible, inspectable, and recoverable. Users can view the raw record, then choose
// to replay it (re-attempt processing) or discard it (mark as resolved and remove).
//
// Replay and Discard are currently rendered but not wired (Coming Soon).
function DLQTab({ systemId, onInspect }) {
  const entries=DLQ_ENTRIES.filter(d=>d.systemId===systemId);
  return (
    <div>
      <div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderLeft:`3px solid ${C.amber}`,padding:"10px 14px",marginBottom:10,fontFamily:FONT,fontSize:12,color:C.text1,lineHeight:1.6}}>
        <strong style={{color:C.amber}}>▲ These records couldn't be processed and were held for review.</strong>{" "}Inspect each one to understand what went wrong before replaying or discarding.
      </div>
      {entries.length===0?<div style={{background:C.bg0,border:`1px solid ${C.border0}`,padding:"32px",textAlign:"center",fontFamily:FONT,fontSize:13,color:C.text3}}>No items in the review queue for this system.</div>:(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {entries.map(e=>{
            // Plain-English what happened (Phase 3)
            const ago=Math.round((Date.now()-new Date(e.timestamp).getTime())/(1000*60*60));
            const when=ago<24?`${ago}h ago`:new Date(e.timestamp).toLocaleDateString();
            return (
              <div key={e.id} style={{background:C.bg0,border:`1px solid ${C.border0}`,borderLeft:`3px solid ${C.red}`,padding:"12px 16px"}}>
                <div style={{fontFamily:FONT,fontSize:13,color:C.text0,marginBottom:6,lineHeight:1.5}}>
                  A record from <strong>{e.integrationName}</strong> failed {when} after {e.retryCount} attempts.
                </div>
                <div style={{fontFamily:FONT,fontSize:12,color:C.red,marginBottom:8,padding:"5px 8px",background:C.redBg,border:`1px solid ${C.redBorder}`}}>{e.errorMessage}</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><MonoText color={C.text3} size={11}>{e.id.toUpperCase()}</MonoText><span style={{background:C.redBg,border:`1px solid ${C.redBorder}`,padding:"1px 8px",fontFamily:FONT,fontSize:11,fontWeight:600,color:C.red}}>{e.retryCount} retries</span></div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>onInspect&&onInspect(e)} style={{background:C.bg1,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:11,fontWeight:600,padding:"4px 10px",cursor:"pointer"}}>View record detail</button>
                    <span title="Replay coming soon" style={{display:"inline-flex",alignItems:"center",background:C.bg2,border:`1px solid ${C.border0}`,fontFamily:FONT,fontSize:11,fontWeight:600,padding:"4px 10px",color:C.text3,cursor:"not-allowed"}}>Replay</span>
                    <span title="Discard coming soon" style={{display:"inline-flex",alignItems:"center",background:C.bg2,border:`1px solid ${C.border0}`,fontFamily:FONT,fontSize:11,fontWeight:600,padding:"4px 10px",color:C.text3,cursor:"not-allowed"}}>Discard</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// The Audit Log tab: a chronological record of who did what and when.
// Shows user email, timestamp, and the action taken (create, publish, edit).
// In a real product, this would be a live query from a backend audit service.
function AuditTab() {
  return (
    <div style={{background:C.bg0,border:`1px solid ${C.border0}`}}>
      <div style={{display:"grid",gridTemplateColumns:"190px 210px 1fr",padding:"7px 16px",borderBottom:`1px solid ${C.border0}`,background:C.bg2,fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.08em"}}><span>Timestamp</span><span>User</span><span>Action</span></div>
      {AUDIT_LOG.map((a,idx)=><div key={a.id} style={{display:"grid",gridTemplateColumns:"190px 210px 1fr",padding:"9px 16px",borderBottom:idx<AUDIT_LOG.length-1?`1px solid ${C.border0}`:"none",background:idx%2===0?C.bg0:C.bg1,alignItems:"center"}}><span style={{fontFamily:MONO,fontSize:11,color:C.text3}}>{new Date(a.timestamp).toLocaleString()}</span><span style={{fontFamily:MONO,fontSize:11,color:C.blue}}>{a.userEmail}</span><span style={{fontFamily:FONT,fontSize:13,color:C.text0}}>{a.action}</span></div>)}
    </div>
  );
}

// ─── DLQ INSPECT MODAL ───────────────────────────────────────────────────────
// A modal for inspecting a single failed record from the Review Queue.
//
// Content (top to bottom):
//   1. Plain-English summary: which integration failed, when, how many retries, what went wrong
//   2. Metadata strip: integration name, exact failure timestamp, retry count
//   3. "Raw event data" collapsible section (collapsed by default):
//      - The raw JSON payload that failed to process (formatted for readability)
//      - A parsed field table for quick inspection of top-level values
//
// The raw payload is hidden by default — most users need only the plain-English summary.
// Support or engineering can expand it to diagnose the exact data that caused the failure.
// "Copy payload" copies the raw JSON to clipboard for pasting into support tickets or debugging.
function DLQInspectModal({ entry, onClose }) {
  const [rawOpen,setRawOpen] = useState(false);
  if(!entry) return null;
  let parsed=null;
  try { parsed=JSON.parse(entry.payload); } catch {}
  function fmtJson(obj,d=0){const p=" ".repeat(d*2),p2=" ".repeat((d+1)*2);if(Array.isArray(obj)){if(!obj.length)return"[]";return"[\n"+obj.map(v=>p2+fmtVal(v,d+1)).join(",\n")+"\n"+p+"]";}if(obj&&typeof obj==="object"){const k=Object.keys(obj);if(!k.length)return"{}";return"{\n"+k.map(k=>p2+`"${k}": `+fmtVal(obj[k],d+1)).join(",\n")+"\n"+p+"}";}return JSON.stringify(obj);}
  function fmtVal(v,d){return(v&&typeof v==="object")?fmtJson(v,d):JSON.stringify(v);}
  const ago=Math.round((Date.now()-new Date(entry.timestamp).getTime())/(1000*60*60));
  const when=ago<24?`${ago} hours ago`:new Date(entry.timestamp).toLocaleDateString();
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.45)",zIndex:300}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:620,maxHeight:"82vh",background:C.bg0,border:`1px solid ${C.border0}`,zIndex:301,display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
        <div style={{padding:"0 20px",height:50,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.border0}`,background:C.bg1,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontFamily:FONT,fontSize:14,fontWeight:700,color:C.text0}}>Failed record detail</span>
            <MonoText color={C.text3} size={11}>{entry.id.toUpperCase()}</MonoText>
          </div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border1}`,color:C.text2,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          {/* Plain-English summary (Phase 3) */}
          <div style={{background:C.bg1,border:`1px solid ${C.border0}`,borderLeft:`3px solid ${C.red}`,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontFamily:FONT,fontSize:13,color:C.text0,marginBottom:8,lineHeight:1.6}}>
              A record from <strong>{entry.integrationName}</strong> could not be processed {when} and has been held here for review.
              {" "}It has been retried <strong>{entry.retryCount} times</strong>.
            </div>
            <div style={{fontFamily:FONT,fontSize:12,color:C.text2,marginBottom:4}}>What went wrong:</div>
            <div style={{fontFamily:FONT,fontSize:12,color:C.red,fontWeight:600}}>{entry.errorMessage}</div>
          </div>
          {/* Meta strip */}
          <div style={{display:"flex",gap:24,marginBottom:16}}>
            {[{label:"Integration",value:entry.integrationName},{label:"Failed at",value:new Date(entry.timestamp).toLocaleString(),mono:true},{label:"Retries",value:String(entry.retryCount)}].map(row=>(
              <div key={row.label}><div style={{fontFamily:FONT,fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:1}}>{row.label}</div>{row.mono?<MonoText size={12} color={C.text0}>{row.value}</MonoText>:<span style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text0}}>{row.value}</span>}</div>
            ))}
          </div>
          {/* Collapsible raw payload (Phase 3) */}
          <button onClick={()=>setRawOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:`1px solid ${C.border0}`,width:"100%",padding:"7px 10px",cursor:"pointer",fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text1,marginBottom:rawOpen?0:8}}>
            <span style={{color:C.text3,fontSize:11}}>{rawOpen?"▼":"▶"}</span> Raw event data <span style={{fontFamily:FONT,fontSize:11,color:C.text3,fontWeight:400,marginLeft:4}}>— technical payload</span>
          </button>
          {rawOpen&&(
            <>
              <div style={{background:C.bg2,border:`1px solid ${C.border0}`,borderTop:"none",padding:"12px",fontFamily:MONO,fontSize:12,color:C.text0,whiteSpace:"pre",overflowX:"auto",lineHeight:1.6,marginBottom:12}}>{parsed?fmtJson(parsed):entry.payload}</div>
              {parsed&&(
                <div style={{border:`1px solid ${C.border0}`,marginBottom:8}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 80px 1fr",padding:"5px 10px",background:C.bg2,borderBottom:`1px solid ${C.border0}`}}>{["Field","Type","Value"].map(h=><div key={h} style={{fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.07em"}}>{h}</div>)}</div>
                  {Object.entries(parsed).map(([k,v],i,arr)=>(
                    <div key={k} style={{display:"grid",gridTemplateColumns:"1fr 80px 1fr",padding:"6px 10px",borderBottom:i<arr.length-1?`1px solid ${C.border0}`:"none",background:i%2===0?C.bg0:C.bg1,alignItems:"center"}}><MonoText size={11} color={C.text0}>{k}</MonoText><span style={{fontFamily:MONO,fontSize:10,color:C.text2}}>{typeof v}</span><span style={{fontFamily:MONO,fontSize:11,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{typeof v==="object"?"{…}":String(v)}</span></div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div style={{borderTop:`1px solid ${C.border0}`,padding:"10px 20px",background:C.bg1,display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border0}`,color:C.text2,fontFamily:FONT,fontSize:13,padding:"6px 14px",cursor:"pointer"}}>Close</button>
          <div style={{flex:1}}/>
          <button onClick={()=>navigator.clipboard?.writeText(entry.payload)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:12,fontWeight:600,padding:"6px 12px",cursor:"pointer"}}>Copy payload</button>
          <span title="Replay coming soon" style={{display:"inline-flex",alignItems:"center",gap:5,background:C.bg2,border:`1px solid ${C.border0}`,fontFamily:FONT,fontSize:12,fontWeight:600,padding:"6px 14px",color:C.text3,cursor:"not-allowed"}}>Replay <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.05em"}}>COMING SOON</span></span>
          <span title="Discard coming soon" style={{display:"inline-flex",alignItems:"center",gap:5,background:C.bg2,border:`1px solid ${C.border0}`,fontFamily:FONT,fontSize:12,fontWeight:600,padding:"6px 12px",color:C.text3,cursor:"not-allowed"}}>Discard <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.05em"}}>COMING SOON</span></span>
        </div>
      </div>
    </>
  );
}

// ─── SYSTEM DETAIL PAGE ───────────────────────────────────────────────────────
// The detail view for a single external system. Accessed by clicking a System Card
// on the Systems list, or immediately after creating a new system.
//
// Layout (top to bottom):
//   - Header bar: system name, status, code, category, plant, Edit System + Add Integration buttons
//   - Incomplete setup banner (shown if system is draft with no error email)
//   - Flow Strip: visual summary of active data flows
//   - Summary card + stats grid (2-column)
//   - Connection details notice (explains connection config lives at integration level)
//   - Tab bar: Integrations | User Activity | Review Queue | Audit Log
//   - Tab content
function SystemDetailPage({ system, integrations, onBack, onAddIntegration, onUpdateSystem, onUpdateIntegration, onDisableIntegration }) {
  const [activeTab,setTab]=useState("integrations");
  const [editSysOpen,setEditSys]=useState(false);
  const [editIntg,setEditIntg]=useState(null);
  const [dlqEntry,setDlqEntry]=useState(null);
  // Phase 3: "Review Queue" tab label
  const TABS=[{key:"integrations",label:"Integrations"},{key:"activity",label:"User Activity"},{key:"dlq",label:"Review Queue"},{key:"audit",label:"Audit Log"}];
  const sysIntgCount =integrations.filter(i=>i.systemId===system.id&&i.status!=="disabled").length;
  const sysActiveCount=integrations.filter(i=>i.systemId===system.id&&i.status==="active").length;
  const isIncomplete=system.status==="draft"&&!system.errorEmail;
  return (
    <div style={{padding:"22px 32px",maxWidth:1200,margin:"0 auto"}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.blue,fontFamily:FONT,fontSize:13,fontWeight:600,cursor:"pointer",padding:"0 0 14px",display:"flex",alignItems:"center",gap:4}}>← Back to Systems</button>
      <div style={{background:C.bg0,border:`1px solid ${C.border0}`,borderTop:`3px solid ${C.blue}`,padding:"18px 22px",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><h2 style={{fontFamily:FONT,fontSize:18,fontWeight:700,color:C.text0,margin:0}}>{system.name}</h2><StatusBadge status={system.status} size="lg"/></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:0}}>
              {[{label:"System Code",value:system.code,mono:true},{label:"Category",value:system.category},{label:"Plant",value:system.plant}].map((item,i,arr)=>(
                <div key={item.label} style={{paddingRight:20,marginRight:20,borderRight:i<arr.length-1?`1px solid ${C.border0}`:"none"}}>
                  <div style={{fontFamily:FONT,fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:1}}>{item.label}</div>
                  {item.mono?<MonoText size={12} color={C.blue}>{item.value}</MonoText>:<span style={{fontFamily:FONT,fontSize:13,color:C.text1}}>{item.value}</span>}
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <button onClick={()=>setEditSys(true)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text0,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"7px 16px",cursor:"pointer"}}>Edit System</button>
            <button onClick={onAddIntegration} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"7px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>+ Add Integration</button>
          </div>
        </div>
      </div>
      {isIncomplete&&<div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderLeft:`3px solid ${C.amber}`,padding:"10px 16px",marginBottom:10,display:"flex",gap:10,alignItems:"center"}}><span style={{color:C.amber,fontSize:14,flexShrink:0}}>▲</span><div style={{flex:1}}><span style={{fontFamily:FONT,fontWeight:700,fontSize:12,color:C.amber}}>Setup incomplete — </span><span style={{fontFamily:FONT,fontSize:12,color:C.text1}}>Error notification email not configured.</span></div><button onClick={()=>setEditSys(true)} style={{background:C.amber,border:"none",color:"#fff",fontFamily:FONT,fontSize:12,fontWeight:700,padding:"5px 12px",cursor:"pointer",flexShrink:0}}>Complete Setup</button></div>}

      {/* Phase 3: Flow Strip */}
      <FlowStrip system={system} integrations={integrations}/>

      <div style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"start"}}>
          <SummaryCard system={system}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:C.border0,width:320}}>
            <StatCard label="Total Integrations" value={sysIntgCount}/>
            <StatCard label="Active" value={sysActiveCount} color={sysActiveCount>0?C.green:C.text0}/>
            <StatCard label="Items to review" value={system.errorCount} color={system.errorCount>0?C.red:C.text0} sub={system.errorCount>0?"In Review Queue":"All clear"}/>
            <StatCard label="Status" value={STATUS_CONFIG[system.status]?.label||system.status} color={STATUS_CONFIG[system.status]?.color}/>
          </div>
        </div>
      </div>
      <div style={{fontFamily:FONT,fontSize:11,color:C.text2,marginBottom:8,padding:"7px 12px",background:C.tealBg,border:`1px solid ${C.tealBorder}`,borderLeft:`3px solid ${C.teal}`}}>
        <strong style={{color:C.teal}}>Connection details live at the integration level.</strong>{" "}Each integration manages its own endpoint, authentication, and runtime settings independently.
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border0}`,background:C.bg0}}>
        {TABS.map(tab=>{const active=activeTab===tab.key;return <button key={tab.key} onClick={()=>setTab(tab.key)} style={{background:active?C.bg1:"none",border:"none",borderBottom:active?`2px solid ${C.blue}`:"2px solid transparent",borderRight:`1px solid ${active?C.border0:"transparent"}`,color:active?C.text0:C.text2,fontFamily:FONT,fontSize:13,fontWeight:active?700:400,padding:"9px 20px",cursor:"pointer",marginBottom:active?-1:0}}>{tab.label}{tab.key==="dlq"&&system.errorCount>0&&<span style={{marginLeft:6,background:C.redBg,border:`1px solid ${C.redBorder}`,fontSize:10,color:C.red,padding:"1px 6px",fontWeight:700}}>{system.errorCount}</span>}</button>;})}
      </div>
      <div style={{paddingTop:14}}>
        {activeTab==="integrations"&&<IntegrationsTab system={system} integrations={integrations} onAddIntegration={onAddIntegration} onEditIntegration={i=>setEditIntg(i)} onDisableIntegration={id=>onDisableIntegration&&onDisableIntegration(id)}/>}
        {activeTab==="activity"    &&<ActivityTab/>}
        {activeTab==="dlq"         &&<DLQTab systemId={system.id} onInspect={e=>setDlqEntry(e)}/>}
        {activeTab==="audit"       &&<AuditTab/>}
      </div>
      <EditSystemDrawer open={editSysOpen} system={system} onClose={()=>setEditSys(false)} onSave={updated=>{onUpdateSystem&&onUpdateSystem(updated);setEditSys(false);}}/>
      <EditIntegrationDrawer open={!!editIntg} integration={editIntg} system={system} onClose={()=>setEditIntg(null)} onSave={updated=>{onUpdateIntegration&&onUpdateIntegration(updated);setEditIntg(null);}}/>
      <DLQInspectModal entry={dlqEntry} onClose={()=>setDlqEntry(null)}/>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
// The top-level component that holds all application data and renders the correct page.
//
// Navigation model: there are no URLs. A "page" variable determines what's shown.
//   "systems" → Systems list page
//   "detail"  → System Detail page for the system stored in "selectedId"
// There is no browser history or back button support — this is a prototype.
//
// All data (systems, integrations, webhooks) lives here as React state arrays.
// On page refresh, everything resets to the INIT_* seed data defined at the top of this file.
// In a real product, this data would come from an API server.
//
// Mutation handlers keep state immutable — they always return new arrays, never
// modify the existing ones. This is how React detects what changed and re-renders.
function App() {
  const [systems,      setSystems]     = useState(INIT_SYSTEMS);
  const [integrations, setIntegrations]= useState(INIT_INTEGRATIONS);
  const [webhooks,     setWebhooks]    = useState(DEMO_WEBHOOKS);
  const [page,         setPage]        = useState("systems");
  const [selectedId,   setSelected]    = useState(null);
  const [sysDrawer,    setSysDrawer]   = useState(false);
  const [intDrawer,    setIntDrawer]   = useState(false);

  const selectedSystem = systems.find(s=>s.id===selectedId);

  function handleUpdateSystem(u)       { setSystems(p=>p.map(s=>s.id===u.id?u:s)); }
  function handleUpdateIntegration(u)  { setIntegrations(p=>p.map(i=>i.id===u.id?u:i)); }
  function handleDisableIntegration(id){ setIntegrations(p=>p.map(i=>i.id===id?{...i,status:i.status==="disabled"?"active":"disabled"}:i)); }
  function handleSaveIntegration(n)    { setIntegrations(p=>[...p,n]); }
  function handleAddWebhook(wh)        { setWebhooks(p=>[...p,wh]); }

  return (
    <div style={{background:C.pageBg,minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:FONT}}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <TopNav/>
      <div style={{flex:1}}>
        {page==="systems"&&<SystemsPage systems={systems} integrations={integrations} onViewSystem={id=>{setSelected(id);setPage("detail");}} onAddSystem={()=>setSysDrawer(true)}/>}
        {page==="detail"&&selectedSystem&&<SystemDetailPage system={selectedSystem} integrations={integrations} onBack={()=>{setPage("systems");setSelected(null);}} onAddIntegration={()=>setIntDrawer(true)} onUpdateSystem={handleUpdateSystem} onUpdateIntegration={handleUpdateIntegration} onDisableIntegration={handleDisableIntegration}/>}
      </div>
      <AddSystemDrawer open={sysDrawer} onClose={()=>setSysDrawer(false)} onSave={sys=>{setSystems(p=>[sys,...p]);setSelected(sys.id);setPage("detail");}}/>
      <AddIntegrationDrawer open={intDrawer} system={selectedSystem} onClose={()=>setIntDrawer(false)} onSave={handleSaveIntegration} onGoToSystem={()=>setIntDrawer(false)} webhooks={webhooks} onAddWebhook={handleAddWebhook}/>
    </div>
  );
}