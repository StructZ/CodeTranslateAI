# User Feedback Mechanism Feature

## Overview
This feature adds a user feedback mechanism to collect quality ratings and comments about AI-generated code translations. Users can now provide feedback directly in the extension UI using thumbs up/down buttons.

## Features Implemented

### 1. **Feedback Buttons in UI**
- Added 👍 (Good) and 👎 (Bad) buttons next to the Copy button
- Buttons appear for each translated code snippet
- Visual feedback when clicked (button highlights briefly)

### 2. **Feedback Modal for Negative Feedback**
- Clicking 👎 opens a modal dialog
- Users can optionally describe what was wrong with the translation
- Textarea with 1000 character limit
- Cancel and Submit buttons
- Works in both light and dark themes

### 3. **Backend Endpoint**
- New `/v1/feedback` endpoint to receive feedback
- Stores feedback in Cloudflare KV storage
- Rate-limited along with other endpoints
- CORS-enabled for extension requests

### 4. **Data Collection**
Feedback includes:
- `isPositive`: boolean (true for 👍, false for 👎)
- `targetLanguage`: The language the code was translated to
- `originalCode`: The original code snippet
- `translatedCode`: The AI-generated translation
- `comment`: Optional user comment (required for negative feedback)
- `timestamp`: ISO 8601 timestamp of when feedback was submitted

## Files Modified

### Frontend
1. **`frontend/scripts/ui.js`**
   - Added feedback buttons UI
   - Created feedback modal component
   - Added `sendFeedback()` and `showFeedbackModal()` functions
   - Updated styles for dark mode support
   - Modified function signature to accept `originalCode` parameter

2. **`frontend/scripts/content.js`**
   - Updated calls to `injectOrUpdateTranslations()` to pass original code

3. **`frontend/background.js`**
   - Added message handler for `SUBMIT_FEEDBACK` type
   - Sends feedback to backend `/v1/feedback` endpoint

### Backend
4. **`backend/src/index.ts`**
   - Added `FEEDBACK_STORE` KV namespace to Env interface
   - Created `handleFeedback()` function
   - Added `/v1/feedback` route handler
   - Generates unique feedback IDs
   - Stores feedback with metadata for easy querying

5. **`backend/wrangler.jsonc`**
   - Added `FEEDBACK_STORE` KV namespace binding

## Setup Instructions

### 1. Create KV Namespace for Feedback Storage

```bash
# Navigate to backend directory
cd backend

# Create production KV namespace
wrangler kv:namespace create "FEEDBACK_STORE"

# Create preview KV namespace for development
wrangler kv:namespace create "FEEDBACK_STORE" --preview
```

### 2. Update wrangler.jsonc

Replace the placeholder IDs in `wrangler.jsonc`:

```jsonc
{
  "binding": "FEEDBACK_STORE",
  "id": "<your_feedback_kv_id>",          // Use the ID from production namespace
  "preview_id": "<your_feedback_preview_kv_id>"  // Use the ID from preview namespace
}
```

### 3. Install Dependencies & Build

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Build the extension
node build.js
```

### 4. Deploy Backend

```bash
cd backend
npm run deploy
```

## Usage

1. **User selects code** on a webpage using the extension
2. **Translation appears** with Copy, 👍, and 👎 buttons
3. **For good translations**: Click 👍 - feedback is submitted instantly
4. **For bad translations**: 
   - Click 👎
   - Modal appears asking "What was wrong with this translation?"
   - User can optionally provide details
   - Click "Submit Feedback"
5. **Visual confirmation**: Button highlights briefly to confirm submission

## Accessing Feedback Data

### Via Wrangler CLI

```bash
# List all feedback entries
wrangler kv:key list --binding FEEDBACK_STORE

# Get specific feedback
wrangler kv:key get "feedback_<id>" --binding FEEDBACK_STORE

# Get feedback with metadata
wrangler kv:key get "feedback_<id>" --binding FEEDBACK_STORE --preview false
```

### Via Cloudflare Dashboard

1. Go to Workers & Pages > KV
2. Select the FEEDBACK_STORE namespace
3. Browse or search feedback entries

### Programmatic Access

Add an admin endpoint to query feedback (optional future enhancement):

```typescript
// Example: Get negative feedback
async function getNegativeFeedback(env: Env, limit = 100) {
  const list = await env.FEEDBACK_STORE.list({ limit });
  const feedback = [];
  
  for (const key of list.keys) {
    if (key.metadata?.isPositive === false) {
      const data = await env.FEEDBACK_STORE.get(key.name);
      feedback.push(JSON.parse(data));
    }
  }
  
  return feedback;
}
```

## Data Schema

```typescript
interface Feedback {
  isPositive: boolean;           // true for 👍, false for 👎
  targetLanguage: string;        // e.g., "Python", "JavaScript"
  originalCode: string;          // The source code
  translatedCode: string;        // The AI translation
  comment?: string;              // Optional user comment
  timestamp: string;             // ISO 8601 timestamp
}
```

## Future Enhancements

1. **Analytics Dashboard**: Create a dashboard to visualize feedback trends
2. **Export Functionality**: Bulk export feedback to CSV/JSON for analysis
3. **AI Model Training**: Use negative feedback to fine-tune prompts
4. **User Identification**: Add optional user ID for tracking repeat issues
5. **Feedback Categories**: Add predefined categories (syntax error, incorrect logic, etc.)
6. **Thank You Message**: Show appreciation message after feedback submission
7. **Feedback Statistics**: Show translation success rate per language

## Privacy & Data Handling

- No personally identifiable information is collected
- Original and translated code is stored for quality improvement only
- Consider adding a data retention policy (e.g., auto-delete after 90 days)
- Add a privacy notice in the extension popup

## Testing

1. **Manual Testing**:
   - Test thumbs up feedback
   - Test thumbs down with and without comments
   - Test modal cancel functionality
   - Verify dark mode styling
   - Check rate limiting

2. **Backend Testing**:
   ```bash
   cd backend
   npm test
   ```

## Contributing

When working on this feature:
- Test both light and dark themes
- Ensure modal is accessible (keyboard navigation)
- Test with long comments (1000 chars)
- Verify feedback submission on slow networks
- Check error handling for network failures

## License

Same as the main CodeTranslateAI project.
