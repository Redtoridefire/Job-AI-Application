# GitHub Pages Setup Guide

Follow these steps to host your privacy policy on GitHub Pages (100% free).

## Step 1: Enable GitHub Pages

1. **Go to your repository on GitHub:**
   ```
   https://github.com/Redtoridefire/Job-AI-Application
   ```

2. **Click on "Settings"** (top right of the repository)

3. **Scroll down to "Pages"** (in the left sidebar under "Code and automation")

4. **Configure GitHub Pages:**
   - **Source:** Deploy from a branch
   - **Branch:** Select `main` (or your default branch)
   - **Folder:** Select `/docs`
   - Click **Save**

5. **Wait 1-2 minutes** for deployment

6. **Your privacy policy will be live at:**
   ```
   https://redtoridefire.github.io/Job-AI-Application/privacy.html
   ```

---

## Step 2: Verify It Works

1. **Click the link** GitHub provides (or wait 1-2 minutes)
2. **Navigate to:**
   ```
   https://redtoridefire.github.io/Job-AI-Application/privacy.html
   ```
3. **You should see** your formatted privacy policy

---

## Step 3: Use in Chrome Web Store

When filling out the Chrome Web Store listing:

**Privacy Policy URL field:**
```
https://redtoridefire.github.io/Job-AI-Application/privacy.html
```

Just copy and paste that URL!

---

## Troubleshooting

### "404 - Page not found"
- Wait 2-5 minutes after enabling Pages
- Make sure you selected `/docs` folder, not `/` (root)
- Make sure `privacy.html` is in the `docs/` folder
- Check that the branch is correct (usually `main`)

### "Settings tab doesn't show Pages"
- Make sure the repository is public (not private)
- GitHub Pages is free for public repos

### Need to update privacy policy later?
1. Edit `docs/privacy.html`
2. Commit and push to GitHub
3. Changes appear automatically in 1-2 minutes

---

## File Structure (Already Created)

```
Job-AI-Application/
├── docs/
│   └── privacy.html          ← GitHub Pages will serve this
├── PRIVACY_POLICY.md          ← Markdown version for reference
└── GITHUB_PAGES_SETUP.md      ← This file
```

---

## That's it!

Your privacy policy is now:
- ✅ Hosted for free on GitHub Pages
- ✅ Has a professional URL
- ✅ Will never expire
- ✅ Automatically updates when you push changes
- ✅ Ready to submit to Chrome Web Store

---

## Alternative: Custom Domain (Optional)

If you have a custom domain (e.g., yourname.com):

1. Add a `CNAME` file to `docs/` folder with your domain
2. Configure DNS settings at your domain provider
3. Enable "Enforce HTTPS" in GitHub Pages settings
4. Privacy policy URL becomes: `https://yourname.com/privacy.html`

But the GitHub Pages URL works perfectly fine for Chrome Web Store!
