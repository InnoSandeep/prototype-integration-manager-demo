const { useState, useMemo, useEffect, useRef } = React;

// ─── THEME (v2 — Figma-aligned) ───────────────────────────────────────────────
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
const PLANTS_OPTS = ["Houston Plant","Dallas Refinery","Austin Facility","Corpus Christi Terminal"];
const PLANTS_ALL  = ["All Plants",...PLANTS_OPTS];
const CATEGORIES  = ["Historian","Analytics Platform","Process Safety","Consulting Integration","ERP","IoT Platform","CMMS","Other"];
const AUTH_TYPES  = ["— Select auth type —","API Key","Basic Auth","Bearer Token","OAuth 2.0","HMAC / Signature Secret","No Authentication"];
const HTTP_METHODS = ["GET","POST"];
const TRIGGER_OPTIONS = ["Always","Manual review approval"];
const FAILURE_OPTIONS = ["Auto-retry 3x then DLQ","Mark for review","Skip and log","Block subsequent events until resolved"];
const FREQ_OPTIONS    = ["Every 5 min","Every 15 min","Every 30 min","Every 1 hour","Every 6 hours","Daily at start time"];
const INCOMING_AUTH_TYPES = ["API Key (header)","HMAC Signature","No Authentication"];


const PRODUCT_OBJECTS = {
  "iMaintenance": ["Work Order","Notification","Operation","Component","Equipment","Functional Location","Measurement Point","Work Log","Attachment","Failure Reporting"],
  "mRounds":      ["Round","Round Plan","Asset","Location","Task","Issue","Action","Assignment"],
  "mInventory":   ["Material","Plant","Storage Location","Storage Bin","Stock","Reservation","Goods Receipt","Goods Issue","Transfer Posting","Cycle Count","Label"],
  "EHS":          ["Incident","Observation","Action","Permit","Risk Assessment","Audit","JHA"],
  "Platform":     ["Transition Compound Object","External System","Audit"],
};
const PRODUCTS = Object.keys(PRODUCT_OBJECTS);

const SAMPLE_FIELDS = [
  { src:"id",                    srcType:"string",   required:true,  refLookup:false, nested:false, arrayPath:false, target:"", rowState:"unmapped" },
  { src:"timestamp",             srcType:"datetime", required:true,  refLookup:false, nested:false, arrayPath:false, target:"", rowState:"unmapped" },
  { src:"asset.id",              srcType:"string",   required:true,  refLookup:true,  nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
  { src:"asset.name",            srcType:"string",   required:false, refLookup:true,  nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
  { src:"asset.location.site",   srcType:"string",   required:false, refLookup:false, nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
  { src:"measurements[0].value", srcType:"number",   required:true,  refLookup:false, nested:false, arrayPath:true,  target:"", rowState:"unmapped" },
  { src:"measurements[0].unit",  srcType:"string",   required:false, refLookup:false, nested:false, arrayPath:true,  target:"", rowState:"unmapped" },
  { src:"severity",              srcType:"enum",     required:false, refLookup:false, nested:false, arrayPath:false, target:"", rowState:"unmapped" },
  { src:"description",           srcType:"string",   required:false, refLookup:false, nested:false, arrayPath:false, target:"", rowState:"unmapped" },
  { src:"links.workOrder.href",  srcType:"url",      required:false, refLookup:true,  nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
  { src:"metadata.source",       srcType:"string",   required:false, refLookup:false, nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
  { src:"metadata.version",      srcType:"string",   required:false, refLookup:false, nested:true,  arrayPath:false, target:"", rowState:"unmapped" },
];
const AUTO_MAP_RULES = {
  "id":"id","timestamp":"observation_time","asset.id":"asset_id","asset.name":"asset_name",
  "measurements[0].value":"value","measurements[0].unit":"unit","severity":"severity","description":"description",
};
const TARGET_FIELDS = ["— Select target —","id","observation_time","asset_id","asset_name","site","value","unit","severity","description","work_order_ref","source_system","schema_version","created_by","status"];

// ─── SEED DATA ────────────────────────────────────────────────────────────────
// Systems are lightweight identity containers — no connection/auth/test data
const INIT_SYSTEMS = [
  { id:"sys_pi",        name:"AVEVA PI System",  category:"Historian",             code:"AVEVA-PI-001", plant:"Houston Plant",           errorEmail:"ops-alerts@company.com", status:"ready",           errorCount:0, description:"OSIsoft PI System historian for real-time sensor and process data." },
  { id:"sys_augury",    name:"Augury",           category:"Analytics Platform",    code:"AUGRY-001",    plant:"Houston Plant",           errorEmail:"augury-ops@company.com", status:"ready",           errorCount:0, description:"Predictive maintenance and machine health analytics." },
  { id:"sys_seeq",      name:"SEEQ",             category:"Analytics Platform",    code:"SEEQ-001",     plant:"Dallas Refinery",         errorEmail:"seeq-ops@company.com",   status:"needs_attention", errorCount:2, description:"Advanced analytics and process data investigation platform.", errorBadge:"2 items need review" },
  { id:"sys_hexion",    name:"Hexion PSI",        category:"Process Safety",        code:"HXPSI-001",    plant:"Corpus Christi Terminal", errorEmail:"safety@company.com",     status:"ready",           errorCount:0, description:"Process safety incident management and reporting." },
  { id:"sys_accenture", name:"Accenture",         category:"Consulting Integration",code:"ACCNT-001",    plant:"Austin Facility",         errorEmail:"",                       status:"draft",           errorCount:0, description:"Enterprise integration layer for Accenture-managed data pipelines." },
];
// Integrations — no workflowAction, method:"polling" not "rest_api"
const INIT_INTEGRATIONS = [
  { id:"int_obs",    systemId:"sys_pi", name:"Observation Polling", status:"active",          direction:"inbound",  method:"polling", product:"iMaintenance", businessObject:"Observation", lastRunAt:"2025-04-14T08:30:00Z", frequency:"Every 15 min" },
  { id:"int_wo",     systemId:"sys_pi", name:"WO Dispatch",         status:"active",          direction:"outbound", method:"webhook", product:null,           businessObject:null,          lastRunAt:"2025-04-14T07:15:00Z", frequency:null },
  { id:"int_alerts", systemId:"sys_pi", name:"Alert Intake",        status:"ready_to_publish",direction:"inbound",  method:"webhook", product:"EHS",          businessObject:"Alert",       lastRunAt:null, frequency:null },
];
const DEMO_WEBHOOKS = [
  { id:"wh_001", name:"CMMS Work Order Sync", targetUrl:"https://cmms.company.com/webhooks/inno", signingSecret:"whsec_abc123", eventTypes:"work_order.created,work_order.updated" },
];
const ACTIVITY = [
  { id:"a1", timestamp:"2025-04-14T08:30:00Z", status:"success", desc:"Observation Polling executed — 14 records pulled into iMaintenance" },
  { id:"a2", timestamp:"2025-04-14T07:15:00Z", status:"success", desc:"WO Dispatch triggered — event sent to external endpoint" },
  { id:"a3", timestamp:"2025-04-13T22:01:00Z", status:"warning", desc:"Alert Intake not yet published — no data flowing" },
  { id:"a4", timestamp:"2025-04-13T09:10:00Z", status:"info",    desc:"Integration edited by admin@company.com" },
  { id:"a5", timestamp:"2025-04-10T14:22:00Z", status:"success", desc:"System created: AVEVA PI System" },
];
const DLQ_ENTRIES = [
  { id:"dlq_001", systemId:"sys_seeq", integrationName:"Trend Sync", timestamp:"2025-04-14T07:12:00Z", retryCount:3, errorMessage:"Connection timeout after 30s — host unreachable", payload:'{"asset":"Pump-12","value":98.4,"timestamp":"2025-04-14T07:11:58Z"}' },
  { id:"dlq_002", systemId:"sys_seeq", integrationName:"Trend Sync", timestamp:"2025-04-13T23:44:00Z", retryCount:3, errorMessage:"HTTP 503 — Service Unavailable",                  payload:'{"asset":"Pump-07","value":102.1,"timestamp":"2025-04-13T23:43:50Z"}' },
];
const AUDIT_LOG = [
  { id:"au1", timestamp:"2025-04-10T14:22:00Z", userEmail:"admin@company.com",  action:"System created: AVEVA PI System (AVEVA-PI-001)" },
  { id:"au2", timestamp:"2025-04-10T15:05:00Z", userEmail:"admin@company.com",  action:"Integration created: Observation Polling under AVEVA PI System" },
  { id:"au3", timestamp:"2025-04-11T09:30:00Z", userEmail:"jsmith@company.com", action:"Integration published: WO Dispatch — status changed to Active" },
];
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

// Summary sentence for integration cards (Phase 2)
function summaryLine(integration, systemName) {
  const sys = systemName || "external system";
  if (integration.status==="draft") return "Not yet active — complete configuration to start data flow.";
  if (integration.status==="disabled") return "Paused — no data is flowing.";
  const obj = integration.businessObject;
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

function blankAddSystemForm() {
  return { plant:"", name:"", category:"", code:"", description:"", errorEmail:"" };
}
function blankKV() { return [{ key:"", value:"" }]; }
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
    product:"", businessObject:"",
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
function StatusBadge({ status, size="sm" }) {
  const cfg=STATUS_CONFIG[status]||{label:status,color:C.text2,bg:C.bg2,border:C.border0};
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,background:cfg.bg,border:`1px solid ${cfg.border}`,padding:size==="lg"?"4px 10px":"2px 8px",fontFamily:FONT,fontSize:size==="lg"?12:11,fontWeight:600,color:cfg.color,whiteSpace:"nowrap"}}><span style={{width:6,height:6,borderRadius:"50%",background:cfg.color,flexShrink:0}}/>{cfg.label}</span>;
}
function DirectionBadge({ direction }) {
  const isIn=direction==="inbound";
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:isIn?C.tealBg:C.purpleBg,border:`1px solid ${isIn?C.tealBorder:C.purpleBorder}`,padding:"2px 8px",fontSize:11,fontFamily:FONT,fontWeight:600,color:isIn?C.teal:C.purple}}>{isIn?"↓ Inbound":"↑ Outbound"}</span>;
}
function MethodBadge({ method }) {
  const labels={polling:"POLLING",webhook:"WEBHOOK",file_import:"FILE IMPORT",file_export:"FILE EXPORT"};
  return <span style={{display:"inline-flex",alignItems:"center",background:C.bg2,border:`1px solid ${C.border1}`,padding:"2px 8px",fontSize:11,fontFamily:MONO,fontWeight:500,color:C.text1}}>{labels[method]||method?.toUpperCase()}</span>;
}
function MonoText({ children, color, size=12 }) {
  return <span style={{fontFamily:MONO,fontSize:size,color:color||C.blue}}>{children}</span>;
}
function SectionRule({ label }) {
  return <div style={{display:"flex",alignItems:"center",gap:10,margin:"0 0 14px"}}><span style={{fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text3,letterSpacing:"0.1em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span><div style={{flex:1,height:1,background:C.border0}}/></div>;
}
function FieldLabel({ label, required, helper, sublabel }) {
  return (
    <div style={{marginBottom:5}}>
      <div style={{display:"flex",alignItems:"baseline",gap:6}}>
        <span style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text1}}>{label}</span>
        {sublabel&&<span style={{fontFamily:FONT,fontSize:10,color:C.text3,letterSpacing:"0.04em"}}>{sublabel}</span>}
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
function InfoBox({ variant="teal", children }) {
  const cfg={teal:{bg:C.tealBg,border:C.tealBorder,accent:C.teal,icon:"ℹ"},amber:{bg:C.amberBg,border:C.amberBorder,accent:C.amber,icon:"▲"},blue:{bg:C.blueBg,border:C.blueBorder,accent:C.blue,icon:"ℹ"},green:{bg:C.greenBg,border:C.greenBorder,accent:C.green,icon:"✓"}}[variant];
  return <div style={{background:cfg.bg,border:`1px solid ${cfg.border}`,borderLeft:`3px solid ${cfg.accent}`,padding:"8px 10px",display:"flex",gap:7,alignItems:"flex-start",marginBottom:0}}><span style={{color:cfg.accent,fontSize:12,flexShrink:0,marginTop:1,fontWeight:700}}>{cfg.icon}</span><div style={{fontFamily:FONT,fontSize:12,color:C.text1,lineHeight:1.5}}>{children}</div></div>;
}
function Spinner({ size=14 }) {
  return <span style={{display:"inline-block",width:size,height:size,border:`2px solid ${C.border0}`,borderTop:`2px solid ${C.blue}`,borderRadius:"50%",animation:"imSpin 0.7s linear infinite",flexShrink:0}}><style>{`@keyframes imSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style></span>;
}

// ─── KEY-VALUE TABLE (Postman-like params/headers) ────────────────────────────
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

// ─── SELECTION CARD ───────────────────────────────────────────────────────────
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

// ─── WEBHOOK REGISTRY MODAL (Phase 1 — Outbound Webhook creation) ─────────────
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

// ─── ADD INTEGRATION DRAWER ───────────────────────────────────────────────────
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
  const fetchTimer    = useRef(null);
  const postTestTimer = useRef(null);

  const set   = (k,v) => setForm(f=>({...f,[k]:v}));
  const touch = k     => setTouched(t=>({...t,[k]:true}));

  useEffect(()=>{
    if(open){ setStep(1);setForm(blankIntegrationForm());setErrors({});setTouched({});setAdvOpen(false);setValOpen(false);setFetch("idle");setPublished(null);setWbModal(false); }
  },[open]);
  useEffect(()=>{ if(system?.errorEmail) set("advErrorEmail",system.errorEmail); },[system]);
  useEffect(()=>()=>{ clearTimeout(fetchTimer.current); clearTimeout(postTestTimer.current); },[]);
  if(!open) return null;

  const isInbound        = form.direction==="inbound";
  const isOutbound       = form.direction==="outbound";
  const isWebhook        = form.method==="webhook";
  const isPolling        = form.method==="polling";
  const isInboundWebhook = isInbound && isWebhook;
  const isOutboundWebhook= isOutbound && isWebhook;
  const showStepper      = !isOutboundWebhook;

  function validateStep1() {
    const e={};
    if(!form.name.trim()) e.name="Integration name is required";
    if(!form.direction)   e.direction="Select a direction";
    if(!form.method)      e.method="Select a method";
    if(isInboundWebhook&&!form.listenerEndpointUrl.trim()) e.listenerEndpointUrl="Listener Endpoint URL is required";
    if(isInboundWebhook&&form.listenerEndpointUrl.trim()&&!isValidUrl(form.listenerEndpointUrl.trim())) e.listenerEndpointUrl="Must be a valid URL, e.g. https://hooks.company.com/inno-listener";
    if(isPolling&&!form.baseUrl.trim()) e.baseUrl="Base URL is required";
    if(isPolling&&form.baseUrl.trim()&&!isValidUrl(form.baseUrl.trim())) e.baseUrl="Must be a valid URL";
    if(isInbound&&!form.product)        e.product="Select a product";
    if(isInbound&&!form.businessObject) e.businessObject="Select a business object";
    return e;
  }
  function handleNext() {
    setTouched({name:true,direction:true,method:true,listenerEndpointUrl:true,baseUrl:true,product:true,businessObject:true});
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

  const readiness=[
    {label:"Integration name set", ok:!!form.name.trim()},
    {label:"Direction and method set", ok:!!form.direction&&!!form.method},
    {label:"Connection configured", ok:isPolling?isValidUrl(form.baseUrl):isInboundWebhook?isValidUrl(form.listenerEndpointUrl):isOutboundWebhook?!!form.selectedWebhookId:true},
    {label:"Product and object set", ok:isOutbound?true:!!form.product&&!!form.businessObject},
    {label:"Required mappings complete", ok:isPolling?unmappedRequired===0:true},
    {label:"Runtime settings valid", ok:isPolling?!!form.frequency:true},
  ];

  function handleSave(publish) {
    const selectedWh = webhooks.find(w=>w.id===form.selectedWebhookId);
    const newInt={
      id:genId("int"), systemId:system?.id, name:form.name, direction:form.direction, method:form.method,
      product:isInbound?form.product:null, businessObject:isInbound?form.businessObject:null,
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
              ...(published.product?[{label:"Product",value:published.product},{label:"Object",value:published.businessObject}]:[]),
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

        <div style={{flex:1,overflowY:"auto",padding:"22px 22px 8px"}}>
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

              {/* Product + Business Object — inbound only */}
              {form.method&&isInbound&&(
                <div style={{marginBottom:22}}>
                  <SectionRule label="Product & Object"/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 14px"}}>
                    <div>
                      <FieldLabel label="Product" required/>
                      <FieldSelect value={form.product} onChange={v=>{set("product",v);set("businessObject","");touch("product");}} options={PRODUCTS} placeholder="— Select product —" error={touched.product&&errors.product}/>
                      <FieldError msg={touched.product&&errors.product}/>
                    </div>
                    <div>
                      <FieldLabel label="Business Object" required/>
                      <FieldSelect value={form.businessObject} onChange={v=>{set("businessObject",v);touch("businessObject");}} options={form.product?PRODUCT_OBJECTS[form.product]:[]} placeholder={form.product?"— Select object —":"Select product first"} disabled={!form.product} error={touched.businessObject&&errors.businessObject}/>
                      <FieldError msg={touched.businessObject&&errors.businessObject}/>
                    </div>
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

                  {/* Data Mapping */}
                  <div style={{marginBottom:20}}>
                    <SectionRule label="Data Mapping"/>
                    <div style={{background:C.bg1,border:`1px solid ${C.border0}`,padding:"14px 14px 10px",marginBottom:12}}>
                      <div style={{fontFamily:FONT,fontSize:11,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10}}>Sample source</div>
                      <div style={{display:"flex",gap:0,marginBottom:12}}>
                        {[{k:"pull",label:"Pull from endpoint"},{k:"paste",label:"Paste JSON"}].map(tab=>(
                          <button key={tab.k} onClick={()=>set("sampleMode",tab.k)} style={{flex:1,padding:"6px 10px",background:form.sampleMode===tab.k?C.bg0:"transparent",border:`1px solid ${C.border0}`,borderBottom:form.sampleMode===tab.k?`2px solid ${C.blue}`:"1px solid transparent",fontFamily:FONT,fontSize:12,fontWeight:form.sampleMode===tab.k?700:400,color:form.sampleMode===tab.k?C.blue:C.text2,cursor:"pointer"}}>{tab.label}</button>
                        ))}
                      </div>
                      {form.sampleMode==="pull"&&(
                        <div>
                          {form.httpMethod==="POST"&&form.postTestState==="success"?(
                            <InfoBox variant="green">Sample already received from the POST test in Step 1. The mapping table below is pre-populated — you can proceed directly.</InfoBox>
                          ):(
                            <>
                              <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:C.tealBg,border:`1px solid ${C.tealBorder}`}}>
                                <span style={{color:C.teal,fontSize:11}}>ℹ</span>
                                <span style={{fontFamily:FONT,fontSize:11,color:C.teal}}>Pulling from: <MonoText size={11} color={C.teal}>{form.baseUrl||"(Base URL from Step 1)"}</MonoText></span>
                              </div>
                              <button onClick={handleFetchSample} disabled={fetchState==="loading"||!form.baseUrl} style={{background:fetchState==="done"?C.greenBg:C.bg0,border:`1px solid ${fetchState==="done"?C.greenBorder:C.border1}`,color:fetchState==="done"?C.green:(!form.baseUrl?C.text3:C.blue),fontFamily:FONT,fontSize:12,fontWeight:600,padding:"6px 14px",cursor:(fetchState==="loading"||!form.baseUrl)?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6,opacity:!form.baseUrl?0.5:1}}>
                                {fetchState==="loading"?<><Spinner size={12}/><span>Pulling sample…</span></>:fetchState==="done"?"✓ Sample pulled — re-pull":"▶ Test call / pull sample"}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {form.sampleMode==="paste"&&(
                        <div>
                          <FieldLabel label="Paste JSON sample" helper="One representative record from the external system"/>
                          <FieldTextarea value={form.sampleJson} onChange={v=>{set("sampleJson",v);set("sampleFetched",!!v.trim());if(v.trim())set("schemaSummary",{recordsReturned:1,fieldsDetected:SAMPLE_FIELDS.length,nestedObjects:4,arraysDetected:1,referenceLikeFields:2,pulledAt:new Date().toISOString()});}} placeholder={'{\n  "id": "OBS-1042",\n  ...\n}'} rows={5} mono/>
                        </div>
                      )}
                    </div>
                    {form.schemaSummary&&(
                      <div style={{background:C.bg1,border:`1px solid ${C.border0}`,borderLeft:`3px solid ${C.green}`,padding:"10px 14px",marginBottom:12}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontFamily:FONT,fontSize:11,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.09em"}}>Schema summary</span>
                          <span style={{fontFamily:MONO,fontSize:10,color:C.text3}}>Pulled {new Date(form.schemaSummary.pulledAt).toLocaleTimeString()}</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"4px 12px"}}>
                          {[{label:"Fields",val:form.schemaSummary.fieldsDetected},{label:"Nested",val:form.schemaSummary.nestedObjects},{label:"Arrays",val:form.schemaSummary.arraysDetected},{label:"Ref-like",val:form.schemaSummary.referenceLikeFields}].map(s=>(
                            <div key={s.label} style={{display:"flex",alignItems:"baseline",gap:4}}><span style={{fontFamily:FONT,fontSize:16,fontWeight:700,color:C.text0}}>{s.val}</span><span style={{fontFamily:FONT,fontSize:11,color:C.text2}}>{s.label}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(fetchState==="done"||form.sampleJson.trim())&&(
                      <>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                          <button onClick={handleAutoMap} style={{background:C.blueBg,border:`1px solid ${C.blueBorder}`,color:C.blue,fontFamily:FONT,fontSize:12,fontWeight:600,padding:"5px 12px",cursor:"pointer"}}>⚡ Auto Map</button>
                          <button onClick={handleValidate} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:12,fontWeight:600,padding:"5px 12px",cursor:"pointer"}}>✓ Validate</button>
                          {form.validationResult&&<span style={{fontFamily:MONO,fontSize:10,color:C.text3}}>Validated {new Date(form.validationResult.ranAt).toLocaleTimeString()}</span>}
                          <div style={{flex:1}}/>
                          {form.fieldMappings.filter(m=>m.target).length===0?<span style={{fontFamily:FONT,fontSize:11,color:C.text3}}>No fields mapped yet</span>:<span style={{fontFamily:FONT,fontSize:11,color:C.text2}}>{form.fieldMappings.filter(m=>m.target).length} of {form.fieldMappings.length} mapped</span>}
                        </div>
                        {unmappedRequired>0&&<div style={{marginBottom:8}}><InfoBox variant="amber">{unmappedRequired} required field{unmappedRequired>1?"s are":" is"} not yet mapped.</InfoBox></div>}
                        {dupTargets.length>0&&<div style={{marginBottom:8}}><InfoBox variant="amber">Duplicate target: <strong>{dupTargets.join(", ")}</strong></InfoBox></div>}
                        <div style={{border:`1px solid ${C.border0}`,marginBottom:10}}>
                          <div style={{display:"grid",gridTemplateColumns:"minmax(140px,1.4fr) 62px 76px 86px minmax(130px,1fr)",background:C.bg2,padding:"6px 10px",borderBottom:`1px solid ${C.border0}`}}>
                            {["External Field","Type","Required","Status","Innovapptive Field"].map(h=><div key={h} style={{fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.07em"}}>{h}</div>)}
                          </div>
                          {form.fieldMappings.map((m,i)=>{
                            const rowBg=m.rowState==="auto-mapped"?"#F5FAF7":(!m.target&&m.required)?"#FFF8F8":i%2===0?C.bg0:C.bg1;
                            const stateLabel={"auto-mapped":{label:"Auto-mapped",color:C.green,bg:C.greenBg,border:C.greenBorder},"manual":{label:"Manual",color:C.blue,bg:C.blueBg,border:C.blueBorder},"ref-lookup":{label:"Ref lookup",color:C.amber,bg:C.amberBg,border:C.amberBorder},"needs-review":{label:"Needs review",color:C.red,bg:C.redBg,border:C.redBorder},"unmapped":{label:"—",color:C.text3,bg:"transparent",border:"transparent"}}[m.rowState]||{label:"—",color:C.text3,bg:"transparent",border:"transparent"};
                            return (
                              <div key={m.src} style={{display:"grid",gridTemplateColumns:"minmax(140px,1.4fr) 62px 76px 86px minmax(130px,1fr)",padding:"6px 10px",borderBottom:i<form.fieldMappings.length-1?`1px solid ${C.border0}`:"none",background:rowBg,alignItems:"center"}}>
                                <div style={{display:"flex",alignItems:"center",gap:4,overflow:"hidden"}}>
                                  <MonoText size={11} color={C.text0}>{m.src}</MonoText>
                                  {m.nested&&<span style={{fontSize:9,color:C.text3,background:C.bg2,border:`1px solid ${C.border0}`,padding:"0 3px"}}>nested</span>}
                                  {m.arrayPath&&<span style={{fontSize:9,color:C.purple,background:C.purpleBg,border:`1px solid ${C.purpleBorder}`,padding:"0 3px"}}>array</span>}
                                  {m.refLookup&&<span style={{marginLeft:2,color:C.amber,fontSize:12}}>⚠</span>}
                                </div>
                                <span style={{fontFamily:MONO,fontSize:10,color:C.text2}}>{m.srcType}</span>
                                <span style={{fontFamily:FONT,fontSize:10,fontWeight:700,color:m.required?C.red:C.text3}}>{m.required?"Required":"Optional"}</span>
                                <span style={{fontFamily:FONT,fontSize:10,fontWeight:600,color:stateLabel.color,background:stateLabel.bg,border:`1px solid ${stateLabel.border}`,padding:"1px 5px",whiteSpace:"nowrap"}}>{stateLabel.label}</span>
                                <select value={m.target} onChange={e=>updateMapping(i,"target",e.target.value)} style={{fontFamily:FONT,fontSize:12,background:C.bg0,border:`1px solid ${(!m.target&&m.required)?C.redBorder:dupTargets.includes(m.target)?C.amberBorder:C.border1}`,color:m.target?C.text0:C.text3,padding:"4px 6px",outline:"none",cursor:"pointer",width:"100%"}}>
                                  <option value="">— Select target —</option>
                                  {TARGET_FIELDS.filter(t=>t!=="— Select target —").map(t=><option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                        <button onClick={()=>setValOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:`1px solid ${C.border0}`,width:"100%",padding:"7px 10px",cursor:"pointer",fontFamily:FONT,fontSize:12,fontWeight:600,color:C.text1,marginBottom:valOpen?0:14}}>
                          <span style={{color:C.text3,fontSize:11}}>{valOpen?"▼":"▶"}</span> Validation summary
                          {form.validationResult?(form.validationResult.unmappedRequired>0||form.validationResult.duplicateTargets>0?<span style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,fontSize:11,color:C.amber,padding:"1px 7px",fontWeight:700,marginLeft:"auto"}}>Issues found</span>:<span style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,fontSize:11,color:C.green,padding:"1px 7px",fontWeight:700,marginLeft:"auto"}}>Valid</span>):<span style={{fontFamily:FONT,fontSize:11,color:C.text3,fontWeight:400,marginLeft:"auto"}}>Run Validate first</span>}
                        </button>
                        {valOpen&&(
                          <div style={{background:C.bg1,border:`1px solid ${C.border0}`,borderTop:"none",padding:"10px 12px",marginBottom:14}}>
                            {form.validationResult?[
                              {label:"Required fields mapped",ok:form.validationResult.unmappedRequired===0,detail:`${form.validationResult.requiredMapped} / ${form.validationResult.requiredTotal}`},
                              {label:"Optional fields skipped",ok:true,detail:`${form.validationResult.optionalSkipped} unmapped`},
                              {label:"Type conflicts",ok:form.validationResult.typeConflicts===0,detail:form.validationResult.typeConflicts>0?`${form.validationResult.typeConflicts} conflict(s)`:"None"},
                              {label:"Duplicate targets",ok:form.validationResult.duplicateTargets===0,detail:form.validationResult.duplicateTargets>0?`${form.validationResult.duplicateTargets} duplicate(s)`:"None"},
                              {label:"Reference lookups",ok:true,detail:form.validationResult.refLookups>0?`${form.validationResult.refLookups} field(s) — review manually`:"None"},
                            ].map(row=>(
                              <div key={row.label} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.border0}`}}>
                                <span style={{color:row.ok?C.green:C.amber,fontSize:13,fontWeight:700,width:16,flexShrink:0}}>{row.ok?"✓":"!"}</span>
                                <span style={{fontFamily:FONT,fontSize:12,color:C.text0,flex:1}}>{row.label}</span>
                                <span style={{fontFamily:FONT,fontSize:11,color:row.ok?C.text2:C.amber,fontWeight:row.ok?400:600}}>{row.detail}</span>
                              </div>
                            )):<div style={{fontFamily:FONT,fontSize:12,color:C.text3,padding:"8px 0"}}>Click Validate above to check mappings.</div>}
                          </div>
                        )}
                      </>
                    )}
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
                      <div><FieldLabel label="Start Time" helper="Local time"/><FieldInput value={form.startTime} onChange={v=>set("startTime",v)} placeholder="06:00" mono/></div>
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
                    ...(isInbound?[{label:"Product",value:form.product||"—"},{label:"Object",value:form.businessObject||"—"}]:[]),
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
          {step===2&&(
            <>
              <button onClick={()=>setStep(1)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"7px 14px",cursor:"pointer"}}>← Back</button>
              <button onClick={()=>handleSave(false)} style={{background:C.bg0,border:`1px solid ${C.border1}`,color:C.text1,fontFamily:FONT,fontSize:13,fontWeight:600,padding:"7px 16px",cursor:"pointer"}}>Save as Draft</button>
              <button onClick={()=>handleSave(true)} style={{background:C.blue,border:`1px solid ${C.blueHover}`,color:"#fff",fontFamily:FONT,fontSize:13,fontWeight:700,padding:"7px 18px",cursor:"pointer"}}>Publish Integration</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── ADD SYSTEM DRAWER — simplified ──────────────────────────────────────────
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
function EditIntegrationDrawer({ open, integration, system, onClose, onSave }) {
  const [form,setForm]=useState(null); const [errors,setErrors]=useState({}); const [touched,setTouched]=useState({}); const [saved,setSaved]=useState(false);
  useEffect(()=>{if(open&&integration){setForm({name:integration.name,product:integration.product||"",businessObject:integration.businessObject||"",triggerOn:"Always",failureBehavior:"Auto-retry 3x then DLQ",frequency:integration.frequency||"Every 15 min",startTime:"06:00"});setErrors({});setTouched({});setSaved(false);}},[open,integration]);
  if(!open||!form||!integration) return null;
  const set=(k,v)=>setForm(f=>({...f,[k]:v})); const touch=k=>setTouched(t=>({...t,[k]:true}));
  const isInbound=integration.direction==="inbound";
  function validate(){const e={};if(!form.name.trim())e.name="Required";if(isInbound&&!form.product)e.product="Required";if(isInbound&&!form.businessObject)e.businessObject="Required";return e;}
  function handleSave(){setTouched({name:true,product:true,businessObject:true});const e=validate();setErrors(e);if(Object.keys(e).length>0)return;onSave({...integration,name:form.name.trim(),product:isInbound?form.product:null,businessObject:isInbound?form.businessObject:null,frequency:integration.method==="polling"?form.frequency:null});setSaved(true);setTimeout(onClose,900);}
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
          {isInbound&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 14px",marginBottom:14}}>
            <div><FieldLabel label="Product" required/><FieldSelect value={form.product} onChange={v=>{set("product",v);set("businessObject","");touch("product");}} options={PRODUCTS} placeholder="— Select product —" error={touched.product&&errors.product}/><FieldError msg={touched.product&&errors.product}/></div>
            <div><FieldLabel label="Business Object" required/><FieldSelect value={form.businessObject} onChange={v=>{set("businessObject",v);touch("businessObject");}} options={form.product?PRODUCT_OBJECTS[form.product]:[]} placeholder={form.product?"— Select object —":"Select product first"} disabled={!form.product} error={touched.businessObject&&errors.businessObject}/><FieldError msg={touched.businessObject&&errors.businessObject}/></div>
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

// ─── NAV ──────────────────────────────────────────────────────────────────────
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

// ─── SYSTEMS PAGE — Phase 2 copy + demo-readiness ────────────────────────────
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

// ─── FLOW STRIP (Phase 3) ─────────────────────────────────────────────────────
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
        const obj=intg.businessObject||(intg.method==="webhook"?"events":"data");
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

// ─── INTEGRATION CARD — Phase 2 summary sentence ─────────────────────────────
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
          {label:"Object",   value:integration.businessObject||"—", muted:!integration.businessObject},
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

// ─── DLQ TAB — Phase 3: Review Queue ─────────────────────────────────────────
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
function AuditTab() {
  return (
    <div style={{background:C.bg0,border:`1px solid ${C.border0}`}}>
      <div style={{display:"grid",gridTemplateColumns:"190px 210px 1fr",padding:"7px 16px",borderBottom:`1px solid ${C.border0}`,background:C.bg2,fontFamily:FONT,fontSize:10,fontWeight:700,color:C.text2,textTransform:"uppercase",letterSpacing:"0.08em"}}><span>Timestamp</span><span>User</span><span>Action</span></div>
      {AUDIT_LOG.map((a,idx)=><div key={a.id} style={{display:"grid",gridTemplateColumns:"190px 210px 1fr",padding:"9px 16px",borderBottom:idx<AUDIT_LOG.length-1?`1px solid ${C.border0}`:"none",background:idx%2===0?C.bg0:C.bg1,alignItems:"center"}}><span style={{fontFamily:MONO,fontSize:11,color:C.text3}}>{new Date(a.timestamp).toLocaleString()}</span><span style={{fontFamily:MONO,fontSize:11,color:C.blue}}>{a.userEmail}</span><span style={{fontFamily:FONT,fontSize:13,color:C.text0}}>{a.action}</span></div>)}
    </div>
  );
}

// ─── DLQ INSPECT MODAL — Phase 3: plain-English summary + collapsible raw ────
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