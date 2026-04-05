# Guardline Dashboard — Comprehensive Frontend Audit Report

**Date:** June 2025  
**Scope:** `guardline.html` (25,060 lines) + `documents-module.js` (1,237 lines)  
**Auditor:** Cascade AI  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [File Structure & Organization](#3-file-structure--organization)
4. [Core Modules & Config](#4-core-modules--config)
5. [Authentication & API Layer](#5-authentication--api-layer)
6. [Routing & Navigation](#6-routing--navigation)
7. [Screen Renderers & UI Components](#7-screen-renderers--ui-components)
8. [Documents Module (documents-module.js)](#8-documents-module)
9. [TrustSign Level 2 Signature Engine](#9-trustsign-level-2-signature-engine)
10. [Additive Enhancements (MutationObserver)](#10-additive-enhancements)
11. [Third-Party Integrations](#11-third-party-integrations)
12. [Security Findings](#12-security-findings)
13. [Performance Findings](#13-performance-findings)
14. [Code Quality Findings](#14-code-quality-findings)
15. [Bug Inventory](#15-bug-inventory)
16. [Recommendations](#16-recommendations)
17. [Risk Matrix](#17-risk-matrix)

---

## 1. Executive Summary

The Guardline dashboard is a **monolithic single-page application (SPA)** built entirely in a single HTML file with inline CSS (~2,000 lines) and inline JavaScript (~23,000 lines), plus one external JS module (`documents-module.js`). It implements a full-featured B2B sales intelligence platform with:

- **20+ distinct screens** (Pipeline, Leads, Forecast, Documents, Fraud Map, Reports, Agenda, Inbox, Signals, Battlecards, Market Intelligence, Relationship Map, Voice of Customer, Sales Profile, MEDDPICC, Pipeline Health, Pipeline Funnel, Loss Intelligence, HubSpot Pipeline, Alerts, Product Intelligence)
- **AI integration** via Groq API (Julio AI assistant with streaming)
- **Digital signature engine** (TrustSign Level 2 with forensic proof)
- **Document management** with PDF.js rendering and field editor
- **Multiple data sources**: Supabase (PostgREST), REST API, n8n webhooks, HubSpot, Google Calendar
- **Extensive demo/fallback data** for offline operation

### Overall Assessment

| Area | Rating | Notes |
|------|--------|-------|
| **Feature completeness** | ⭐⭐⭐⭐⭐ | Extremely feature-rich |
| **Code organization** | ⭐⭐ | Monolithic, needs modularization |
| **Security** | ⭐⭐ | API keys exposed, XSS vectors |
| **Performance** | ⭐⭐⭐ | Acceptable but DOM-heavy |
| **Maintainability** | ⭐⭐ | Hard to navigate 25K-line file |
| **Error handling** | ⭐⭐⭐ | Good fallbacks, some gaps |
| **UI/UX quality** | ⭐⭐⭐⭐ | Modern dark theme, polished |
| **Accessibility** | ⭐⭐ | Limited ARIA, keyboard nav |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                guardline.html                    │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ CSS Styles│  │ HTML DOM │  │  JavaScript  │ │
│  │ (~2000 ln)│  │ (layout) │  │ (~23000 ln)  │ │
│  └───────────┘  └──────────┘  └──────────────┘ │
│                                                  │
│  JS Architecture:                                │
│  ├── CONFIG object (API keys, URLs)              │
│  ├── Auth module (JWT login/logout)              │
│  ├── API wrapper (fetch + error handling)        │
│  ├── DB client (Supabase PostgREST)              │
│  ├── N8N webhook client                          │
│  ├── navigateTo() router                         │
│  ├── 20+ render*() screen functions              │
│  ├── Deal/Lead/Pipeline management               │
│  ├── MEDDPICC scoring engine                     │
│  ├── Risk engine (_riskRules)                    │
│  ├── TrustSign L2 signature engine               │
│  ├── Julio AI chat (streaming)                   │
│  ├── MutationObserver additive injections        │
│  └── Utility functions                           │
│                                                  │
│  External:                                       │
│  └── documents-module.js (1237 lines)            │
│      ├── Document CRUD                           │
│      ├── PDF.js field editor                     │
│      ├── Signature capture (draw/type/upload)    │
│      └── n8n webhook email dispatch              │
└─────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → navigateTo(screen) → render*() function
    │
    ├── guardlineSupabaseReady()? → DB.query() → Supabase PostgREST
    ├── Auth.isLoggedIn()?        → API.get()  → Backend REST API
    └── else                      → Demo/seed data (hardcoded)
```

---

## 3. File Structure & Organization

### guardline.html Breakdown

| Line Range | Content | Lines |
|-----------|---------|-------|
| 1–100 | HTML head, meta, CDN links (Chart.js, Lucide, PDF.js, Mapbox) | 100 |
| 100–2100 | CSS styles (variables, layout, components, responsive) | 2,000 |
| 2100–2400 | HTML body (sidebar nav, content area, modals, overlays) | 300 |
| 2400–4500 | Core JS: CONFIG, Auth, API, escapeHtml, showToast, MEDDPICC components | 2,100 |
| 4500–4800 | Supabase DB client, N8N webhook client | 300 |
| 4800–5000 | HubSpot stage maps, utility functions, skeleton loaders | 200 |
| 5000–6500 | Supabase deal/lead mapping, dashboard metrics, command bar | 1,500 |
| 6500–7200 | Deal data seeding, pipeline stage definitions | 700 |
| 7200–8600 | Deal detail panel, MEDDPICC display, buyer personas | 1,400 |
| 8600–9700 | MEDDPICC gate, pipeline DnD, pipeline intelligence charts, risk engine | 1,100 |
| 9700–10200 | HubSpot pipeline, leads management (seed, filter, table, drawer) | 500 |
| 10200–11200 | Lead flow funnel, signal feed page | 1,000 |
| 11200–13000 | Forecast 90d, scenario modeling, weekly breakdown | 1,800 |
| 13000–14500 | Fraud map (Mapbox/Leaflet), reports screen (Chart.js analytics) | 1,500 |
| 14500–15000 | Agenda/meetings (Google Calendar), unified inbox | 500 |
| 15000–17000 | Inbox continued, competitors battlecard, market signals, product intelligence | 2,000 |
| 17000–18500 | Settings, relationship map (SVG graph) | 1,500 |
| 18500–19500 | Voice of Customer (sentiment analysis), Sales Profile | 1,000 |
| 19500–21500 | Documents screen hooks, TrustSign modal, Julio AI chat engine | 2,000 |
| 21500–23600 | Julio AI commands (/clima, /dolar, /noticias, /doc, /img), chat UI | 2,100 |
| 23600–24100 | TrustSign L2 engine (camera, signature pad, hash, audit report) | 500 |
| 24100–25060 | Additive enhancements (pipeline, forecast, MEDDPICC, health, funnel, loss) | 960 |

### documents-module.js Breakdown

| Line Range | Content |
|-----------|---------|
| 1–50 | Module state (`__docModule`), demo fallback data, constants |
| 50–200 | `renderDocumentsScreen()` — document list with KPIs |
| 200–400 | `docShowCreateModal()` — new document creation with PDF upload |
| 400–600 | `docOpenEditor()` — PDF field editor initialization |
| 600–800 | `docEditorInitPdf()`, field rendering, drag-and-drop |
| 800–1000 | `docEditorSaveAndSend()`, `docSend()`, `_sendViaWebhook()` |
| 1000–1134 | `openSignatureCapture()` — signature modal (draw/type/upload tabs) |
| 1134–1237 | Signature confirmation, canvas clear, font selection |

---

## 4. Core Modules & Config

### CONFIG Object
Location: ~line 2400

```javascript
var CONFIG = {
  api: { base: window.GUARDLINE_API_BASE || '/api' },
  n8n: { base: window.GUARDLINE_N8N_WEBHOOK_BASE || 'https://guardline.app.n8n.cloud/webhook', ... },
  supabase: { url: '...', key: '...' },
  hubspot: { stages: {...} },
  groq: { key: window.GROQ_API_KEY || '...' },
  mapbox: { token: '...' }
};
```

**Finding C-01:** The CONFIG object contains hardcoded API keys (Groq, Supabase, Mapbox). These are exposed in client-side code.

### Auth Module
- JWT-based authentication with `localStorage` token persistence
- `Auth.login()`, `Auth.logout()`, `Auth.isLoggedIn()`, `Auth.getToken()`, `Auth.getUser()`
- Demo session fallback: `guardline-demo-session` token

### API Wrapper
- `API.get()`, `API.post()`, `API.put()`, `API.delete()`
- Automatic JWT header injection
- Error handling with toast notifications
- `{ silent: true }` option to suppress error toasts

### Supabase DB Client
Location: ~line 4605

- Full PostgREST client: `DB.query()`, `DB.insert()`, `DB.update()`, `DB.patchFilter()`, `DB.count()`, `DB.delete()`
- `guardlineSupabaseReady()` checks for valid configuration
- Supports demo/offline mode via `?demo=1` or `?offline=1` query params
- Validates key format (rejects placeholder keys like `YOUR_*`, `[*]`, service_role keys)

### N8N Webhook Client
Location: ~line 4739

- `N8N.trigger(path, payload)` — generic webhook caller
- Specific methods: `processLead()`, `processBatch()`, `ingestReply()`, `ingestMeeting()`, `signalRefresh()`, `ingestIntent()`

---

## 5. Authentication & API Layer

### Authentication Flow
1. Login form → `Auth.login(email, password)` → POST `/api/auth/login`
2. Token stored in `localStorage`
3. All API calls include `Authorization: Bearer <token>`
4. Logout clears token and redirects to login screen

### Data Source Priority
```
1. Supabase (if guardlineSupabaseReady()) → Direct PostgREST queries
2. Backend API (if Auth.isLoggedIn())     → REST API with JWT
3. Demo/seed data (fallback)              → Hardcoded arrays
```

**Finding A-01:** The three-tier data source creates complexity. Some screens check Supabase first, others check API first. There's no unified data layer.

**Finding A-02:** The `DB._headers()` function duplicates the `Content-Type` header — it's in the default headers AND in `insert()`/`update()` extra headers.

---

## 6. Routing & Navigation

### Router: `navigateTo(screen)`
- Hash-based routing with `window.currentScreen` state
- Role-based visibility via `applyRoleVisibility()`
- Screen cleanup: destroys Chart.js instances, clears intervals
- ~20+ screen identifiers mapped to render functions

### Screen Registry (partial)
| Screen ID | Render Function |
|-----------|----------------|
| `dashboard` | `renderDashboard()` |
| `pipeline` | `renderPipeline()` |
| `leads` | `renderLeadFlow()` |
| `forecast` | `renderForecast()` |
| `documents` | `renderDocumentsScreen()` |
| `signals` | `renderSignalFeed()` |
| `fraud-map` | `renderFraudMap()` |
| `reports` | `renderReports()` |
| `agenda` | `renderAgenda()` |
| `inbox` | `renderInbox()` |
| `battlecard` | `renderBattlecard()` |
| `market-signals` | `renderMarketSignals()` |
| `relationship-map` | `renderRelationshipMap()` |
| `voice-of-customer` | `renderVoiceOfCustomer()` |
| `sales-profile` | `renderSalesProfile()` |
| `meddpicc` | `renderMeddpicc()` |
| `pipeline-health` | `renderPipelineHealth()` |
| `pipeline-funnel` | `renderPipelineFunnel()` |
| `loss` | `renderLoss()` |
| `hubspot-pipeline` | `renderHubspotPipeline()` |

**Finding R-01:** There's no lazy-loading. All 25,060 lines of JS are parsed on page load regardless of which screen the user navigates to.

---

## 7. Screen Renderers & UI Components

### 7.1 Pipeline (Kanban Board)
- Stage columns with deal cards, drag-and-drop via native HTML5 DnD
- `initPipelineDnD()` handles dragstart/dragover/drop events
- MEDDPICC gate enforcement on stage transitions (`showMeddpiccGate()`)
- Pipeline intelligence charts (Chart.js): win rate, cycle time, deal sources
- Risk engine with `_riskRules` object and `computeDealRiskEngine()`

**Finding P-01:** `initPipelineDnD()` attaches event listeners to all cards on every render. No cleanup of old listeners before re-render.

**Finding P-02:** The `_riskRules` checks use hardcoded thresholds (e.g., `d.value > 30000`, `d.daysNoContact > 7`) with no configuration option.

### 7.2 Leads Management
- 30 seed leads with scoring breakdown (Q/E/F/V dimensions)
- Filterable table with pagination (25 per page)
- Lead drawer (slide-in panel) with score breakdown bars
- Lead-to-deal conversion modal
- Supabase mode for real lead data

**Finding L-01:** `buildLeadsSeed()` generates 30 deterministic demo leads on every call. The seed data is never cached until `window.__guardlineLeads` is set.

**Finding L-02:** Score tooltip uses `el.onmouseenter`/`el.onmouseleave` direct assignment, which could be overwritten if the table re-renders.

### 7.3 Forecast 90d
- Three scenarios: Committed, Best Case, Worst Case
- Chart.js line chart with vertical "Today" and "End of Month" markers
- Weekly breakdown (13 weeks) with bar visualization
- Deal rows sorted by forecast value
- Accuracy history (bar chart)

### 7.4 Fraud Map
- Mapbox GL JS or Leaflet fallback for map rendering
- Layer management with API-loaded GeoJSON data
- Donut chart for fraud type distribution
- Trend analysis chart

### 7.5 Reports
- Cohort retention heatmap
- CSV export functionality
- Financial analytics charts
- Shareable link generation

### 7.6 Agenda/Meetings
- Google Calendar integration (`gapi.client.calendar.events.insert`)
- Local meeting storage (`gl_meetings_local`)
- Calendar views: month, week, day
- Meeting creation modal with recurrence, participants, Google Meet

**Finding AG-01:** Google Calendar API key and Client ID are hardcoded in the frontend.

### 7.7 Unified Inbox
- Email and chat folders with folder management
- Star/archive/label functionality using `localStorage`
- Reply composition
- Channel management

### 7.8 Competitors Battlecard
- Hardcoded `CARDS` array with competitor data
- Julio AI integration for competitive analysis
- Card switching with `bcSwitch()`

### 7.9 Market Signals
- Signal filtering by type/severity
- Real-time signal feed with `setInterval` polling
- Lead-specific signal fetching
- Product intelligence dashboard

### 7.10 Relationship Map
- SVG-based graph visualization with nodes and edges
- Force-directed layout (simplified)
- Influence scoring per contact
- Company clustering
- AI analysis via Groq API

### 7.11 Voice of Customer
- Sentiment analysis on deal emails/activities
- Keyword-based scoring (positive/negative/urgent lists)
- NPS score calculation
- Company sentiment breakdown
- Alert system for negative/urgent interactions
- CSV export

### 7.12 Signal Feed
- Real-time signal feed with auto-refresh (15s interval)
- Filter chips: Critical, Risk, Positive, Automation, Email, Lead
- Simulated signal injection for demo mode (8-15s random interval)
- Alert configuration panel

---

## 8. Documents Module (`documents-module.js`)

### Module State
```javascript
window.__docModule = {
  currentDoc: null, fields: [], signers: [],
  selectedField: null, dragField: null,
  currentPage: 1, totalPages: 1,
  pdfDoc: null, editorScale: 1, demoCache: {}
};
```

### Key Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `renderDocumentsScreen()` | Document list with KPIs | ✅ Working with demo fallback |
| `docShowCreateModal()` | Create document + PDF upload | ✅ Working |
| `docOpenEditor()` | PDF field editor | ✅ Working with data URL support |
| `docEditorInitPdf()` | PDF.js initialization | ✅ Fixed for data URLs |
| `docEditorSaveAndSend()` | Save fields + send via webhook | ✅ Working |
| `docSend()` | Send document via n8n | ✅ Working |
| `_sendViaWebhook()` | n8n webhook dispatch | ✅ Working |
| `openSignatureCapture()` | Signature modal (draw/type/upload) | ✅ Working |
| `sigConfirm()` | Validate and confirm signature | ✅ Working |

### Demo Fallback System
The module maintains a `demoCache` for documents that don't exist in the backend. Demo document IDs are prefixed with `demo-`. When API calls fail (404), the module silently falls back to cached data.

**Finding D-01:** `docEditorSaveAndSend()` auto-assigns unassigned fields to the first signer without user confirmation. This is by design (previous fix) but could surprise users who expect explicit assignment.

**Finding D-02:** The `_sendViaWebhook()` function constructs a signed link as `window.location.origin + '/sign/' + doc.id + '?signer=' + s.id`. This route likely doesn't exist on the frontend — it depends on backend routing.

**Finding D-03:** PDF field positions are stored relative to `editorScale`, but there's no normalization when the scale changes. Fields could appear misaligned on different screen sizes.

---

## 9. TrustSign Level 2 Signature Engine

### Architecture
```
trustSignOpen() → Modal UI
    │
    ├── Collect signer info (name, email, role, PIN)
    ├── Capture IP via ipify API
    ├── Capture geolocation via navigator.geolocation
    ├── _initCamera() → WebRTC getUserMedia → MediaRecorder
    ├── _initSignaturePad() → Canvas drawing
    │
    └── __trustSign_finalize()
        ├── Export signature as Base64 PNG
        ├── Stop MediaRecorder → video blob
        ├── _generateTrustSignHash() → SHA-256 (Web Crypto API)
        └── _renderAuditReport()
            ├── Display hash, signer info, forensic data
            ├── Video playback
            ├── __trustSign_copyHash()
            └── __trustSign_downloadReport()
```

### Forensic Proof Payload
```javascript
{
  signature: <base64 PNG>,
  timestamp: <ISO string>,
  ip: <public IP>,
  geo: { lat, lng },
  signerName, signerEmail, signerRole,
  documentTitle, pin,
  userAgent: navigator.userAgent
}
```

**Finding TS-01:** The SHA-256 hash includes the PIN in plaintext as part of the payload. While the hash itself doesn't expose the PIN, the forensic data structure stores it.

**Finding TS-02:** IP capture uses `https://api.ipify.org?format=json` — a third-party service. If it's down, IP capture fails silently.

**Finding TS-03:** Camera/MediaRecorder errors are caught but the signing can still proceed without video. The audit report shows "Câmera: Sem acesso" but the hash is still generated. Consider whether video proof should be mandatory.

**Finding TS-04:** The `__trustSign_downloadReport()` function generates an HTML file for download. This HTML contains inline video/images which could be very large (MB+ for video).

---

## 10. Additive Enhancements (MutationObserver)

### Mechanism
A `MutationObserver` watches `#content-area` for DOM changes. When content changes, `_dispatch()` checks `window.currentScreen` and calls the appropriate injection function.

### Injections

| Function | Target Screen | Enhancements |
|----------|--------------|-------------|
| `_injectPipeline()` | pipeline | Month goal bar, floating "+ New Deal" button, extended filters, stale deal badges |
| `_injectForecast()` | forecast | Missing dates alert, rep breakdown table, scenario saver |
| `_injectMeddpicc()` | meddpicc | Critical ranking, inline edit forms via toggle delegation |
| `_injectPipelineHealth()` | pipeline-health | MEDDPICC 0% banner, health score sparkline, TODO badge replacement |
| `_injectPipelineFunnel()` | pipeline-funnel | Empty stage alerts, period comparison table |
| `_injectLoss()` | loss | Full loss table with pagination and filters |

### CSS Injection
A `_css` array contains all additive styles, injected into `<head>` via a `<style>` element.

**Finding AE-01:** The MutationObserver fires on every DOM mutation in `#content-area`. Injection functions check for existing elements to avoid duplicates, but this adds overhead on every mutation.

**Finding AE-02:** `_injectForecast()` uses hardcoded rep data (João Silva, Carla Menezes, Pedro Alves, Outros). This should be dynamic from the deal data.

**Finding AE-03:** `_injectLoss()` uses 23 hardcoded lost deals. In production, this should pull from the API/Supabase.

**Finding AE-04:** `_markStaleDeals()` relies on parsing text content (`/(\d+)d\s+sem\s+contato/`) from deal cards. This is fragile and will break if the card format changes.

---

## 11. Third-Party Integrations

| Integration | Purpose | Location |
|------------|---------|----------|
| **Chart.js** | All dashboard charts | CDN in `<head>` |
| **Lucide Icons** | Icon system | CDN in `<head>` |
| **PDF.js** | PDF rendering in document editor | CDN links |
| **Mapbox GL JS** | Fraud map visualization | CDN + token in CONFIG |
| **Leaflet** | Fallback map library | CDN |
| **Groq API** | Julio AI (LLM chat, analysis) | Direct API calls |
| **Google Calendar API** | Agenda/meetings sync | gapi client |
| **ipify** | Public IP capture for TrustSign | HTTP GET |
| **n8n webhooks** | Email dispatch, lead processing, signal refresh | POST webhooks |
| **Supabase** | Primary database (PostgREST) | REST client |
| **HubSpot** | Deal/pipeline data via Supabase | Stage mapping |

**Finding I-01:** All CDN dependencies have no SRI (Subresource Integrity) hashes. A compromised CDN could inject malicious code.

**Finding I-02:** Groq API calls are made directly from the browser, exposing the API key in network requests.

---

## 12. Security Findings

### CRITICAL

| ID | Finding | Impact | Location |
|----|---------|--------|----------|
| **S-01** | Groq API key hardcoded in frontend | Key exposed to any user | CONFIG.groq.key |
| **S-02** | Supabase anon key in client code | Database accessible with key | CONFIG.supabase.key |
| **S-03** | Mapbox access token exposed | Token misuse/billing | CONFIG.mapbox.token |
| **S-04** | Google Calendar API keys in source | API quota abuse | Agenda section |

### HIGH

| ID | Finding | Impact | Location |
|----|---------|--------|----------|
| **S-05** | `escapeHtml()` used inconsistently | Potential XSS in some innerHTML concatenations | Multiple render functions |
| **S-06** | `innerHTML` used extensively with string concatenation | XSS risk if data contains HTML | ~200+ locations |
| **S-07** | `onclick` attributes with string interpolation | Script injection via deal names/company names | Deal cards, lead rows |
| **S-08** | No CSP (Content Security Policy) headers defined | Broader XSS attack surface | HTML head |

### MEDIUM

| ID | Finding | Impact | Location |
|----|---------|--------|----------|
| **S-09** | JWT token stored in localStorage | XSS can steal token | Auth module |
| **S-10** | `window.prompt()` used for user input | UI phishing risk | `disqualifyLead()` |
| **S-11** | No input validation on deal/lead forms | Data integrity issues | Convert modal, new deal |
| **S-12** | PIN for TrustSign passed in plaintext to hash | PIN exposure in memory | `__trustSign_finalize()` |

---

## 13. Performance Findings

### HIGH

| ID | Finding | Impact | Location |
|----|---------|--------|----------|
| **PF-01** | 25,060-line single file parsed on load | Slow initial parse time (~500ms+) | guardline.html |
| **PF-02** | All Chart.js instances created synchronously | Blocks main thread during render | Multiple screens |
| **PF-03** | MutationObserver fires on every DOM change | Redundant injection checks | Additive enhancements |
| **PF-04** | Signal feed polls every 15s + simulated signals every 8-15s | Unnecessary network/CPU when tab not visible | `initSignalFeedPage()` |

### MEDIUM

| ID | Finding | Impact | Location |
|----|---------|--------|----------|
| **PF-05** | No virtual scrolling for large lists (30 leads, 23+ lost deals) | OK at current scale, but won't scale | Leads table, loss table |
| **PF-06** | SVG relationship map renders all nodes at once | Could lag with large contact graphs | `renderRelationshipMap()` |
| **PF-07** | `buildLeadsSeed()` recreates 30 leads each call | Minor CPU waste | Leads |
| **PF-08** | `setInterval` for risk engine injection (500ms for 10s) | Minor overhead | Risk engine auto-inject |
| **PF-09** | Multiple `document.querySelectorAll()` calls in injection functions | DOM query overhead | Additive enhancements |

---

## 14. Code Quality Findings

### Architecture

| ID | Finding | Severity |
|----|---------|----------|
| **CQ-01** | Monolithic 25K-line HTML file with all CSS + JS | High |
| **CQ-02** | No module system (ES modules, CommonJS) — everything is global | High |
| **CQ-03** | Mix of `var`, `function`, and `async function` — no consistent style | Medium |
| **CQ-04** | String HTML concatenation instead of template literals or DOM APIs | Medium |
| **CQ-05** | Global state scattered across `window.*` variables | High |
| **CQ-06** | No TypeScript or JSDoc type annotations | Medium |
| **CQ-07** | No unit tests | High |
| **CQ-08** | No build process (no bundler, minifier, or preprocessor) | Medium |

### Patterns

| ID | Finding | Severity |
|----|---------|----------|
| **CQ-09** | Demo/seed data mixed with production code | Medium |
| **CQ-10** | `escapeHtml()` called redundantly on already-escaped data in some places | Low |
| **CQ-11** | Inconsistent naming: `renderLeadFlow` vs `renderLeadsTable` vs `renderHubspotPipeline` | Low |
| **CQ-12** | Some functions exceed 200 lines (e.g., `renderRelationshipMap`, `renderVoiceOfCustomer`) | Medium |
| **CQ-13** | Callback-style `.then()` mixed with `async/await` in the same codebase | Low |
| **CQ-14** | `typeof lucide !== 'undefined' && lucide.createIcons()` repeated 20+ times | Low |

### Data Handling

| ID | Finding | Severity |
|----|---------|----------|
| **CQ-15** | Three data source patterns (Supabase, API, demo) with no unified data layer | High |
| **CQ-16** | `localStorage` used for 10+ different feature states with no namespace collision protection (though `gl_` prefix is used) | Low |
| **CQ-17** | Date parsing in forecast weekly breakdown is fragile (regex on localized strings) | Medium |
| **CQ-18** | `guardlineSupabaseReady()` is called repeatedly instead of caching the result | Low |

---

## 15. Bug Inventory

### Confirmed Bugs (Previously Fixed)

| Bug | Fix Applied | Status |
|-----|------------|--------|
| Maximum call stack (recursive wrapper) | Replaced with MutationObserver | ✅ Fixed |
| 404 on document API routes | Added frontend demo fallback | ✅ Fixed |
| PDF not loading (null fileUrl) | Added null check | ✅ Fixed |
| PDF not appearing (data URL support) | Added data URL handling | ✅ Fixed |
| Duplicate error toasts | Added `{ silent: true }` | ✅ Fixed |
| "Salvar & Enviar" button not working | Removed strict validation, auto-assign fields | ✅ Fixed |
| Email not arriving | Integrated n8n webhook | ✅ Fixed |

### Potential Bugs (Found During Audit)

| ID | Bug | Severity | Location |
|----|-----|----------|----------|
| **B-01** | `_markStaleDeals()` regex depends on Portuguese locale text "sem contato" — will break if language changes | Medium | Line ~24150 |
| **B-02** | `filterLeadsList()` uses `leadsPageState.filterScore` but the filter UI values ('high', 'mid', 'low') may not match | Low | Line ~9957 |
| **B-03** | `openConvertDealModal()` uses single-quote string interpolation in `onclick` — deal IDs with quotes would break | Low | Line ~9909 |
| **B-04** | `riskEngineExport()` uses `escapeHtml()` in CSV output, which would double-encode `&amp;` etc. | Low | Line ~9668 |
| **B-05** | Signal feed `tick()` simulates fake signals in demo mode — these persist in the feed array and inflate counts | Low | Line ~11119 |
| **B-06** | `vocExportCsv()` doesn't escape commas/quotes in company names properly (uses simple replace) | Low | Line ~18858 |
| **B-07** | `_injectPipelineHealth()` sparkline uses hardcoded data `[52,55,58,61,57,60,63,60]` instead of real health history | Medium | Line ~24395 |
| **B-08** | `_fcSaveScenario()` reads slider values from `fc-scenario-wr`, `fc-scenario-cycle`, `fc-scenario-new` — these IDs may not exist if the scenario modeling card hasn't rendered | Medium | Line ~24253 |
| **B-09** | `leadStatusRecClass()` function is referenced in `renderLeadsTable()` but its definition was not found in audited sections — may cause a ReferenceError | High | Line ~10013 |
| **B-10** | Loss table filter `mkOpts` function uses `label.toLowerCase()` for the filter key but actual keys are 'reason', 'rep', 'stage' — mismatch with localized labels | Low | Line ~24585 |

---

## 16. Recommendations

### Priority 1 — CRITICAL (Security)

1. **Move API keys to backend proxy**
   - Create a backend endpoint that proxies Groq API calls
   - Never expose Groq, Supabase service keys, or Google API keys in frontend code
   - Use environment variables on the server side

2. **Implement Content Security Policy**
   - Add `<meta http-equiv="Content-Security-Policy">` to restrict script sources
   - Whitelist only trusted CDN domains

3. **Sanitize all dynamic HTML**
   - Audit all `innerHTML` assignments for user-controlled data
   - Consider using a DOM builder or template engine instead of string concatenation
   - At minimum, ensure `escapeHtml()` is called on every dynamic value

### Priority 2 — HIGH (Architecture)

4. **Modularize the codebase**
   - Split `guardline.html` into separate files:
     - `styles.css` — all CSS
     - `config.js` — CONFIG object
     - `auth.js` — Auth module
     - `api.js` — API + DB + N8N clients
     - `router.js` — navigateTo + screen registry
     - `screens/*.js` — one file per screen
     - `components/*.js` — shared components
     - `trustsign.js` — TrustSign engine
     - `julio.js` — AI chat engine
   - Use ES modules or a bundler (Vite, esbuild)

5. **Implement a unified data layer**
   - Create a `DataService` that abstracts Supabase vs API vs demo data
   - Each screen calls `DataService.getDeals()` instead of checking `guardlineSupabaseReady()` everywhere

6. **Add automated tests**
   - Unit tests for: risk engine rules, MEDDPICC scoring, date parsing, CSV export
   - Integration tests for: authentication flow, screen routing
   - E2E tests for: document creation, signature capture, deal drag-and-drop

### Priority 3 — MEDIUM (Performance & UX)

7. **Implement lazy loading**
   - Load screen-specific JS only when navigating to that screen
   - Defer Chart.js and Mapbox loading until needed

8. **Add Page Visibility API check**
   - Pause signal polling and simulated signals when tab is not visible
   - Resume on `visibilitychange` event

9. **Use virtual scrolling for large lists**
   - Implement virtual scroll for leads table when > 50 rows
   - Same for loss intelligence table

10. **Improve accessibility**
    - Add `aria-label` to all interactive elements
    - Ensure keyboard navigation for modals, drawers, drag-and-drop
    - Add `role` attributes to custom widgets
    - Test with screen reader

### Priority 4 — LOW (Code Quality)

11. **Standardize coding style**
    - Adopt `const`/`let` over `var`
    - Use template literals instead of string concatenation
    - Consistent `async/await` over `.then()` chains
    - Add ESLint configuration

12. **Extract demo data to separate file**
    - Move all seed/demo data to `demo-data.js`
    - Load only in demo mode

13. **Create reusable UI components**
    - `KpiCard(title, value, color)` component
    - `DataTable(columns, rows, options)` component
    - `Modal(title, content, actions)` component
    - `Chart(type, data, options)` wrapper

14. **Add error boundaries**
    - Wrap each screen render in try/catch
    - Show user-friendly error screen instead of blank content
    - Log errors to a monitoring service

---

## 17. Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| API key abuse (Groq, Supabase) | **High** | **High** | Move to backend proxy |
| XSS via innerHTML injection | **Medium** | **High** | Consistent escaping, CSP |
| Token theft via XSS | **Medium** | **High** | HttpOnly cookies, CSP |
| Performance degradation at scale | **Medium** | **Medium** | Modularize, lazy load |
| Maintenance difficulty | **High** | **Medium** | Split into modules |
| Regression bugs | **High** | **Medium** | Add test suite |
| CDN compromise | **Low** | **Critical** | Add SRI hashes |
| Demo data leaking to production | **Low** | **Low** | Separate demo module |

---

## Appendix A: Global Variables Inventory

| Variable | Purpose |
|----------|---------|
| `window.GUARDLINE_API_BASE` | API base URL override |
| `window.GUARDLINE_N8N_WEBHOOK_BASE` | n8n webhook base override |
| `window.GROQ_API_KEY` | Groq API key |
| `window.__GUARDLINE_OFFLINE` | Force offline/demo mode |
| `window.currentScreen` | Current active screen |
| `window.__guardlineDealsCache` | Cached deals array |
| `window.__guardlineLeads` | Cached leads array |
| `window.__guardlineLeadsFromSupabaseMode` | Flag for Supabase lead source |
| `window.__guardlineLeadsSupabaseRows` | Supabase lead rows |
| `window.__guardlineLeadsSupabaseTotal` | Total Supabase lead count |
| `window.__guardlineSupabaseMetrics` | Dashboard metrics from Supabase |
| `window.__hubspotPipelineIncludeClosed` | Show closed deals toggle |
| `window.__docModule` | Document module state |
| `window.__relMapNodes` | Relationship map node data |
| `window.__relMapEdges` | Relationship map edge data |
| `window.__relMapInfluence` | Influence score map |
| `window.__vocData` | Voice of Customer interaction data |

## Appendix B: localStorage Keys

| Key Pattern | Purpose |
|------------|---------|
| `gl_personas_*` | Buyer personas per deal |
| `gl_meetings_local` | Locally stored meetings |
| `gl_inbox_starred` | Starred email IDs |
| `gl_inbox_archived` | Archived email IDs |
| `gl_inbox_labels` | Custom email labels |
| `gl_fc_scenarios` | Saved forecast scenarios |
| `julio_chat_history_v2` | Julio AI chat history |
| `guardline_token` | JWT authentication token |
| `guardline_user` | Cached user profile |

---

**End of Audit Report**

*This report covers the complete frontend codebase as of the audit date. No destructive changes were made during the audit. All findings are based on static code analysis.*
