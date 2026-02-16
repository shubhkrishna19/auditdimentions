# Zoho Integration Troubleshooting Guide

Common issues and solutions for Zoho CRM integrations.

---

## SDK Issues

### Issue: SDK Not Loading

**Symptoms**:
- `ZOHO is not defined`
- Widget shows blank page
- Console error: "Cannot read property 'embeddedApp' of undefined"

**Solutions**:

1. **Check SDK URL in index.html**
   ```html
   <script src="https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js"></script>
   ```

2. **Verify script loaded before your code**
   ```javascript
   window.addEventListener('load', () => {
     if (typeof ZOHO === 'undefined') {
       console.error('❌ Zoho SDK failed to load!');
     } else {
       console.log('✅ Zoho SDK loaded');
       ZOHO.embeddedApp.init();
     }
   });
   ```

3. **Check network tab** for 404 or CORS errors

---

### Issue: SDK Init Timeout

**Symptoms**:
- Widget loads but never initializes
- No PageLoad event fired
- App stuck on loading screen

**Solutions**:

1. **Add timeout to init**
   ```javascript
   async function initWithTimeout(timeoutMs = 10000) {
     return Promise.race([
       new Promise((resolve) => {
         ZOHO.embeddedApp.on("PageLoad", resolve);
         ZOHO.embeddedApp.init();
       }),
       new Promise((_, reject) =>
         setTimeout(() => reject(new Error('SDK init timeout')), timeoutMs)
       )
     ]);
   }

   try {
     await initWithTimeout(5000);
   } catch (error) {
     console.error('SDK failed to initialize:', error);
     // Show error message to user
   }
   ```

2. **Check widget settings** in Zoho CRM
   - Setup → Developer Space → Widgets
   - Verify widget URL is correct
   - Check "Where to Show" settings

3. **Clear browser cache** and reload widget

---

### Issue: Widget Not Showing in CRM

**Symptoms**:
- Widget configured but doesn't appear
- Shows in Developer Space but not in records

**Solutions**:

1. **Check "Where to Show" configuration**
   - Edit widget in Developer Space
   - Add locations: Products (Detail Page, Related List, etc.)

2. **Verify module permissions**
   - User must have access to the module
   - Check profile permissions

3. **Refresh CRM page** (hard refresh: Ctrl+F5)

---

## API Issues

### Issue: MANDATORY_NOT_FOUND

**Error Message**:
```json
{
  "code": "MANDATORY_NOT_FOUND",
  "details": { "api_name": "Product_Name" },
  "message": "required field not found"
}
```

**Solutions**:

1. **Include required fields in update**
   ```javascript
   await ZOHO.CRM.API.updateRecord({
     Entity: 'Products',
     APIData: {
       id: productId,
       Product_Name: 'Required field',  // Don't forget!
       Total_Weight: 5.5
     }
   });
   ```

2. **Check field validation rules** in CRM
   - Setup → Modules → Products → Fields
   - Look for "Required" checkbox

3. **Use schema verification**
   ```javascript
   const schema = await ZOHO.CRM.META.getFields({ Entity: 'Products' });
   const requiredFields = schema.fields.filter(f => f.required);
   console.log('Required fields:', requiredFields.map(f => f.api_name));
   ```

---

### Issue: INVALID_MODULE

**Error Message**:
```json
{
  "code": "INVALID_MODULE",
  "message": "the module name given seems to be invalid"
}
```

**Solutions**:

1. **Use correct module API name**
   ```javascript
   // ✅ Correct
   ZOHO.CRM.API.getAllRecords({ Entity: 'Products' });
   ZOHO.CRM.API.getAllRecords({ Entity: 'Parent_MTP_SKU' });

   // ❌ Wrong
   ZOHO.CRM.API.getAllRecords({ Entity: 'Product' }); // Missing 's'
   ZOHO.CRM.API.getAllRecords({ Entity: 'ParentMTPSKU' }); // Wrong format
   ```

2. **Get list of available modules**
   ```javascript
   const modules = await ZOHO.CRM.META.getModules();
   console.log('Available modules:', modules.map(m => m.api_name));
   ```

---

### Issue: INVALID_DATA

**Error Message**:
```json
{
  "code": "INVALID_DATA",
  "details": { "api_name": "Total_Weight" },
  "message": "invalid data"
}
```

**Solutions**:

1. **Check data types**
   ```javascript
   // ❌ Wrong - string instead of number
   Total_Weight: "5.5"

   // ✅ Correct
   Total_Weight: 5.5
   ```

2. **Validate picklist values**
   ```javascript
   // ❌ Wrong - invalid picklist value
   Product_Category: "Invalid Category"

   // ✅ Correct - must match CRM picklist
   Product_Category: "Mattress"
   ```

3. **Check field constraints**
   - Decimal places
   - Min/max values
   - Field length limits

---

## Pagination Issues

### Issue: Only Getting 200 Records

**Symptoms**:
- `getAllRecords` returns 200 records
- But CRM has 500+ records

**Solutions**:

1. **Implement pagination loop**
   ```javascript
   async function fetchAllRecords(module) {
     let allRecords = [];
     let page = 1;
     let hasMore = true;

     while (hasMore) {
       const response = await ZOHO.CRM.API.getAllRecords({
         Entity: module,
         page: page,
         per_page: 200
       });

       const records = response.data || [];
       allRecords = allRecords.concat(records);

       if (records.length < 200) {
         hasMore = false;
       } else {
         page++;
       }
     }

     return allRecords;
   }
   ```

2. **Check `info` object in response**
   ```javascript
   const response = await ZOHO.CRM.API.getAllRecords({...});
   console.log('More records?', response.info.more_records);
   console.log('Page:', response.info.page);
   console.log('Per page:', response.info.per_page);
   ```

---

## Rate Limit Issues

### Issue: Too Many Requests

**Error Message**:
```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "API rate limit exceeded"
}
```

**Solutions**:

1. **Add delays between batches**
   ```javascript
   for (let i = 0; i < products.length; i += 10) {
     const batch = products.slice(i, i + 10);

     await Promise.all(
       batch.map(p => updateProduct(p))
     );

     // Wait 500ms before next batch
     await new Promise(r => setTimeout(r, 500));
   }
   ```

2. **Reduce batch size**
   ```javascript
   // Instead of 20 per batch
   const batchSize = 10; // Smaller batches

3. **Implement exponential backoff**
   ```javascript
   async function updateWithRetry(data, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         return await ZOHO.CRM.API.updateRecord({...});
       } catch (error) {
         if (error.code === 'RATE_LIMIT_EXCEEDED') {
           const delay = 1000 * Math.pow(2, i); // 1s, 2s, 4s...
           console.warn(`Rate limit hit, waiting ${delay}ms...`);
           await new Promise(r => setTimeout(r, delay));
         } else {
           throw error;
         }
       }
     }
   }
   ```

---

## Subform Issues

### Issue: Subform Data Not Updating

**Symptoms**:
- Update call succeeds
- But subform data unchanged in CRM

**Solutions**:

1. **Send data as array**
   ```javascript
   // ✅ Correct - array of objects
   Bill_Dimension_Weight: [
     { BL: 1, Length: 50, Width: 30, Height: 20, Weight: 2.5 }
   ]

   // ❌ Wrong - single object
   Bill_Dimension_Weight: { BL: 1, Length: 50, Width: 30, Height: 20, Weight: 2.5 }
   ```

2. **Include record ID in update**
   ```javascript
   await ZOHO.CRM.API.updateRecord({
     Entity: 'Products',
     APIData: {
       id: productId,  // Required!
       Bill_Dimension_Weight: boxes
     }
   });
   ```

3. **Check field API names**
   ```javascript
   // Parent module uses different field names!
   // Parent: MTP_Box_Dimensions (Box field)
   // Child: Bill_Dimension_Weight (BL field)
   ```

---

### Issue: Subform Rows Duplicating

**Symptoms**:
- Running script multiple times
- Subform shows duplicate rows (Box 1, Box 1, Box 1...)

**Solutions**:

1. **Clear before adding**
   ```javascript
   // Option 1: Send empty array first
   await ZOHO.CRM.API.updateRecord({
     Entity: 'Products',
     APIData: {
       id: productId,
       Bill_Dimension_Weight: []  // Clear all rows
     }
   });

   // Then add new rows
   await ZOHO.CRM.API.updateRecord({
     Entity: 'Products',
     APIData: {
       id: productId,
       Bill_Dimension_Weight: newBoxes
     }
   });
   ```

2. **Use cleanup script**
   ```bash
   node ZohoIntegration/scripts/cleanup_duplicate_boxes.cjs
   ```

3. **Check for duplicates before adding**
   ```javascript
   function deduplicateBoxes(boxes) {
     const seen = new Set();
     const unique = [];

     for (const box of boxes) {
       const key = `${box.BL}-${box.Length}-${box.Width}-${box.Height}-${box.Weight}`;
       if (!seen.has(key)) {
         seen.add(key);
         unique.push(box);
       }
     }

     return unique;
   }
   ```

---

## MCP Script Issues

### Issue: ERR_REQUIRE_ESM

**Error Message**:
```
Error [ERR_REQUIRE_ESM]: require() of ES Module ... not supported
```

**Solutions**:

1. **Use `.cjs` extension**
   ```bash
   # Rename file
   mv script.js script.cjs

   # Run with .cjs extension
   node script.cjs
   ```

2. **Or remove "type": "module" from package.json**
   ```json
   {
     "name": "my-app",
     // Remove this line:
     // "type": "module"
   }
   ```

---

### Issue: MCP Client Connection Failed

**Error Message**:
```
Error: MCP Client connection failed
```

**Solutions**:

1. **Check `.env.mcp` file exists**
   ```bash
   ls -la .env.mcp
   ```

2. **Verify credentials format**
   ```env
   ZOHO_CLIENT_ID=1000.XXXXX
   ZOHO_CLIENT_SECRET=xxxxx
   ZOHO_REFRESH_TOKEN=1000.xxxxx.xxxxx
   ZOHO_API_DOMAIN=https://www.zohoapis.com
   ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
   ```

3. **Test OAuth token**
   ```bash
   curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
     -d "refresh_token=YOUR_REFRESH_TOKEN" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "grant_type=refresh_token"
   ```

---

### Issue: Cannot Find Module '@modelcontextprotocol/sdk'

**Error Message**:
```
Error: Cannot find module '@modelcontextprotocol/sdk'
```

**Solutions**:

1. **Install MCP SDK**
   ```bash
   npm install @modelcontextprotocol/sdk
   ```

2. **Check package.json**
   ```json
   {
     "dependencies": {
       "@modelcontextprotocol/sdk": "^latest"
     }
   }
   ```

3. **Run npm install**
   ```bash
   npm install
   ```

---

## Data Issues

### Issue: Weights Showing as 0.000 kg

**Symptoms**:
- All weights show as 0 or very small numbers
- Weights in CRM are actually in KG, not grams

**Solutions**:

1. **DON'T divide by 1000**
   ```javascript
   // ❌ WRONG - CRM weights are already in KG!
   const weight = product.Total_Weight / 1000;

   // ✅ CORRECT - use as-is
   const weight = product.Total_Weight;
   ```

2. **Only convert Excel imports**
   ```javascript
   // Excel → CRM (grams to kg)
   const excelWeight = 34400; // grams
   const crmWeight = excelWeight / 1000; // 34.4 kg

   // CRM → Display (already kg)
   const displayWeight = product.Total_Weight; // Already in KG
   ```

---

### Issue: SKU Not Found in Search

**Symptoms**:
- Search by SKU returns no results
- But SKU exists in CRM

**Solutions**:

1. **Normalize SKU before search**
   ```javascript
   function normalizeSKU(sku) {
     return sku.trim().toUpperCase().replace(/\s+/g, '-');
   }

   const sku = normalizeSKU(userInput);
   const results = await ZOHO.CRM.API.searchRecord({
     Entity: 'Products',
     Type: 'criteria',
     Query: `(Product_Code:equals:${sku})`
   });
   ```

2. **Check field API name**
   ```javascript
   // Parent module: "Name" field
   // Child module: "Product_Code" field
   ```

3. **Use "contains" instead of "equals"**
   ```javascript
   Query: `(Product_Code:contains:${sku})`
   ```

---

## Deployment Issues

### Issue: Build Fails on Deployment

**Symptoms**:
- `npm run build` fails
- Vite errors

**Solutions**:

1. **Check for TypeScript errors**
   ```bash
   npm run build -- --mode development
   ```

2. **Clear node_modules and reinstall**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

3. **Check import paths**
   ```javascript
   // ✅ Correct - relative path
   import ZohoAPI from '../services/ZohoAPI';

   // ❌ Wrong - missing extension in some configs
   import ZohoAPI from '../services/ZohoAPI.js';
   ```

---

### Issue: Widget Shows Blank After Deployment

**Symptoms**:
- Build succeeds
- But widget shows blank page in CRM

**Solutions**:

1. **Check browser console** for errors

2. **Verify base path in vite.config.js**
   ```javascript
   export default defineConfig({
     base: './', // Relative paths for Catalyst Slate
   });
   ```

3. **Check Content Security Policy headers**
   ```json
   // slate.config.json
   {
     "headers": {
       "Content-Security-Policy": "frame-ancestors 'self' https://*.zoho.com"
     }
   }
   ```

4. **Hard refresh** browser (Ctrl+Shift+R)

---

## Performance Issues

### Issue: Slow Data Loading

**Symptoms**:
- Widget takes 10+ seconds to load data
- Fetching 500+ products is slow

**Solutions**:

1. **Use field selection**
   ```javascript
   // ❌ Slow - fetches all fields
   ZOHO.CRM.API.getAllRecords({ Entity: 'Products' });

   // ✅ Fast - only needed fields
   ZOHO.CRM.API.getAllRecords({
     Entity: 'Products',
     Fields: 'Product_Code,Product_Name,Total_Weight'
   });
   ```

2. **Implement pagination with progress**
   ```javascript
   let loadedCount = 0;
   const products = await fetchAllRecords('Products', 'all', (progress) => {
     loadedCount = progress.total;
     updateUI(`Loading... ${loadedCount} products`);
   });
   ```

3. **Cache data** in localStorage
   ```javascript
   const cacheKey = 'products_cache';
   const cached = localStorage.getItem(cacheKey);

   if (cached) {
     const { data, timestamp } = JSON.parse(cached);

     // Cache valid for 1 hour
     if (Date.now() - timestamp < 3600000) {
       return data;
     }
   }

   // Fetch fresh data
   const products = await fetchAllRecords('Products');

   // Save to cache
   localStorage.setItem(cacheKey, JSON.stringify({
     data: products,
     timestamp: Date.now()
   }));
   ```

---

## Quick Checklist

When encountering issues, check:

- [ ] Browser console for errors
- [ ] Network tab for failed requests
- [ ] Zoho SDK loaded (check `typeof ZOHO`)
- [ ] Widget configuration in Developer Space
- [ ] Module/field API names are correct
- [ ] Data types match CRM schema
- [ ] Pagination implemented for > 200 records
- [ ] Rate limiting (500ms delay) for batch ops
- [ ] `.env.mcp` credentials are valid
- [ ] Package dependencies installed (`npm install`)

---

**Last Updated**: February 15, 2026
