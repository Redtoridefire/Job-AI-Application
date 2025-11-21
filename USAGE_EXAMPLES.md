# Usage Examples & Scenarios

This document provides detailed examples of how to use the Smart Job Autofill extension in various scenarios.

## Example 1: Basic Job Application (Workday)

### Scenario
You're applying for a Software Engineer position at a company using Workday.

### Steps
1. Navigate to the Workday application page
2. Click the extension icon → **Fill Current Page**
3. The extension will automatically fill:
   - Full Name
   - Email
   - Phone Number
   - LinkedIn URL
   - Current Location
   - Work Authorization questions

### What Happens
```
✅ Name field: "John Doe"
✅ Email field: "john@example.com"
✅ Phone field: "+1 (555) 123-4567"
✅ LinkedIn field: "https://linkedin.com/in/johndoe"
✅ Location field: "San Francisco, CA"
✅ Are you authorized to work? "Yes"
```

### After First Application
The extension learns:
- How you answered specific questions
- Your preferences for dropdown selections
- Common response patterns

## Example 2: Multi-Page Application (Greenhouse)

### Scenario
Application has multiple pages with different sections.

### Process
**Page 1: Basic Information**
1. Click **Fill Current Page**
2. Extension fills contact details
3. Click "Next"

**Page 2: Work Experience**
1. Click **Fill Current Page** again
2. Extension uses resume data to suggest filling
3. Some fields may need manual input

**Page 3: Custom Questions**
1. First time: Answer questions manually
2. Extension **learns** your answers
3. Next application: These are auto-filled!

## Example 3: Learning Mode in Action

### First Application
```
Question: "How did you hear about this position?"
Your Answer: "LinkedIn"
Status: ⭐ Learned!
```

### Second Application (Same Question)
```
Question: "How did you hear about this position?"
Auto-filled: "LinkedIn"
Status: ✅ Already filled from learning!
```

### Viewing Learned Data
1. Open extension
2. Go to **Learned Data** tab
3. See all learned questions and answers
4. Option to clear if needed

## Example 4: Custom Work Authorization

### Setup
1. Go to **Settings** tab
2. Set "Preferred Work Authorization" to your status
3. Save settings

### During Application
When encountering questions like:
- "Are you authorized to work in the US?"
- "Will you require sponsorship?"
- "What is your work authorization status?"

The extension automatically selects your preferred answer!

## Example 5: Handling Dropdown Menus

### Example Dropdown: Years of Experience
```html
<select name="experience">
  <option value="">Select...</option>
  <option value="0-1">0-1 years</option>
  <option value="2-4">2-4 years</option>
  <option value="5-7">5-7 years</option>
  <option value="8+">8+ years</option>
</select>
```

### First Time
- You manually select "5-7 years"
- Extension **learns** this choice

### Next Time (Same Field)
- Extension automatically selects "5-7 years"
- No manual input needed!

## Example 6: Resume Upload Workflow

### Step-by-Step
1. Click extension icon
2. Click **Upload Resume**
3. Select your PDF/DOC resume
4. Wait for parsing (takes 2-3 seconds)
5. Review auto-populated fields:
   ```
   Full Name: [Extracted from resume]
   Email: [Extracted from resume]
   Phone: [Extracted from resume]
   LinkedIn: [Extracted from resume]
   ```
6. Make any corrections
7. Click **Save Profile**

### What Gets Extracted
- ✅ Contact information
- ✅ Name (usually from top of resume)
- ✅ Email address
- ✅ Phone number
- ✅ LinkedIn URL (if present)
- 📝 Note: Skills and experience stored for future features

## Example 7: Speed Adjustment

### Slow Fill (800-2000ms)
**Best for**: Conservative approach, sites with anti-bot measures
```
Settings → Fill Speed → 1000ms
Result: Fields fill gradually (looks human-like)
```

### Medium Fill (400-800ms) ⭐ Recommended
**Best for**: Most applications, balanced speed
```
Settings → Fill Speed → 500ms
Result: Fast but natural-looking
```

### Fast Fill (100-400ms)
**Best for**: Quick applications, trusted sites
```
Settings → Fill Speed → 200ms
Result: Very fast filling
```

## Example 8: Right-Click Method

### Quick Fill Without Opening Extension
1. Navigate to application page
2. Right-click anywhere on the page
3. Select "Fill this form with Smart Autofill"
4. Form fills automatically!

**Keyboard Shortcut**: Ctrl+Right-click for faster access

## Example 9: Partial Form Filling

### Scenario
Some fields are already filled (from previous session)

### What Happens
```
Field: First Name
Current Value: "John"
Action: ⏭️ Skipped (already filled)

Field: Last Name
Current Value: ""
Action: ✅ Filled with "Doe"
```

The extension only fills empty fields by default!

## Example 10: Complex Workday Application

### Complete Workday Flow

**Section 1: Personal Information**
```
✅ First Name: "John"
✅ Last Name: "Doe"
✅ Email: "john@example.com"
✅ Phone: "+1 (555) 123-4567"
✅ Country: "United States"
✅ City: "San Francisco"
✅ State: "California"
```

**Section 2: Professional Details**
```
✅ LinkedIn: "https://linkedin.com/in/johndoe"
🔄 Current Company: [Manual or learned]
🔄 Years of Experience: [From learned data]
```

**Section 3: Work Authorization**
```
✅ Authorized to work in US: "Yes"
✅ Require sponsorship: "No"
```

**Section 4: Voluntary Questions**
```
🔄 Gender: [From learned responses]
🔄 Ethnicity: [From learned responses]
🔄 Veteran Status: [From learned responses]
```

## Pro Tips

### Tip 1: Train the Extension
For your first 3-5 applications:
- Fill forms manually
- Let the extension learn
- Check **Learned Data** tab to verify

### Tip 2: Review Before Submit
**Always** review the filled form:
- Verify all information is correct
- Check dropdown selections
- Ensure no fields are missed

### Tip 3: Update Profile Regularly
When your information changes:
- Update in extension settings
- Re-upload resume if needed
- Clear old learned data if necessary

### Tip 4: Use for Multiple Resume Versions
1. Save different profile configurations
2. Switch between them based on job type
3. Maintain accuracy for different roles

### Tip 5: Combine with Manual Input
Extension handles 80% of fields:
- Let it fill standard information
- Focus your time on custom questions
- Write compelling cover letters while it works!

## Common Field Mappings

### Contact Fields
- "Full Name" → Your full name
- "First Name" → First part of full name
- "Last Name" → Last part of full name
- "Email" / "E-mail" / "Email Address" → Your email
- "Phone" / "Mobile" / "Telephone" → Your phone
- "LinkedIn" / "LinkedIn Profile" → Your LinkedIn URL

### Location Fields
- "City" → City from your location
- "State" → State from your location
- "Location" / "Where are you located" → Full location
- "Address" → Full location (or leave for manual)

### Work Authorization
- "Authorized to work" → From settings
- "Require sponsorship" → From settings
- "Work permit" → From settings
- "Visa status" → From settings

## Troubleshooting Examples

### Issue: Field Not Filling
**Possible Causes:**
1. Field has unusual name/ID
2. Site uses custom framework
3. Field requires specific format

**Solution:**
- Fill manually once
- Extension learns for next time

### Issue: Wrong Value Filled
**Cause:** Extension learned incorrect response

**Solution:**
1. Go to **Learned Data** tab
2. Find the incorrect entry
3. Click **Clear All Learned Data**
4. Fill correctly once

### Issue: Too Fast/Too Slow
**Solution:**
- Adjust **Fill Speed** in Settings
- Test different speeds
- 500-800ms works for most sites

---

**Remember**: This tool is designed to assist, not replace your attention. Always review applications before submitting!
