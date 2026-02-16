# Production Deployment Guide: Dimensions Audit Authenticator

## Current Status: Development Environment ⚠️
- **Environment**: Development
- **Status**: Backend failing (500 error on ZohoSyncHub)
- **Root Cause**: ZohoSyncHub function needs Zoho CRM connection configuration

---

## Issue to Fix First: Backend Authentication 🔧

### Problem:
The `ZohoSyncHub` function is returning 500 because it's trying to access Zoho CRM without proper Catalyst-to-CRM connection.

### Solution:
1. **Configure Catalyst Connections** (In Catalyst Console):
   - Go to: Settings → Integrations → Zoho Services
   - Add a **Zoho CRM Connection**
   - Grant permissions: `ZohoCRM.modules.ALL`

2. **Update ZohoSyncHub to use the connection**:
   ```javascript
   // In index.js, replace:
   const zcrm = app.zcrm();
   
   // With:
   const connection = app.connection('zoho_crm'); // Named connection
   const zcrm = connection.getConnector();
   ```

3. **Test locally** with `catalyst serve` before deploying.

---

## Production Deployment Steps 🚀

### Prerequisites:
✅ Backend functions working (fix above issue first)
✅ Local testing passed (`npm run dev` works)
✅ Mock data displays correctly

### Step 1: Create Production Environment

```powershell
cd "c:\Users\shubh\Downloads\Dimentions Audit Authenticator\ZohoIntegrationEngine"
catalyst env:create --name Production
```

### Step 2: Configure Production Settings

In Catalyst Console:
1. Go to your project
2. Navigate to **Environments** → **Production**
3. Set environment variables (if any):
   - `NODE_ENV=production`

### Step 3: Deploy to Production

```powershell
# Switch to production environment
catalyst env:use Production

# Deploy everything
catalyst deploy
```

### Step 4: Embed in Zoho CRM as Web Tab

**Option A: As a CRM Web Tab**

1. **In Zoho CRM**:
   - Setup → Customization → Modules and Fields
   - Choose a module (e.g., "Products")
   - Click **Links** → **New Web Tab**

2. **Configuration**:
   - **Name**: Dimensions Audit
   - **URL**: `https://[your-catalyst-domain].production.catalystserverless.com/app/index.html`
   - **Where to show**: Module view (or wherever you want)

**Option B: As a CRM Widget**

1. **Convert to Widget**:
   - Create a `widget.html` wrapper
   - Use Zoho SDK: `ZOHO.CRM.UI.Popup.open(...)`

2. **Configure in CRM**:
   - Setup → Developer Space → Widgets
   - Upload your app as a widget

**Option C: Standalone App (Recommended for now)**

Just use the Catalyst URL directly:
```
https://zohocrmbulkdataprocessingintegrityengine-913495338.production.catalystserverless.com/app/index.html
```

---

## Deployment Checklist ✅

### Before Production:
- [ ] Fix ZohoSyncHub 500 error
- [ ] Test all features locally
- [ ] Verify Bulk Apply works
- [ ] Test Warehouse Entry module
- [ ] Check Admin Dashboard displays data

### During Production:
- [ ] Create Production environment in Catalyst
- [ ] Deploy functions first (`catalyst deploy --only functions`)
- [ ] Test backend endpoints
- [ ] Deploy client (`catalyst deploy --only client`)
- [ ] Verify UI loads

### After Production:
- [ ] Test with real Zoho CRM data
- [ ] Add monitoring/alerts
- [ ] Document user workflows
- [ ] Train warehouse staff

---

## Current Recommendation 💡

**DON'T deploy to production yet.** Here's why:

1. The backend is failing (500 error)
2. We need to configure Zoho CRM connection in Catalyst
3. We should test with real data in Development first

**Next Immediate Steps:**
1. Fix the Zoho CRM connection in ZohoSyncHub
2. Test in Development environment
3. Once working, create Production environment
4. Deploy and verify

---

## Alternative: Stay with Local Development

If Catalyst is proving complex, you can:
1. Keep using `npm run dev` with mock data
2. Deploy a traditional Node.js backend elsewhere
3. Use Catalyst only for hosting (not for CRM integration)

Let me know which approach you prefer!
