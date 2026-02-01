# Weight Audit Widget - Zoho CRM Deployment Guide

## 🚀 Quick Deployment Steps

### Option 1: Zoho Catalyst Hosting (Recommended)

#### Step 1: Install Catalyst CLI
```powershell
npm install -g zoho-catalyst-cli
```

#### Step 2: Login to Catalyst
```powershell
catalyst login
```

#### Step 3: Initialize Project
```powershell
cd "c:\Users\shubh\Downloads\Dimentions Audit Authenticator"
catalyst init
```
- Select: **Web Client** project
- Choose: **React** framework
- Use existing `dist/` folder

#### Step 4: Deploy
```powershell
catalyst deploy
```

You'll get a URL like: `https://your-app.catalyst.zoho.com`

---

### Option 2: Simple File Hosting (Fastest)

#### Upload to Zoho Files
1. Go to **Zoho Workdrive** or **Zoho Files**
2. Upload the entire `dist/` folder
3. Get public sharing link
4. Use that URL in widget setup

---

## 🔧 Create CRM Widget

### Step 1: Go to Widget Setup
1. **Zoho CRM** → **Setup** (⚙️)
2. **Developer Space** → **Widgets**
3. Click **Create Widget**

### Step 2: Widget Configuration

**Basic Details:**
- **Widget Name:** Weight Audit Tool
- **Widget Type:** Custom Widget
- **Hosting:** External Hosting

**Widget Settings:**
```json
{
  "name": "Weight Audit Tool",
  "type": "custom",
  "hosting": "external",
  "url": "YOUR_DEPLOYMENT_URL",
  "width": "100%",
  "height": "800px",
  "module": "Products"
}
```

**Permissions:**
- ✅ Read Products
- ✅ Update Products
- ✅ Access Subforms

### Step 3: Add to Products Module

**Option A: Related List Widget**
1. **Setup** → **Modules** → **Products**
2. **Page Layouts** → Edit layout
3. Add **Related List** → Select "Weight Audit Tool"
4. Save

**Option B: Custom Button**
1. **Setup** → **Modules** → **Products**
2. **Links & Buttons** → Create Custom Button
3. **Button Label:** "Audit Weights"
4. **Action:** Open Widget
5. **Widget:** Weight Audit Tool

---

## 📋 Widget HTML Template

If you need a standalone HTML file for hosting:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weight Audit Tool</title>
    <script src="https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js"></script>
    <script type="module" crossorigin src="./assets/index-[hash].js"></script>
    <link rel="stylesheet" crossorigin href="./assets/index-[hash].css">
</head>
<body>
    <div id="root"></div>
</body>
</html>
```

---

## 🔐 Widget Manifest (widget.json)

Create this file for Zoho widget configuration:

```json
{
  "name": "Weight Audit Tool",
  "description": "Compare billed vs audited product weights with category analysis",
  "version": "1.0.0",
  "author": "Your Company",
  "icon": "https://your-icon-url.com/icon.png",
  "hosting": "external",
  "url": "https://your-deployment-url.com",
  "permissions": {
    "modules": ["Products"],
    "operations": ["read", "update"]
  },
  "settings": {
    "width": "100%",
    "height": "800px",
    "resizable": true
  }
}
```

---

## 🧪 Testing After Deployment

### 1. Test Widget Load
- Open any Product record
- Click "Audit Weights" button or view Related List
- Widget should load with products

### 2. Test Data Fetch
- Verify products display with box details
- Check billed weights are correct
- Confirm box dimensions show

### 3. Test Excel Upload
- Prepare test Excel:
  ```
  Product_Code | Audited_Total_Weight
  PROD001      | 3.8
  PROD002      | 5.3
  ```
- Upload and verify comparison

### 4. Test Auto-Save
- Make changes
- Watch for "Saving..." → "✓ Saved"
- Refresh CRM to verify updates

---

## 🐛 Troubleshooting

### Widget Not Loading
- Check CORS settings on hosting
- Verify Zoho SDK is included
- Check browser console for errors

### Data Not Fetching
- Verify widget has Products module permissions
- Check Zoho API credentials
- Test with mock data first

### Auto-Save Not Working
- Check network tab for API calls
- Verify field API names match
- Test batch update permissions

---

## 📦 Deployment Checklist

- [ ] Build production bundle (`npm run build`)
- [ ] Test locally (`npx serve dist -p 8080`)
- [ ] Deploy to Catalyst or file hosting
- [ ] Get deployment URL
- [ ] Create widget in CRM
- [ ] Configure permissions
- [ ] Add to Products module
- [ ] Test with real data
- [ ] Train users

---

## 🎯 Next Steps After Deployment

1. **Add courier slabs** - Configure weight categories for your couriers
2. **Customize fields** - Adjust which fields display in table
3. **Add filters** - Filter by category mismatch, variance threshold
4. **Export reports** - Add CSV export for audit results
5. **Notifications** - Alert on high variance or category mismatches

---

**Ready to deploy!** 🚀

Choose Option 1 (Catalyst) for best integration or Option 2 (File hosting) for quickest setup.
