# Extension Distribution & Auto-Update Setup

## Quick Summary
Chrome extensions can auto-update in two ways:
1. **Chrome Web Store** (easiest, recommended for public distribution)
2. **Self-hosted** (using GitHub releases for private distribution)

---

## Option 1: Chrome Web Store (Recommended)

This is the easiest and most reliable method. Chrome automatically updates extensions from the Web Store.

### Steps:
1. **Create a Developer Account**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Pay one-time $5 registration fee

2. **Package Your Extension**
   ```bash
   # Zip all files (excluding git files, node_modules, etc.)
   zip -r extension.zip . -x "*.git*" "node_modules/*" "*.md" "DISTRIBUTION.md" "auto-reload.js"
   ```

3. **Upload to Web Store**
   - Upload the zip file to the dashboard
   - Fill in store listing details
   - Submit for review (usually takes 1-3 days)

4. **Users Install & Auto-Update**
   - Share your Web Store link
   - Chrome automatically updates for all users when you publish new versions

### Publishing Updates:
1. Update `version` in `manifest.json` (e.g., `1.0.0` → `1.0.1`)
2. Create new zip file
3. Upload to Web Store dashboard
4. Submit for review
5. Once approved, all users get the update automatically within hours

---

## Option 2: Self-Hosted Updates (GitHub Releases)

For private distribution or if you don't want to publish publicly.

### Initial Setup:

1. **Enable GitHub Pages** (to host updates.xml)
   - Go to your repo settings
   - Pages → Source → Select `main` branch
   - Save

2. **Get Your Extension ID**
   - Load your unpacked extension in Chrome
   - Go to `chrome://extensions`
   - Note the ID under your extension name (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

3. **Update manifest.json**
   Add this line after `version`:
   ```json
   "update_url": "https://raw.githubusercontent.com/Redtoridefire/Job-AI-Application/main/updates.xml",
   ```

4. **Update updates.xml**
   Replace `YOUR_EXTENSION_ID_HERE` with your actual extension ID

5. **Create a Private Key** (first time only)
   ```bash
   # Chrome will generate this automatically when you pack the extension
   # The .pem file is your private key - KEEP IT SAFE and DON'T commit it!
   ```

### Publishing Updates via GitHub:

1. **Update Version**
   - Edit `manifest.json` and increment version (e.g., `1.0.0` → `1.0.1`)

2. **Pack Extension**
   - Go to `chrome://extensions`
   - Click "Pack extension"
   - Extension root: Select your extension folder
   - Private key: Select your .pem file (from first pack)
   - This creates `extension.crx` and `extension.pem`

3. **Create GitHub Release**
   ```bash
   # Tag the version
   git tag v1.0.1
   git push origin v1.0.1

   # Go to GitHub → Releases → Create new release
   # Upload the .crx file
   ```

4. **Update updates.xml**
   ```xml
   <?xml version='1.0' encoding='UTF-8'?>
   <gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
     <app appid='YOUR_EXTENSION_ID'>
       <updatecheck
         codebase='https://github.com/Redtoridefire/Job-AI-Application/releases/download/v1.0.1/extension.crx'
         version='1.0.1' />
     </app>
   </gupdate>
   ```

5. **Commit and Push**
   ```bash
   git add updates.xml
   git commit -m "Update to version 1.0.1"
   git push
   ```

6. **Users Get Updates**
   - Chrome checks for updates every ~5 hours
   - Users can manually update via `chrome://extensions` → "Update" button

---

## Option 3: Development Workflow

For active development, use one of these:

### A. Manual Reload Helper
1. Install [Extensions Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid)
2. Click the icon after making changes
3. Much faster than navigating to `chrome://extensions`

### B. Auto-Reload (included in this repo)
1. Add this line to `background.js`:
   ```javascript
   importScripts('auto-reload.js');
   ```
2. Change `AUTO_RELOAD_ENABLED` to `true` in `auto-reload.js`
3. Extension will auto-reload when files change
4. **Remember to disable before distribution!**

---

## Best Practices

1. **Version Numbering**
   - Use semantic versioning: `MAJOR.MINOR.PATCH`
   - Example: `1.0.0` → `1.0.1` (bug fix) → `1.1.0` (new feature) → `2.0.0` (breaking change)

2. **Testing**
   - Always test locally before publishing
   - Test the packed .crx file before uploading

3. **Security**
   - **NEVER commit your .pem private key file**
   - Add to `.gitignore`:
     ```
     *.pem
     *.crx
     ```

4. **Changelog**
   - Maintain a CHANGELOG.md
   - Document what changed in each version

---

## Quick Reference

| Method | Pros | Cons |
|--------|------|------|
| **Chrome Web Store** | ✅ Automatic updates<br>✅ Easy for users<br>✅ Trusted source | ❌ $5 fee<br>❌ Review process<br>❌ Public listing |
| **Self-Hosted** | ✅ Private distribution<br>✅ No fees<br>✅ Full control | ❌ Manual setup<br>❌ Users must enable dev mode<br>❌ Less trusted |
| **Development** | ✅ Fast iteration<br>✅ No packaging needed | ❌ Manual updates<br>❌ Only for dev |

---

## Recommended Approach

**For you right now:**
1. Use the Extensions Reloader during active development
2. Once stable, publish to Chrome Web Store
3. Share the Web Store link - users get automatic updates

**For private/beta testing:**
1. Use self-hosted updates via GitHub releases
2. Share instructions for loading the .crx file
3. Beta users get automatic updates

**For active development:**
1. Use Extensions Reloader or auto-reload.js
2. Don't worry about packaging until ready to share
