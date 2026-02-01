# Zoho AI Development - Setup Guide

## 🎯 What You Now Have

A **connected development ecosystem** where:
1. **I can see your Zoho environment** (modules, fields, data)
2. **Generate code based on your actual structure** (not guessing)
3. **Iterate in real-time** (deploy → test → fix → repeat)
4. **You describe what you want** (vibe coding)

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
cd "c:\Users\shubh\Downloads\Dimentions Audit Authenticator\zoho-ai-generator"
npm install
```

### Step 2: Get Zoho API Credentials

1. **Go to Zoho API Console**
   - Visit: https://api-console.zoho.com/
   - Click "Add Client"

2. **Create OAuth Client**
   - Client Type: **Server-based Applications**
   - Client Name: `Zoho AI Generator`
   - Homepage URL: `http://localhost`
   - Authorized Redirect URIs: `http://localhost:3000/callback`

3. **Copy Credentials**
   - Client ID: `1000.XXXXXXXXXXXXX`
   - Client Secret: `YYYYYYYYYYYYYYYY`

4. **Generate Refresh Token**
   ```bash
   # Visit this URL (replace CLIENT_ID):
   https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.functions.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=http://localhost:3000/callback
   
   # After authorization, you'll get a CODE in the URL
   # Exchange it for refresh token:
   curl -X POST https://accounts.zoho.com/oauth/v2/token \
     -d "code=YOUR_CODE" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=http://localhost:3000/callback" \
     -d "grant_type=authorization_code"
   
   # Copy the "refresh_token" from response
   ```

### Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
notepad .env
```

**Fill in:**
```env
ZOHO_CLIENT_ID=1000.XXXXXXXXXXXXX
ZOHO_CLIENT_SECRET=YYYYYYYYYYYYYYYY
ZOHO_REFRESH_TOKEN=1000.ZZZZZZZZZZZZZZ.AAAAAAAAAAAA
ZOHO_ORG_ID=your_org_id
```

### Step 4: Connect to Zoho

```bash
# Inspect your Zoho environment
node cli.js
# Select: "🔍 Inspect Zoho Environment"
# Enter modules: Products
```

**What happens:**
- ✅ Connects to your Zoho CRM
- ✅ Fetches all fields in Products module
- ✅ Gets sample records
- ✅ Saves snapshot for AI to use
- ✅ Generates human-readable report

---

## 💡 How the Connected Ecosystem Works

### Before (Blind Development):
```
You: "Add a live status field"
Me: "What's the field name? What module? What's the parent field called?"
You: "Let me check... it's called Parent_SKU in Products..."
Me: "Okay, generating code..."
[Code doesn't work because field name was actually Parent_Product]
```

### After (Connected Development):
```
You: "Add a live status field"
Me: [Inspects Zoho] "I see you have Products module with:
     - Parent_SKU (lookup to Products)
     - Product_Active (boolean)
     - Live_Status (text field)
     Should I sync Live_Status based on Parent_SKU's Product_Active?"
You: "Yes!"
Me: [Generates code with exact field names]
[Code works first time]
```

---

## 🔄 Iteration Workflow

### 1. Initial Generation
```bash
node cli.js
# Select: "✨ Generate Code"
# Choose: "🔗 Parent-Child Status Sync"
# AI shows you actual fields from your Zoho
# You select from dropdown (no typing mistakes!)
```

### 2. Deploy
```bash
# For Client Scripts (automated):
node deploy-client-script.js --file generated/live_status_sync.js --module Products

# For Deluge (manual paste):
# Follow the deployment guide that was generated
```

### 3. Test
```bash
node cli.js
# Select: "🧪 Test Deployed Code"
# Enter function name
# See results immediately
```

### 4. Fix & Iterate
```
If test fails:
1. I see the error from Zoho API
2. I analyze what went wrong
3. I regenerate fixed code
4. You redeploy
5. Test again
6. Repeat until working
```

---

## 🎨 Usage Examples

### Example 1: Live Status Field (Your Use Case)

```bash
$ node cli.js

🤖 Zoho AI Development Assistant

✅ Loaded environment snapshot from 1/29/2026, 5:45 PM

What would you like to do?
> ✨ Generate Code (Vibe Coding)

What type of code do you want to generate?
> 🔗 Parent-Child Status Sync

Which module?
> Products

Which field links to parent?
> Parent_SKU (Parent_SKU)

Which field shows the status?
> Live_Status (Live_Status)

Value when parent is active?
> Y

Value when parent is inactive?
> NL

✅ Code generated successfully!

📄 File: live_status_sync.js
📁 Path: c:\Users\shubh\...\generated\live_status_sync.js

# Deployment Instructions: Live Status Sync
[Full deployment guide shown]
```

### Example 2: Dimension Variance Calculator

```bash
$ node cli.js
> ✨ Generate Code
> 🧮 Field Calculation

Which module?
> Products

Describe the calculation:
> Calculate variance between billed and actual dimensions

💡 AI Suggestion based on your description:

Available numeric fields:
  - Billed Length (Billed_Length)
  - Billed Width (Billed_Width)
  - Billed Height (Billed_Height)
  - Actual Length (Actual_Length)
  - Actual Width (Actual_Width)
  - Actual Height (Actual_Height)

Input fields (comma-separated):
> Billed_Length, Billed_Width, Billed_Height, Actual_Length, Actual_Width, Actual_Height

Result field:
> Variance_Percentage

Formula:
> ((Actual_Length * Actual_Width * Actual_Height - Billed_Length * Billed_Width * Billed_Height) / (Billed_Length * Billed_Width * Billed_Height)) * 100

✅ Code generated!
```

---

## 📊 How I See Your Zoho Environment

After running `Inspect Zoho`, I can see:

```json
{
  "modules": {
    "Products": {
      "fields": [
        {
          "api_name": "Product_Name",
          "display_label": "Product Name",
          "data_type": "text",
          "required": true
        },
        {
          "api_name": "Parent_SKU",
          "display_label": "Parent SKU",
          "data_type": "lookup",
          "lookup": {
            "module": "Products"
          }
        },
        {
          "api_name": "Live_Status",
          "display_label": "Live Status",
          "data_type": "text"
        }
      ],
      "sampleRecords": [
        {
          "Product_Name": "Widget A",
          "Parent_SKU": { "id": "123", "name": "Parent Widget" },
          "Live_Status": "Y"
        }
      ]
    }
  }
}
```

**This means:**
- ✅ I know exact field names (no typos)
- ✅ I know field types (text, number, lookup, etc.)
- ✅ I know relationships (which fields link to which modules)
- ✅ I can suggest relevant fields based on your description
- ✅ I can validate formulas against actual data types

---

## 🔧 Minor Changes & Microadjustments

### Scenario: You want to change the active value from "Y" to "Live"

**Option 1: Regenerate (Fast)**
```bash
node cli.js
# Select same options but change "Y" to "Live"
# Takes 30 seconds
```

**Option 2: Manual Edit (Faster)**
```javascript
// In generated file, change:
statusField.setValue('Y');
// To:
statusField.setValue('Live');

// Redeploy
```

**Option 3: Tell Me (Easiest)**
```
You: "Change Y to Live"
Me: [Regenerates with new value]
```

---

## 🎯 Next Steps

### Immediate (Today):
1. **Set up OAuth credentials** (Step 2 above)
2. **Run first inspection** (`node cli.js` → Inspect)
3. **Generate live status code** (your use case)
4. **Deploy and test**

### This Week:
1. **Implement 2-3 more use cases** (dimension variance, validations)
2. **Refine iteration workflow** based on your feedback
3. **Add browser automation** (optional, for 100% hands-free deployment)

### This Month:
1. **Build Catalyst deployment** (Approach C)
2. **Create Creator app templates** (Approach A)
3. **Establish full "vibe coding" workflow**

---

## ❓ FAQ

### Q: How do you see my Zoho apps?
**A:** Via Zoho CRM API. I fetch module metadata (fields, types, relationships) and sample records. I don't see passwords or sensitive data.

### Q: Can you see the UI/layout?
**A:** Not yet. I see data structure and fields. For UI, you can share screenshots and I'll understand the layout.

### Q: How fast is iteration?
**A:** 
- Code generation: **Instant**
- Client Script deployment: **30 seconds** (automated)
- Deluge deployment: **1-2 minutes** (manual paste)
- Testing: **Instant** (via API)
- **Total iteration cycle: ~3-5 minutes**

### Q: What if generated code has bugs?
**A:** 
1. Test framework catches errors
2. I see the error message from Zoho
3. I analyze and regenerate fixed code
4. You redeploy
5. Usually fixed in 1-2 iterations

### Q: Can you deploy directly without me pasting?
**A:** 
- **Client Scripts:** Yes (via ZDK CLI - coming soon)
- **Deluge:** No (Zoho API limitation, requires manual paste)
- **Workaround:** Browser automation (2-3 days to build)

---

## 🚨 Troubleshooting

### Error: "Failed to get access token"
- Check `.env` credentials are correct
- Ensure refresh token hasn't expired
- Regenerate refresh token (Step 2)

### Error: "Module not found"
- Check module name spelling (case-sensitive)
- Run `node zoho-inspector.js inspect Products` to verify

### Error: "Permission denied"
- Check OAuth scopes include `ZohoCRM.modules.ALL`
- Regenerate token with correct scopes

---

## 📞 Support

**Need help?**
- Share error messages (I can debug)
- Share screenshots of your Zoho UI (I can understand layout)
- Describe what you want to build (I'll generate code)

**Want to iterate?**
- "Change X to Y" → I regenerate
- "Add validation for Z" → I update code
- "This doesn't work" → Share error, I fix

---

> [!TIP]
> **Start small:** Get the live status field working first. Once you see the iteration workflow in action, you'll understand how to build anything in Zoho with "vibe coding"!
