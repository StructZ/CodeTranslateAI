# User Feedback Flow Diagram

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
        ┌──────────────────────────────────────────┐
        │  User selects code on webpage            │
        │  Extension translates code               │
        └──────────────────────────────────────────┘
                                │
                                ▼
        ┌──────────────────────────────────────────┐
        │  UI shows translated code with buttons:  │
        │  ┌──────┐  ┌────┐  ┌────┐              │
        │  │ Copy │  │ 👍 │  │ 👎 │              │
        │  └──────┘  └────┘  └────┘              │
        └──────────────────────────────────────────┘
                        │              │
                        │              │
            ┌───────────┘              └──────────┐
            ▼                                     ▼
    ┌───────────────┐                  ┌──────────────────┐
    │ User clicks 👍│                  │ User clicks 👎   │
    └───────────────┘                  └──────────────────┘
            │                                     │
            ▼                                     ▼
    ┌───────────────┐                  ┌──────────────────┐
    │ Instant       │                  │ Modal opens:     │
    │ submission    │                  │ ┌──────────────┐ │
    │               │                  │ │ "What was    │ │
    │               │                  │ │  wrong?"     │ │
    │               │                  │ │              │ │
    │               │                  │ │ [Textarea]   │ │
    │               │                  │ │              │ │
    │               │                  │ │ [Cancel][OK] │ │
    │               │                  │ └──────────────┘ │
    └───────────────┘                  └──────────────────┘
            │                                     │
            │                                     ▼
            │                          ┌──────────────────┐
            │                          │ User enters      │
            │                          │ optional comment │
            │                          │ & clicks Submit  │
            │                          └──────────────────┘
            │                                     │
            └─────────────┬───────────────────────┘
                          ▼
        ┌──────────────────────────────────────┐
        │  sendFeedback() called               │
        │  - Collects data                     │
        │  - Sends to background.js            │
        └──────────────────────────────────────┘
                          │
                          ▼
        ┌──────────────────────────────────────┐
        │  background.js                       │
        │  - Receives SUBMIT_FEEDBACK message  │
        │  - POSTs to /v1/feedback endpoint    │
        └──────────────────────────────────────┘
                          │
                          ▼
        ┌──────────────────────────────────────┐
        │  Backend (Cloudflare Worker)         │
        │  POST /v1/feedback                   │
        │  - Validates data                    │
        │  - Generates unique ID               │
        │  - Stores in KV with metadata        │
        └──────────────────────────────────────┘
                          │
                          ▼
        ┌──────────────────────────────────────┐
        │  Cloudflare KV Storage               │
        │  FEEDBACK_STORE                      │
        │  ┌────────────────────────────────┐  │
        │  │ Key: feedback_<timestamp>_<id> │  │
        │  │ Value: {                       │  │
        │  │   isPositive,                  │  │
        │  │   targetLanguage,              │  │
        │  │   originalCode,                │  │
        │  │   translatedCode,              │  │
        │  │   comment,                     │  │
        │  │   timestamp                    │  │
        │  │ }                              │  │
        │  └────────────────────────────────┘  │
        └──────────────────────────────────────┘
                          │
                          ▼
        ┌──────────────────────────────────────┐
        │  Response to Extension               │
        │  { success: true, feedbackId }       │
        └──────────────────────────────────────┘
                          │
                          ▼
        ┌──────────────────────────────────────┐
        │  UI Visual Feedback                  │
        │  - Button highlights briefly         │
        │  - Modal closes (if open)            │
        └──────────────────────────────────────┘
```

## Data Flow

### Positive Feedback (👍)
```
User Click → sendFeedback(true) → background.js → Backend → KV Store
     ↓
Button highlights for 2s
```

### Negative Feedback (👎)
```
User Click → Modal Opens
     ↓
User enters comment (optional)
     ↓
Click Submit → sendFeedback(false, comment) → background.js → Backend → KV Store
     ↓
Modal closes + Button highlights for 2s
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Extension)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   ui.js     │  │  content.js  │  │  background.js   │   │
│  │             │  │              │  │                  │   │
│  │ - Buttons   │◄─│ - Injects UI │  │ - Message        │   │
│  │ - Modal     │  │ - Passes     │  │   handler        │   │
│  │ - Feedback  │  │   original   │  │ - HTTP requests  │   │
│  │   logic     │  │   code       │  │                  │   │
│  └──────┬──────┘  └──────────────┘  └────────┬─────────┘   │
│         │                                     │             │
│         └─────────────────┬───────────────────┘             │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            │ POST /v1/feedback
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     BACKEND (Cloudflare Worker)             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  index.ts                                            │   │
│  │  ┌────────────────┐  ┌──────────────────────────┐   │   │
│  │  │ handleFeedback │  │ FEEDBACK_STORE (KV)      │   │   │
│  │  │                │──┤                          │   │   │
│  │  │ - Validates    │  │ Stores feedback data     │   │   │
│  │  │ - Creates ID   │  │ with metadata            │   │   │
│  │  │ - Stores data  │  │                          │   │   │
│  │  └────────────────┘  └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## State Diagram

```
┌──────────────┐
│  Code        │
│  Translated  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Buttons     │
│  Visible     │
└───┬──────┬───┘
    │      │
👍  │      │  👎
    │      │
    │      ▼
    │  ┌────────────┐
    │  │  Modal     │
    │  │  Open      │
    │  └──┬─────┬───┘
    │     │     │
    │  Cancel Submit
    │     │     │
    │     ▼     │
    │  ┌────┐  │
    │  │Close│  │
    │  └────┘  │
    │          │
    └────┬─────┘
         │
         ▼
    ┌─────────────┐
    │  Sending    │
    │  Feedback   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐      ┌──────────┐
    │   Success   │ ───► │  Button  │
    │             │      │ Highlight│
    └─────────────┘      └──────────┘
```

## Files & Responsibilities

```
frontend/
│
├── scripts/
│   ├── ui.js
│   │   ├── injectOrUpdateTranslations()  [Creates UI with buttons]
│   │   ├── sendFeedback()                [Sends to background]
│   │   └── showFeedbackModal()           [Shows modal for 👎]
│   │
│   ├── content.js
│   │   └── handleElementClick()          [Passes originalCode]
│   │
│   └── background.js
│       └── onMessage.listener            [Handles SUBMIT_FEEDBACK]
│           └── fetch(/v1/feedback)       [POSTs to backend]
│
backend/
│
└── src/
    └── index.ts
        └── handleFeedback()              [Validates & stores]
            └── FEEDBACK_STORE.put()      [Saves to KV]
```

## Error Handling

```
┌──────────────┐
│  User Action │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Try Submit      │
└──────┬───────────┘
       │
       ├─ Success ──► Button highlights ──► Done
       │
       ├─ Network Error ──► Console.error ──► Silent fail
       │
       └─ Backend Error ──► Console.error ──► Silent fail
```

## Security Considerations

```
Data Sanitization
       │
       ├─ No PII collected
       ├─ Code snippets only
       ├─ Rate limiting applied
       └─ CORS configured
              │
              ▼
       KV Storage
              │
              ├─ Unique IDs
              ├─ Metadata indexed
              └─ Timestamp tracked
```

## Deployment Flow

```
Development
    │
    ├─ Create KV namespaces
    │  └─ wrangler kv:namespace create "FEEDBACK_STORE"
    │
    ├─ Update wrangler.jsonc with IDs
    │
    ├─ npm install
    │
    └─ npm run dev
         │
         ▼
    Local Testing
         │
         ▼
    Production
         │
         ├─ npm run deploy (backend)
         │
         └─ Load extension (frontend)
```

## Monitoring & Analysis

```
Feedback Data
    │
    ├─ Query by metadata
    │  ├─ isPositive: false (negative feedback)
    │  ├─ targetLanguage: "Python"
    │  └─ timestamp range
    │
    ├─ Export for analysis
    │  └─ JSON/CSV format
    │
    └─ Identify patterns
       ├─ Common issues
       ├─ Language-specific problems
       └─ Improvement areas
              │
              ▼
       Update AI Prompts
              │
              ▼
       Improve Translation Quality
```

---

**Legend:**
- `│` : Flow direction
- `┌─┐` : Components/Steps
- `►` : Result/Output
- `◄` : Input/Dependency
