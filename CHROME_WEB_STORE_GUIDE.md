# 🚀 Chrome Web Store Submission Guide

## Prerequisites

Before submitting to Chrome Web Store, you need:

1. **Chrome Web Store Developer Account**
   - Visit: https://chrome.google.com/webstore/devconsole
   - One-time registration fee: $5 USD
   - You'll need a Google account

2. **Extension Package**
   - All files ready in the `c:\shopify scraper` folder
   - Icons generated and in place
   - Documentation complete

---

## Step 1: Push Code to GitHub

Your repository is set up at: https://github.com/mudassirsaleem47/scrapify.git

**To push your code:**

```bash
cd "c:\shopify scraper"
git push -u origin main
```

You'll be prompted for GitHub credentials. If you have 2FA enabled, you'll need to use a Personal Access Token instead of your password.

**Creating a Personal Access Token (if needed):**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "Scrapify Push"
4. Select scope: `repo` (full control of private repositories)
5. Generate and copy the token
6. Use this token as your password when pushing

---

## Step 2: Create Extension ZIP File

Create a ZIP file containing only the necessary extension files:

**Files to include:**
- ✅ `manifest.json`
- ✅ `popup.html`
- ✅ `popup.css`
- ✅ `popup.js`
- ✅ `scraper.js`
- ✅ `content.js`
- ✅ `icon16.png`
- ✅ `icon48.png`
- ✅ `icon128.png`

**Files to EXCLUDE:**
- ❌ `.git` folder
- ❌ `.gitignore`
- ❌ `README.md`
- ❌ `PRIVACY_POLICY.md`
- ❌ `STORE_LISTING.md`
- ❌ `CSV_FIX_GUIDE.md`
- ❌ Any CSV files

**Creating the ZIP:**

**Option 1 - PowerShell Command:**
```powershell
Compress-Archive -Path manifest.json,popup.html,popup.css,popup.js,scraper.js,content.js,icon16.png,icon48.png,icon128.png -DestinationPath scrapify-v1.0.0.zip
```

**Option 2 - Manual:**
1. Create a new folder called `scrapify-package`
2. Copy only the files listed above into it
3. Right-click the folder → Send to → Compressed (zipped) folder
4. Rename to `scrapify-v1.0.0.zip`

---

## Step 3: Prepare Store Listing Content

Open `STORE_LISTING.md` and have this information ready:

### Required Information:

1. **Short Description** (132 characters max):
   ```
   Export products from any Shopify store to a ready-to-import CSV file. Fast, easy, and Shopify-compatible.
   ```

2. **Detailed Description**: Copy from STORE_LISTING.md

3. **Category**: 
   - Primary: Shopping
   - Secondary: Productivity

4. **Language**: English

5. **Privacy Policy URL**: 
   ```
   https://github.com/mudassirsaleem47/scrapify/blob/main/PRIVACY_POLICY.md
   ```

6. **Support URL**:
   ```
   https://github.com/mudassirsaleem47/scrapify
   ```

---

## Step 4: Create Screenshots (Optional but Recommended)

Screenshots help users understand your extension. You need at least 1, maximum 5.

**Screenshot Requirements:**
- Size: 1280x800 or 640x400 pixels
- Format: PNG or JPEG
- Show the extension in action

**Recommended Screenshots:**
1. Extension popup interface
2. Scraping in progress with progress bar
3. Success message after scraping
4. CSV file preview
5. Shopify import demonstration

You can create these by:
1. Loading the extension in Chrome
2. Using it on a Shopify store
3. Taking screenshots (Windows + Shift + S)
4. Cropping to 1280x800 pixels

---

## Step 5: Submit to Chrome Web Store

### 5.1 Access Developer Dashboard
1. Go to: https://chrome.google.com/webstore/devconsole
2. Sign in with your Google account
3. Pay the $5 registration fee (if first time)

### 5.2 Create New Item
1. Click "New Item" button
2. Upload `scrapify-v1.0.0.zip`
3. Click "Upload"

### 5.3 Fill Store Listing

**Product Details Tab:**
- **Name**: Scrapify
- **Summary**: (Copy from STORE_LISTING.md - short description)
- **Description**: (Copy from STORE_LISTING.md - detailed description)
- **Category**: Shopping
- **Language**: English

**Graphic Assets Tab:**
- **Icon**: Already included in ZIP (128x128)
- **Screenshots**: Upload your screenshots (at least 1)
- **Promotional Tile** (optional): 440x280 pixels

**Privacy Tab:**
- **Single Purpose**: "Export Shopify products to CSV format"
- **Permission Justification**:
  - `activeTab`: "Required to access the current Shopify store page"
  - `scripting`: "Required to extract product data from the page"
  - `downloads`: "Required to save the generated CSV file"
  - `host_permissions`: "Required to access Shopify store websites"
- **Privacy Policy**: https://github.com/mudassirsaleem47/scrapify/blob/main/PRIVACY_POLICY.md
- **Data Usage**: Select "Does not collect user data"

**Distribution Tab:**
- **Visibility**: Public
- **Regions**: All regions (or select specific countries)

### 5.4 Submit for Review
1. Review all information
2. Click "Submit for Review"
3. Wait for approval (typically 1-3 business days)

---

## Step 6: After Submission

### What Happens Next:
1. **Automated Review**: Chrome's automated systems check for policy violations
2. **Manual Review**: Google team reviews your extension (1-3 days)
3. **Approval/Rejection**: You'll receive an email

### If Approved:
- ✅ Extension goes live on Chrome Web Store
- ✅ Users can install it
- ✅ You'll get a public URL like: `chrome.google.com/webstore/detail/scrapify/[extension-id]`

### If Rejected:
- ❌ You'll receive specific reasons
- ❌ Fix the issues
- ❌ Re-submit

---

## Common Rejection Reasons & How to Avoid

1. **Misleading Description**: 
   - ✅ Be honest about what the extension does
   - ✅ Don't promise features you don't have

2. **Privacy Policy Issues**:
   - ✅ We've included a comprehensive privacy policy
   - ✅ Make sure it's accessible at the GitHub URL

3. **Excessive Permissions**:
   - ✅ We only request necessary permissions
   - ✅ Each permission is justified

4. **Broken Functionality**:
   - ✅ Test the extension thoroughly before submitting
   - ✅ Make sure it works on multiple Shopify stores

---

## Post-Publication Checklist

After your extension is live:

- [ ] Update README.md with Chrome Web Store link
- [ ] Share on social media
- [ ] Monitor reviews and feedback
- [ ] Respond to user questions
- [ ] Plan updates based on user feedback

---

## Updating Your Extension

When you want to release an update:

1. Make changes to your code
2. Update version in `manifest.json` (e.g., 1.0.0 → 1.0.1)
3. Create new ZIP file
4. Go to Developer Dashboard
5. Click on your extension
6. Click "Upload Updated Package"
7. Submit for review again

---

## Support & Resources

- **Chrome Web Store Developer Documentation**: https://developer.chrome.com/docs/webstore/
- **Extension Policies**: https://developer.chrome.com/docs/webstore/program-policies/
- **Your GitHub Repository**: https://github.com/mudassirsaleem47/scrapify
- **Privacy Policy**: https://github.com/mudassirsaleem47/scrapify/blob/main/PRIVACY_POLICY.md

---

## Quick Reference Commands

```bash
# Push to GitHub
cd "c:\shopify scraper"
git push -u origin main

# Create ZIP package
Compress-Archive -Path manifest.json,popup.html,popup.css,popup.js,scraper.js,content.js,icon16.png,icon48.png,icon128.png -DestinationPath scrapify-v1.0.0.zip
```

---

**Good luck with your Chrome Web Store submission! 🚀**

If you have any questions or run into issues, check the Chrome Web Store developer documentation or reach out for help.
