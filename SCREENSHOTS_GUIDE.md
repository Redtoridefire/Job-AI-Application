# Screenshot Guide for Chrome Web Store

You need **at least 1 screenshot**, but **3-5 is recommended** for a good listing.

## Screenshot Requirements

- **Size:** 1280x800 pixels (recommended) or 640x400 pixels (minimum)
- **Format:** PNG or JPEG
- **Content:** Must show actual extension functionality
- **Quality:** Clear, high-resolution, no blur

---

## Recommended Screenshots

### Screenshot 1: Extension Popup - Profile Tab ⭐ REQUIRED
**What to show:**
- The extension popup open on the Profile tab
- Filled in profile information (name, email, phone, etc.)
- The "Smart Job Autofill" header clearly visible
- Resume upload section

**How to capture:**
1. Open the extension popup
2. Fill in your profile information (you can use fake data for the screenshot)
3. Take a screenshot
4. Crop to 1280x800 pixels showing the popup

**On Mac:** Cmd+Shift+4, then spacebar, click window
**On Windows:** Windows+Shift+S, select area
**On Linux:** Screenshot tool or Shift+PrtScn

---

### Screenshot 2: Extension Popup - History Tab ⭐ RECOMMENDED
**What to show:**
- The History tab active
- 3-5 tracked applications showing
- Statistics showing (Total, This Week, This Month)
- Export CSV and Clear History buttons visible

**How to capture:**
1. Switch to History tab
2. Make sure you have some tracked applications (or add test data)
3. Take screenshot
4. Crop to 1280x800 pixels

**Tip:** If you don't have real applications yet, manually add to chrome storage:
```javascript
// In browser console while extension is open:
chrome.storage.local.get(['applicationHistory'], (data) => {
  const testApps = [
    {
      id: '1',
      jobTitle: 'Senior Software Engineer',
      company: 'Google',
      url: 'https://careers.google.com',
      hostname: 'careers.google.com',
      date: new Date().toISOString(),
      timestamp: Date.now()
    },
    // Add more...
  ];
  chrome.storage.local.set({ applicationHistory: testApps });
});
```

---

### Screenshot 3: Extension in Action on a Job Site ⭐ RECOMMENDED
**What to show:**
- A real job application page (LinkedIn, Indeed, Workday, etc.)
- Extension popup visible or fields being filled
- Green highlight effect on filled fields (if captured at right moment)
- Site status indicator showing "Job application site detected"

**How to capture:**
1. Go to a real job site (e.g., LinkedIn jobs)
2. Open a job application
3. Open the extension popup (shows site status)
4. Take screenshot showing both the job form and the extension

**Best sites for demo:**
- LinkedIn (well-known, clean interface)
- Indeed (familiar to users)
- Any Workday job posting (shows compatibility)

---

### Screenshot 4: Extension Popup - Settings Tab (OPTIONAL)
**What to show:**
- Settings tab active
- Manual/Automatic mode selector
- All toggles visible (Auto-fill, Learning Mode, AI Smart Fill, Auto-Navigate)
- Work authorization dropdown
- Fill speed slider

**Why include:**
- Shows customization options
- Demonstrates control users have
- Highlights key features

---

### Screenshot 5: Learned Data Tab (OPTIONAL)
**What to show:**
- Learned Data tab active
- Several learned responses displayed
- Shows the "brain" of the extension learning

---

## Screenshot Editing Tips

### Tools You Can Use:
- **Mac:** Preview (built-in)
- **Windows:** Paint or Snipping Tool
- **Cross-platform:** GIMP (free), Photoshop, Figma

### What to Edit:
1. **Crop to exact size** (1280x800 or 640x400)
2. **Blur sensitive info** (your real email, phone if using real data)
3. **Add subtle annotations** (optional):
   - Arrow pointing to "Track applications automatically"
   - Circle around "Export CSV" button
   - Text overlay: "Works with 40+ job sites"

### Pro Tips:
- Use consistent sizing for all screenshots
- Keep them clean and uncluttered
- Show happy path (things working well)
- Avoid showing errors or empty states
- Use realistic but safe test data

---

## Quick Capture Checklist

- [ ] Screenshot 1: Profile tab with filled info
- [ ] Screenshot 2: History tab with tracked applications
- [ ] Screenshot 3: Extension on a job site
- [ ] Screenshot 4 (optional): Settings tab
- [ ] Screenshot 5 (optional): Learned Data tab
- [ ] All screenshots are 1280x800px
- [ ] All screenshots are PNG or JPEG
- [ ] Personal info is blurred/removed
- [ ] Screenshots are clear and high quality

---

## Example Screenshot Flow

**For a 3-screenshot submission:**

1. **Profile Tab**: Shows setup is easy
2. **History Tab**: Shows tracking feature (unique selling point)
3. **In Action**: Shows it actually works on real job sites

This tells a complete story: Setup → Use → Track

---

## Alternative: Use Browser Dev Tools

If you want perfect, professional screenshots:

1. Open extension popup
2. Right-click popup → Inspect
3. Use "Device Toolbar" (Ctrl+Shift+M)
4. Set custom dimensions: 400x600 (popup size)
5. Take screenshot of just the popup
6. Place on a nice background in an image editor

---

## After Creating Screenshots

Upload them to Chrome Web Store in this order:
1. Profile tab (primary screenshot - shows first)
2. History tab (unique feature)
3. Extension in action (proof it works)
4. Settings (optional)
5. Learned Data (optional)

The first screenshot is most important - it shows in search results!

---

## Need Help?

If you're stuck:
1. Install the extension
2. Use it on a real job application to generate history
3. Open popup in well-lit area
4. Take clean screenshots
5. Use any image editor to crop to 1280x800

**Remember:** The screenshots sell your extension. Take your time to make them look good!
