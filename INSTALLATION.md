# 📦 Installation Guide

## Quick Start (5 Minutes)

### Step 1: Download the Extension
The extension files are in the `job-autofill-extension` folder.

### Step 2: Load into Chrome

1. **Open Chrome** and type in the address bar:
   ```
   chrome://extensions/
   ```
   Press Enter

2. **Enable Developer Mode**
   - Look for the toggle switch in the top-right corner
   - Click it to turn ON Developer Mode
   - You'll see new buttons appear

3. **Load the Extension**
   - Click the **"Load unpacked"** button
   - Navigate to and select the `job-autofill-extension` folder
   - Click "Select Folder" (or "Open")

4. **Confirm Installation**
   - You should see the extension appear in your list
   - Look for "Smart Job Application Autofill"
   - Icon should show a 🎯 target symbol

5. **Pin the Extension** (Recommended)
   - Click the puzzle piece icon 🧩 in Chrome's toolbar
   - Find "Smart Job Application Autofill"
   - Click the pin 📌 icon next to it
   - The extension icon will now appear in your toolbar

### Step 3: Set Up Your Profile

1. **Click the extension icon** in your Chrome toolbar

2. **Upload Your Resume**
   - Click the upload area in the Profile tab
   - Select your resume (PDF, DOC, DOCX, or TXT)
   - Wait 2-3 seconds for parsing

3. **Review Auto-Filled Information**
   - Check that your name, email, phone were extracted correctly
   - Add or correct any missing information
   - Add your LinkedIn URL if not detected

4. **Save Your Profile**
   - Click the **"💾 Save Profile"** button at the bottom
   - You'll see a confirmation message

### Step 4: Configure Settings (Optional)

1. Click the **"Settings"** tab

2. Adjust preferences:
   - **Enable Auto-fill**: Keep this ON
   - **Learning Mode**: Keep this ON (recommended)
   - **AI Smart Fill**: Keep this ON
   - **Fill Speed**: Use default 500ms (or adjust as needed)
   - **Work Authorization**: Select your status

3. Click **"💾 Save Settings"**

### Step 5: Test It Out!

1. **Navigate to a test form** (or a real job application)
   - Try a simple contact form first
   - Or go directly to a job posting

2. **Fill the form**
   - Click the extension icon
   - Click **"⚡ Fill Current Page"**
   - Watch the magic happen!

3. **Review the results**
   - Check that fields are filled correctly
   - Make any manual adjustments needed

## Verification Checklist

After installation, verify these items:

- [ ] Extension appears in `chrome://extensions/`
- [ ] Extension icon is visible in toolbar (or puzzle menu)
- [ ] Clicking icon opens the popup window
- [ ] Profile tab is visible and functional
- [ ] Resume upload works (try uploading a file)
- [ ] Settings tab loads and saves
- [ ] Test fill on a simple form works

## Troubleshooting Installation

### Extension doesn't appear after loading

**Solution:**
1. Refresh the extensions page (`chrome://extensions/`)
2. Make sure you selected the correct folder
3. Check that folder contains `manifest.json`

### Can't find "Load unpacked" button

**Solution:**
- Developer Mode must be enabled first
- Look for the toggle in the top-right corner
- Once enabled, the button will appear

### Extension icon not showing

**Solution:**
1. Click the puzzle piece 🧩 icon in Chrome toolbar
2. Find the extension in the dropdown
3. Click the pin 📌 icon to pin it to toolbar

### "Manifest file is missing or unreadable" error

**Solution:**
- Make sure you're selecting the folder that contains `manifest.json`
- Don't select a parent folder or individual files
- The folder structure should be:
  ```
  job-autofill-extension/
  ├── manifest.json
  ├── popup.html
  ├── popup.js
  └── ...other files
  ```

### Extension loads but doesn't work

**Solution:**
1. Click on "Errors" button in the extension card
2. Check console for error messages
3. Try reloading the extension:
   - Click the refresh icon 🔄 on the extension card
   - Or remove and re-add the extension

## System Requirements

### Browser
- **Google Chrome**: Version 88 or higher
- **Microsoft Edge**: Version 88 or higher (Chromium-based)
- **Brave**: Latest version
- **Other Chromium browsers**: Should work but not officially tested

### Operating System
- ✅ Windows 10/11
- ✅ macOS 10.13+
- ✅ Linux (most distributions)
- ✅ Chrome OS

### Permissions Required
The extension needs these permissions:
- **Storage**: To save your profile and learned data locally
- **Active Tab**: To read and fill forms on current page
- **Scripting**: To inject form-filling code
- **Tabs**: To communicate between popup and content
- **Host Permissions**: To work on all websites

**Note**: All permissions are used locally. No data is sent to external servers.

## First-Time Setup Tips

### 1. Prepare Your Resume
Before installation, have your resume ready in one of these formats:
- PDF (most common)
- DOC/DOCX (Word documents)
- TXT (plain text)

### 2. Have Your Information Ready
The extension will auto-fill, but be ready to provide:
- Full name
- Email address
- Phone number
- LinkedIn URL
- Current location (City, State)
- Work authorization status

### 3. Start with Simple Forms
Don't jump straight to important applications:
1. Test on a practice form first
2. Try a simple contact form
3. Then move to real job applications
4. Let the learning mode improve accuracy

### 4. Review the Documentation
Take 5 minutes to read:
- README.md (main documentation)
- USAGE_EXAMPLES.md (practical examples)
- This installation guide

## Video Tutorial (Coming Soon)

We're working on a video tutorial showing:
- Complete installation process
- First-time setup walkthrough
- Filling your first form
- Advanced features overview

## Need Help?

If you encounter issues:
1. Check the Troubleshooting section above
2. Review the README.md file
3. Check the browser console for errors (F12)
4. Try disabling and re-enabling the extension

## Next Steps

After successful installation:
1. ✅ Read the [README.md](README.md) for full feature documentation
2. ✅ Check [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md) for practical examples
3. ✅ Start with test forms to get comfortable
4. ✅ Enable learning mode for better results
5. ✅ Begin applying to jobs more efficiently!

---

**Congratulations! You're ready to save hours on job applications! 🎉**

*Installation typically takes less than 5 minutes*
