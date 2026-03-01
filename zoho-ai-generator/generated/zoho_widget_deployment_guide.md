# Zoho CRM Widget Integration - Deployment Guide

## 🎯 Quick Deployment Steps

We'll deploy your Dimension Audit app to Zoho CRM using a Widget that embeds the React app.

---

## Step 1: Host the React App

### Option A: Use Zoho Catalyst (Recommended - Free)

1. **Go to Zoho Catalyst Console**
   - Visit: https://catalyst.zoho.com
   - Login with your Zoho account

2. **Create New Project**
   - Click "Create Project"
   - Name: `dimension-audit-app`
   - Type: Web Client

3. **Upload Build Files**
   - Upload all files from `dist/` folder
   - Set `index.html` as entry point

4. **Deploy**
   - Click "Deploy"
   - Copy the deployment URL (e.g., `https://dimension-audit-app.catalyst.zoho.com`)

### Option B: Quick Test with Local Server

For immediate testing:

```bash
cd "c:\Users\shubh\Downloads\Dimentions Audit Authenticator"
npx serve dist -p 8080
```

**Test URL:** `http://localhost:8080`

---

## Step 2: Create Custom Module in Zoho CRM

1. **Go to Zoho CRM** → Setup → Customization → **Modules and Fields**

2. **Click "New Module"**

3. **Configure Module:**
   - **Module Name:** `Audit_Dimensions`
   - **Plural Label:** `Audit Dimensions`
   - **Icon:** Choose audit/document icon
   - **Description:** `Track dimension variations between billing and audit`

4. **Add Fields:**

| Field Label | Field Type | Required |
|------------|------------|----------|
| Audit_ID | Auto Number | Yes |
| Product_Code | Single Line | Yes |
| Billed_Length | Decimal | No |
| Billed_Width | Decimal | No |
| Billed_Height | Decimal | No |
| Actual_Length | Decimal | No |
| Actual_Width | Decimal | No |
| Actual_Height | Decimal | No |
| Length_Variance | Decimal | No |
| Width_Variance | Decimal | No |
| Height_Variance | Decimal | No |
| Total_Variance | Decimal | No |
| Variance_Percentage | Decimal | No |
| Audit_Date | Date | Yes |
| Status | Picklist | Yes |

**Status Picklist Values:**
- Approved
- Flagged
- Under Review
- Rejected

5. **Save Module**

---

## Step 3: Create Widget for the App

1. **Go to:** Setup → Developer Hub → **Widgets**

2. **Click "Create Widget"**

3. **Widget Configuration:**
   - **Widget Name:** `Dimension Audit Tool`
   - **Hosting:** External (or Catalyst if using Option A)
   - **Widget Type:** Custom Page
   - **URL:** Your deployment URL (from Step 1)

4. **Widget Settings:**
   - **Width:** 100%
   - **Height:** 800px (or Auto)
   - **Allow Full Screen:** Yes

5. **Permissions:**
   - **Modules:** Audit_Dimensions, Products
   - **API Access:** Read, Write

6. **Save Widget**

---

## Step 4: Add Widget to Module Page

1. **Go to:** Setup → Customization → **Modules and Fields**

2. **Select:** `Audit_Dimensions` module

3. **Click:** Page Layouts → Edit Layout

4. **Add Widget Section:**
   - Drag "Widget" component to the layout
   - Select: `Dimension Audit Tool`
   - Position: Top of page (full width)

5. **Save Layout**

---

## Step 5: Test the Integration

1. **Go to CRM** → Audit Dimensions module

2. **Click "New"** or open any record

3. **You should see:**
   - Your React app embedded in the page
   - Premium dark UI intact
   - File upload functionality working

---

## 🔧 Alternative: Standalone Page Widget

If you want the app as a separate page (not in a record):

1. **Go to:** Setup → Customization → **Modules and Fields**

2. **Select:** Audit_Dimensions

3. **Related Lists** → Add **Custom Button**
   - **Button Label:** `Launch Audit Tool`
   - **Action:** Open Widget
   - **Widget:** Dimension Audit Tool

4. **Users click button** → App opens in modal/new tab

---

## 📊 Data Integration (Optional)

To save audit results to CRM:

### Add API Integration to React App

1. **Install Zoho CRM SDK:**
```bash
npm install @zohocrm/javascript-sdk
```

2. **Add save function to your React app:**
```javascript
async function saveAuditToCRM(auditData) {
    const response = await fetch('https://www.zohoapis.com/crm/v2/Audit_Dimensions', {
        method: 'POST',
        headers: {
            'Authorization': 'Zoho-oauthtoken YOUR_TOKEN',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: [auditData]
        })
    });
    return response.json();
}
```

3. **Call after processing Excel:**
```javascript
const auditRecord = {
    Product_Code: row.productCode,
    Billed_Length: row.billedLength,
    Actual_Length: row.actualLength,
    Length_Variance: row.variance,
    // ... other fields
};
await saveAuditToCRM(auditRecord);
```

---

## ✅ Deployment Checklist

- [ ] React app built (`npm run build`)
- [ ] App hosted (Catalyst or local server)
- [ ] Deployment URL obtained
- [ ] Custom module created in CRM
- [ ] Fields added to module
- [ ] Widget created with correct URL
- [ ] Widget added to page layout
- [ ] Tested app loads in CRM
- [ ] File upload works
- [ ] UI displays correctly

---

## 🆘 Troubleshooting

### Widget shows blank page
- Check deployment URL is accessible
- Verify CORS headers if using external hosting
- Check browser console for errors

### File upload not working
- Ensure widget has proper permissions
- Check file size limits
- Verify browser security settings

### Styling looks broken
- Check if CSS files loaded correctly
- Verify asset paths in build
- Test in different browser

---

## 🚀 Next Steps

1. **Deploy to Catalyst** (recommended for production)
2. **Add data sync** to save results to CRM
3. **Link to Products module** for easy access
4. **Add reports** to visualize audit trends

---

**Ready to deploy?** Start with Step 1 and let me know if you need help with any step!
