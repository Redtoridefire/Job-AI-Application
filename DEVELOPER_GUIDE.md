# 🛠️ Developer Guide

This guide is for developers who want to understand, modify, or extend the Smart Job Autofill extension.

## Architecture Overview

### File Structure
```
job-autofill-extension/
├── manifest.json           # Extension configuration
├── popup.html              # Extension popup UI
├── popup.css               # Popup styling
├── popup.js                # Popup logic and UI interactions
├── content.js              # Main form-filling logic
├── background.js           # Service worker
├── injected.js             # Page context script
├── icons/                  # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── documentation/
    ├── README.md
    ├── INSTALLATION.md
    ├── USAGE_EXAMPLES.md
    └── CHANGELOG.md
```

### Component Interaction Flow

```
User clicks extension icon
         ↓
    popup.html (UI)
         ↓
    popup.js (User actions)
         ↓
Chrome Storage API (Data persistence)
         ↓
Content Script (content.js)
         ↓
    DOM Manipulation (Fill forms)
         ↓
background.js (Coordination)
```

## Key Components

### 1. manifest.json
**Purpose**: Extension configuration and permissions

**Key sections:**
- `manifest_version: 3` - Uses latest standard
- `permissions` - What the extension can do
- `host_permissions` - Where it can run
- `content_scripts` - Scripts injected into pages
- `background` - Service worker configuration

### 2. popup.html / popup.css
**Purpose**: User interface

**Features:**
- Tab-based navigation
- Form inputs for user data
- Settings controls
- Learned data visualization

### 3. popup.js
**Purpose**: UI logic and data management

**Main functions:**
```javascript
loadProfile()           // Load user profile from storage
saveProfile()           // Save user profile to storage
loadSettings()          // Load extension settings
saveSettings()          // Save extension settings
loadLearnedData()       // Display learned responses
fillCurrentPage()       // Trigger form filling
parseResume()           // Extract data from resume
```

### 4. content.js
**Purpose**: Core form-filling logic

**Main functions:**
```javascript
fillCurrentForm()       // Main entry point for filling
findFormFields()        // Locate all fillable fields
fillField()             // Fill individual field
smartMatch()            // Match field to data
getFieldInfo()          // Extract field metadata
setFieldValue()         // Set and trigger events
initLearningMode()      // Enable learning from user
```

## Data Flow

### Storage Schema

```javascript
// Chrome local storage structure
{
  // User Profile
  fullName: "John Doe",
  email: "john@example.com",
  phone: "+1 (555) 123-4567",
  linkedin: "https://linkedin.com/in/johndoe",
  location: "San Francisco, CA",
  
  // Resume Data
  resumeText: "Full resume text...",
  resumeData: {
    name: "John Doe",
    email: "john@example.com",
    skills: [...],
    experience: [...],
    education: [...]
  },
  resumeFileName: "resume.pdf",
  
  // Settings
  autoFillEnabled: true,
  learnMode: true,
  smartMode: true,
  fillSpeed: 500,
  workAuth: "citizen",
  
  // Learning Data
  learnedResponses: {
    "field_id_or_name": "learned_value",
    "How did you hear about us?": "LinkedIn",
    // ... more learned data
  },
  
  // Statistics
  formsFilled: 5,
  lastResetDate: "2024-11-21"
}
```

## Smart Matching Algorithm

### How It Works

1. **Field Information Extraction**
```javascript
// Collect all identifiable information about a field
{
  id: "first_name",
  name: "firstName",
  placeholder: "Enter your first name",
  label: "First Name",
  ariaLabel: "First name input",
  type: "text",
  nearbyText: "Please provide your first name"
}
```

2. **Pattern Matching**
```javascript
// Check if field matches known patterns
if (matchesAny(search, ['first name', 'firstname', 'first_name'])) {
  return userData.fullName.split(' ')[0];
}
```

3. **Learned Response Check**
```javascript
// Check if we've seen this field before
if (learnedResponses[fieldKey]) {
  return learnedResponses[fieldKey];
}
```

4. **Fallback**
```javascript
// If no match found, return null
return null;
```

## Adding New Features

### Example: Add Support for Portfolio URL

1. **Update Storage Schema** (popup.js)
```javascript
// In saveProfile function
const profile = {
  fullName: document.getElementById('full-name').value,
  email: document.getElementById('email').value,
  portfolio: document.getElementById('portfolio').value, // NEW
  // ... other fields
};
```

2. **Add UI Field** (popup.html)
```html
<div class="form-group">
  <label>Portfolio URL</label>
  <input type="url" id="portfolio" placeholder="https://yourportfolio.com">
</div>
```

3. **Add Smart Matching** (content.js)
```javascript
// In smartMatch function
if (matchesAny(search, ['portfolio', 'website', 'personal website'])) {
  return userData.portfolio || '';
}
```

### Example: Add New Learning Pattern

```javascript
// In initLearningMode function
document.addEventListener('blur', async (e) => {
  const field = e.target;
  if (field.tagName === 'INPUT' || field.tagName === 'SELECT') {
    await learnFromField(field);
  }
}, true);
```

## Debugging

### Enable Console Logging

Add to content.js:
```javascript
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[Autofill]', ...args);
}

// Usage
log('Filling field:', fieldInfo);
```

### Chrome DevTools

1. **Inspect Popup**
   - Right-click extension icon
   - Select "Inspect"
   - Console shows popup.js logs

2. **Inspect Content Script**
   - Open page with forms
   - Press F12
   - Console shows content.js logs

3. **Inspect Background**
   - Go to `chrome://extensions/`
   - Click "Service worker"
   - Console shows background.js logs

### Common Debug Tasks

```javascript
// Log all found fields
console.table(findFormFields());

// Log field information
const fields = findFormFields();
fields.forEach(f => console.log(getFieldInfo(f.element)));

// Check storage
chrome.storage.local.get(null, data => console.log(data));
```

## Testing

### Unit Testing Approach

```javascript
// Test smart matching
function testSmartMatch() {
  const testCases = [
    {
      fieldInfo: { searchString: 'first name' },
      userData: { fullName: 'John Doe' },
      expected: 'John'
    },
    // ... more test cases
  ];
  
  testCases.forEach(test => {
    const result = smartMatch(test.fieldInfo, test.userData);
    console.assert(result === test.expected, 
      `Failed: expected ${test.expected}, got ${result}`);
  });
}
```

### Manual Testing Checklist

- [ ] Profile save/load works
- [ ] Resume parsing extracts data correctly
- [ ] Settings persist after browser restart
- [ ] Form filling works on test sites
- [ ] Learning mode captures responses
- [ ] Learned data displays correctly
- [ ] Clear learned data works
- [ ] Statistics track correctly
- [ ] Extension works after browser restart

### Test Sites

Good sites for testing:
- Google Forms (create your own test form)
- Typeform
- JotForm
- Sample Workday demo site (if available)

## Performance Optimization

### Tips for Better Performance

1. **Lazy Loading**
```javascript
// Only find fields when needed
let cachedFields = null;
function getFields() {
  if (!cachedFields) {
    cachedFields = findFormFields();
  }
  return cachedFields;
}
```

2. **Debouncing**
```javascript
// Prevent too many rapid calls
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
```

3. **Efficient Storage**
```javascript
// Only store necessary data
// Don't store entire resume text if not needed
```

## Security Considerations

### Best Practices

1. **Input Validation**
```javascript
function sanitizeInput(input) {
  return input.trim().replace(/<script>/gi, '');
}
```

2. **Safe Storage**
```javascript
// Never store sensitive data like passwords
// Use chrome.storage.local (not accessible to websites)
```

3. **CSP Compliance**
```javascript
// No inline scripts or eval()
// All code in external .js files
```

## Contributing

### Code Style

- Use camelCase for variables and functions
- Use descriptive names
- Add comments for complex logic
- Keep functions small and focused
- Use async/await for promises

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test thoroughly
4. Commit with clear messages: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open Pull Request

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

Types: feat, fix, docs, style, refactor, test, chore

Example:
```
feat(content): add support for portfolio URLs

- Added portfolio field to profile
- Updated smart matching for portfolio fields
- Added UI input in popup

Closes #123
```

## Advanced Topics

### Framework Detection

```javascript
// Detect React
function isReactApp() {
  return !!document.querySelector('[data-reactroot]');
}

// Trigger React events properly
function setReactValue(element, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  ).set;
  nativeInputValueSetter.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
```

### Machine Learning Integration (Future)

```javascript
// Placeholder for ML-based field matching
async function mlSmartMatch(fieldInfo) {
  // Could integrate with TensorFlow.js
  // Train model on successful matches
  // Predict best value for ambiguous fields
}
```

## Resources

### Chrome Extension Docs
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)
- [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

### Related Technologies
- [Web Forms](https://developer.mozilla.org/en-US/docs/Learn/Forms)
- [DOM Events](https://developer.mozilla.org/en-US/docs/Web/Events)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

## FAQ for Developers

**Q: Why Manifest V3?**
A: Manifest V3 is the current standard and provides better security and performance.

**Q: Why no external dependencies?**
A: Keeps the extension lightweight and reduces security risks.

**Q: How does learning mode work?**
A: It observes form submissions and field changes, storing field identifiers with their values.

**Q: Can I use this with other browsers?**
A: Yes, it should work with other Chromium-based browsers (Edge, Brave) with minimal changes.

**Q: How do I add support for a specific ATS?**
A: Study the ATS's form structure, add specific patterns to `smartMatch()`, test thoroughly.

---

**Happy developing! 🚀**
