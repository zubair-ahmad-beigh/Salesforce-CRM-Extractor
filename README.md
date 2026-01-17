# Salesforce CRM Data Extractor - Chrome Extension

A production-quality Chrome Extension (Manifest V3) that extracts Salesforce CRM data via DOM scraping and displays it in a beautiful React dashboard.

![Extension Icon](src/icons/icon128.png)

## 🎯 Features

### Data Extraction
- **5 Salesforce Objects**: Leads, Contacts, Accounts, Opportunities, Tasks
- **Multiple View Types**: List View, Detail Page, Kanban/Pipeline View
- **Automatic Detection**: Intelligently detects object type and view type
- **Real-time Extraction**: Extract data with a single click

### Data Management
- **Local Storage**: All data stored locally using `chrome.storage.local`
- **Deduplication**: Automatic deduplication by record ID
- **Multi-tab Sync**: Real-time synchronization across browser tabs
- **Search & Filter**: Powerful search across all fields
- **Export**: CSV and JSON export functionality

### User Experience
- **React Dashboard**: Beautiful, responsive popup UI with Tailwind CSS
- **Visual Feedback**: Shadow DOM status indicator inside Salesforce pages
- **Stage Visualization**: Opportunities grouped by sales stage with totals
- **Last Sync Tracking**: See when each object type was last extracted

## 📦 Installation

### Method 1: Load Unpacked Extension

1. **Clone or download** this repository
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Build the extension**:
   ```bash
   npm run build
   ```
4. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the `dist` folder from this project

### Method 2: Development Mode

For development with hot reload:
```bash
npm run dev
```

Then load the `dist` folder as an unpacked extension.

## 🏗️ Architecture

### Manifest V3 Structure

```
salesforce-crm-extractor/
├── manifest.json              # Extension manifest (V3)
├── src/
│   ├── content-scripts/       # DOM extraction logic
│   │   ├── main.js           # Content script entry point
│   │   ├── detectors/        # Object & view type detection
│   │   ├── extractors/       # Object-specific extractors
│   │   ├── observers/        # MutationObserver for dynamic DOM
│   │   └── utils/            # DOM helper utilities
│   ├── service-worker/       # Background script
│   │   └── background.js     # Message passing & storage coordination
│   ├── popup/                # React dashboard
│   │   ├── App.jsx           # Main app component
│   │   ├── components/       # UI components
│   │   └── hooks/            # Custom React hooks
│   ├── storage/              # Storage layer
│   │   ├── storage-manager.js    # CRUD operations
│   │   └── sync-coordinator.js   # Multi-tab sync
│   └── injected-ui/          # Shadow DOM status indicator
│       └── status-indicator.js
└── dist/                     # Built extension (generated)
```

### Message Passing Flow

```
Popup (React)
    ↓ EXTRACT_CURRENT_OBJECT
Service Worker
    ↓ Forward to active tab
Content Script
    ↓ Extract data
    ↓ EXTRACTION_COMPLETE
Service Worker
    ↓ Save to storage
    ↓ STORAGE_UPDATED
All Tabs + Popup (Real-time update)
```

## 🔍 DOM Scraping Strategy

### Object Detection

The extension uses a multi-layered approach to detect Salesforce objects:

1. **URL Pattern Matching**:
   ```javascript
   // Example: /lightning/r/Lead/00Q... or /lightning/o/Opportunity/list
   if (url.includes('/Lead/')) return 'leads';
   ```

2. **Page Title Analysis**:
   ```javascript
   if (document.title.includes('Opportunity')) return 'opportunities';
   ```

3. **Breadcrumb Inspection**:
   ```javascript
   const breadcrumbs = document.querySelector('nav[role="navigation"]');
   // Check breadcrumb text for object type
   ```

### Field Extraction

Each extractor uses multiple strategies to find field values:

**Method 1: Label-based extraction**
```javascript
// Find label element
const label = document.querySelector('span.slds-form-element__label');
// Get associated value from parent container
const value = parent.querySelector('.slds-form-element__control');
```

**Method 2: Table row extraction**
```javascript
// Extract from list view tables
const rows = document.querySelectorAll('table[role="grid"] tbody tr');
rows.forEach(row => {
  const cells = row.querySelectorAll('td');
  // Map cells to fields based on column order
});
```

**Method 3: Kanban card extraction** (Opportunities only)
```javascript
// Find kanban columns
const columns = document.querySelectorAll('.kanban-column');
// Extract stage from column header
// Extract cards within each column
```

### Handling Dynamic DOM

Salesforce Lightning uses a dynamic, component-based UI. The extension handles this with:

**MutationObserver**:
```javascript
const observer = new MutationObserver((mutations) => {
  // Debounce rapid changes
  // Check for significant DOM updates
  // Trigger re-extraction if needed
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

**Wait for Elements**:
```javascript
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) return resolve(element);
    
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => reject(), timeout);
  });
}
```

## 💾 Storage Schema

```javascript
{
  "salesforce_data": {
    "leads": [
      {
        "id": "00Q...",
        "name": "John Doe",
        "company": "Acme Corp",
        "email": "john@acme.com",
        "phone": "555-1234",
        "leadSource": "Web",
        "leadStatus": "Qualified",
        "leadOwner": "Jane Smith",
        "extractedAt": 1234567890,
        "lastUpdated": 1234567890
      }
    ],
    "contacts": [...],
    "accounts": [...],
    "opportunities": [
      {
        "id": "006...",
        "opportunityName": "Big Deal",
        "amount": 100000,
        "stage": "Proposal",
        "probability": 75,
        "closeDate": "2024-12-31",
        "forecastCategory": "Pipeline",
        "opportunityOwner": "Jane Smith",
        "associatedAccount": "Acme Corp",
        "extractedAt": 1234567890,
        "lastUpdated": 1234567890
      }
    ],
    "tasks": [...],
    "lastSync": {
      "leads": 1234567890,
      "contacts": 1234567890,
      "accounts": 1234567890,
      "opportunities": 1234567890,
      "tasks": 1234567890
    }
  }
}
```

## 🔄 Deduplication Logic

Records are deduplicated using Salesforce record IDs:

```javascript
async function saveRecords(objectType, newRecords) {
  const existing = await getRecords(objectType);
  
  // Create Map with ID as key
  const recordMap = new Map(existing.map(r => [r.id, r]));
  
  // Merge new records (newer overwrites older)
  newRecords.forEach(record => {
    recordMap.set(record.id, {
      ...record,
      lastUpdated: Date.now()
    });
  });
  
  // Convert back to array
  const merged = Array.from(recordMap.values());
  
  // Save to storage
  await chrome.storage.local.set({ [objectType]: merged });
}
```

## 🔒 Multi-tab Synchronization

To prevent race conditions when multiple tabs extract data simultaneously:

### Locking Mechanism

```javascript
async function acquireLock() {
  const existingLock = await chrome.storage.local.get('storage_lock');
  
  // Check if lock is held by another tab
  if (existingLock && existingLock.timestamp > Date.now() - 5000) {
    return false; // Lock held
  }
  
  // Acquire lock
  await chrome.storage.local.set({
    storage_lock: {
      tabId: this.tabId,
      timestamp: Date.now()
    }
  });
  
  return true;
}
```

### Storage Change Listeners

```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.salesforce_data) {
    // Broadcast to all tabs
    chrome.runtime.sendMessage({
      type: 'STORAGE_UPDATED',
      data: changes.salesforce_data.newValue
    });
  }
});
```

## 🎨 Shadow DOM Status Indicator

The status indicator is injected using Shadow DOM to avoid CSS conflicts:

```javascript
const shadowHost = document.createElement('div');
const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

// Add isolated styles
const style = document.createElement('style');
style.textContent = `
  :host {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
  }
  /* ... more styles ... */
`;

shadowRoot.appendChild(style);
// Add UI elements
```

This ensures the indicator:
- ✅ Doesn't inherit Salesforce's CSS
- ✅ Doesn't break Salesforce's layout
- ✅ Has its own isolated styling

## 🚨 Edge Cases Handled

### 1. Empty Result Sets
- Display friendly empty state in popup
- Don't overwrite existing data with empty arrays

### 2. Pagination
- Detect "Next" button
- Click and wait for new data to load
- Extract additional pages (optional feature)

### 3. Stale Data
- Track `lastUpdated` timestamp for each record
- Show last sync time in popup
- Allow manual refresh

### 4. Network Delays
- Wait for Salesforce spinners to disappear
- Use `waitForElement()` for dynamic content
- Retry extraction if initial attempt fails

### 5. Permission Errors
- Graceful error handling
- Display error messages in popup
- Log errors to console for debugging

### 6. Storage Quota
- Chrome storage limit: ~10MB
- Monitor storage usage
- Provide "Clear All" functionality
- Consider implementing data cleanup strategy

## 📊 Opportunity Stage Mapping

The extension normalizes Salesforce opportunity stages:

```javascript
const STAGES = [
  'Prospecting',
  'Qualification',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost'
];

function normalizeStage(stageText) {
  const normalized = stageText.toLowerCase();
  
  if (normalized.includes('prospect')) return 'Prospecting';
  if (normalized.includes('qualif')) return 'Qualification';
  if (normalized.includes('proposal')) return 'Proposal';
  if (normalized.includes('negotiat')) return 'Negotiation';
  if (normalized.includes('won')) return 'Closed Won';
  if (normalized.includes('lost')) return 'Closed Lost';
  
  return stageText; // Return original if no match
}
```

## 🛠️ Development

### Build Commands

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Clean dist folder
npm run clean
```

### Tech Stack

- **React 18**: UI framework
- **Tailwind CSS**: Styling
- **Webpack 5**: Bundler
- **Babel**: JSX transpilation
- **Chrome Extension APIs**: Storage, Tabs, Runtime, Scripting

### Project Structure

```
src/
├── content-scripts/     # Runs on Salesforce pages
├── service-worker/      # Background script
├── popup/              # React dashboard
├── storage/            # Storage layer
└── injected-ui/        # Shadow DOM indicator
```

## ⚠️ Known Limitations

1. **DOM Fragility**: Salesforce may update their DOM structure, breaking selectors
2. **No API Access**: This extension uses DOM scraping, not Salesforce APIs
3. **Lightning Only**: Designed for Salesforce Lightning Experience (not Classic)
4. **Storage Limit**: Chrome storage limited to ~10MB
5. **No Cross-origin**: Cannot extract data from iframes or external pages
6. **Manual Extraction**: Requires user to click "Extract" button (no auto-extraction)

## 🔐 Permissions

The extension requires these permissions:

- **storage**: Store extracted data locally
- **tabs**: Query active tab for extraction
- **activeTab**: Access current Salesforce page
- **scripting**: Inject content scripts
- **host_permissions**: Access Salesforce domains (`*.salesforce.com`, `*.lightning.force.com`)

## 📝 License

MIT License - feel free to use and modify as needed.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🐛 Troubleshooting

### Extension not working?

1. **Check permissions**: Ensure extension has access to Salesforce domains
2. **Reload extension**: Go to `chrome://extensions/` and click reload
3. **Check console**: Open DevTools and check for errors
4. **Verify Salesforce page**: Must be on Lightning Experience, not Classic

### No data extracted?

1. **Wait for page load**: Ensure Salesforce page is fully loaded
2. **Check object type**: Extension may not recognize custom objects
3. **Inspect DOM**: Salesforce may have changed their HTML structure
4. **Try detail view**: Some list views may have different selectors

### Popup not opening?

1. **Rebuild extension**: Run `npm run build`
2. **Check manifest**: Ensure `popup.html` path is correct
3. **View errors**: Right-click extension icon → Inspect popup

## 📧 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ for Salesforce users who need local CRM data access**
