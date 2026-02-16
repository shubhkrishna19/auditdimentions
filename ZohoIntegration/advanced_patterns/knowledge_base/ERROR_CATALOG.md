# 🐛 Error Catalog

**Purpose:** Common errors and their solutions  
**Target Audience:** Developers & AI Agents debugging integration issues  
**Last Updated:** 2026-02-03

---

## 🔍 How to Use This Catalog

1. **Search** for your error message (Ctrl+F)
2. **Read** the Cause and Solution
3. **Try** the solution
4. **If it works:** Great! Move on.
5. **If it doesn't:** Add your error to this catalog with the CAUSE and SOLUTION once you solve it!

---

## 📋 Error Index

1. [Field Not Found](#error-field-not-found)
2. [Product/Record Not Found](#error-productrecord-not-found)
3. [Validation Failed](#error-validation-failed)
4. [API Rate Limit](#error-api-rate-limit)
5. [Invalid Oauth Token](#error-invalid-oauth-token)
6. [Subform Not Updating](#error-subform-not-updating)
7. [Workflow Not Triggering](#error-workflow-not-triggering)
8. [Decimal Precision Loss](#error-decimal-precision-loss)

---

## Errors & Solutions

### Error: Field Not Found

**Example Messages:**
- `"Field 'Billed_Physical_Weight' doesn't exist"`
- `"Invalid field api_name: Billed_Volumetric_Weight"`
- `"The given entity is unavailable"`

**Cause:**
The custom field doesn't exist in Zoho CRM OR it exists but isn't on the Page Layout.

**Solution:**
1. **Check if field exists:**
   - Go to: Setup → Customization → Modules → Parent_MTP_SKU → Fields
   - Search for the field name
   
2. **If field doesn't exist:**
   - Follow `../../../IMMEDIATE_ACTION_CHECKLIST.md` to create it
   
3. **If field exists but error persists:**
   - Check API Name: Setup → Fields → API Names tab
   - Ensure it matches exactly (case-sensitive!)
   - Update `config/field_mappings.json` if different

4. **If API name is correct:**
   - Check if field is on Page Layout: Setup → Layouts → Edit Standard Layout
   - Drag field from "Unused Fields" to layout
   - Save

**Prevention:**
- Always run `verifySchema()` before syncing
- Keep `config/field_mappings.json` updated with actual Zoho API names

---

### Error: Product/Record Not Found

**Example Messages:**
- `"No data available for the criteria specified"`
- `"Product ABC-123 not found in CRM"`
- `"No records found matching criteria"`

**Cause:**
- Product doesn't exist in Zoho (SKU mismatch or typo)
- Search criteria is wrong
- Product exists but in different module (Parent_MTP_SKU vs Products)

**Solution:**
1. **Verify SKU:** Check spelling and case (SKUs are case-sensitive)
2. **Check Module:** Ensure searching in correct module (Parent_MTP_SKU vs Products)
3. **Manual Check:** Open Zoho CRM and search for the product
4. **If product truly missing:** Create it manually in Zoho first

**Code Fix:**
```javascript
// Add better error message
const existing = await searchProduct(sku);
if (existing.length === 0) {
  throw new Error(
    `Product ${sku} not found in Parent_MTP_SKU module. ` +
    `Please verify SKU spelling and ensure product exists in CRM.`
  );
}
```

**Prevention:**
- Import all products to Zoho BEFORE syncing dimensions
- Validate SKU list against CRM first

---

### Error: Validation Failed

**Example Messages:**
- `"Value must be a positive number"`
- `"Weight cannot be negative"`
- `"Invalid weight category"`

**Cause:**
Data doesn't meet validation rules defined in `config/field_mappings.json`

**Solution:**
1. **Check the validation rule:**
   - Open `config/field_mappings.json`
   - Find the field → Check `validation` property
   
2. **Common fixes:**
   - Negative weight: Ensure weight > 0
   - Wrong units: Convert grams to kg (divide by 1000)
   - Invalid picklist: Ensure value is in allowed options

**Code Example:**
```javascript
// Before sending:
if (weight < 0) {
  console.warn(`Invalid weight: ${weight}. Setting to 0.`);
  weight = 0;
}

// Or convert units:
const weightKg = weightGrams / 1000;
```

**Prevention:**
- Validate data BEFORE sending to API
- Use `DataValidator.js` class for consistent validation

---

### Error: API Rate Limit

**Example Messages:**
- `"Too many requests"`
- `"Rate limit exceeded"`
- `"Please try after some time"`

**Cause:**
Sending too many API requests too quickly. Zoho limits to ~100 requests/minute.

**Solution:**
1. **Add delays between batches:**
   ```javascript
   await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
   ```

2. **Reduce batch size:**
   ```javascript
   const BATCH_SIZE = 10; // Instead of 50
   ```

3. **Implement exponential backoff:**
   ```javascript
   async function retryWithBackoff(fn, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.message.includes('rate limit') && i < retries - 1) {
           await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
         } else {
           throw error;
         }
       }
     }
   }
   ```

**Prevention:**
- Use batch processing (Pattern 3 in BEST_PRACTICES.md)
- Add 500ms delays between batches
- Never call API in tight loop

---

### Error: Invalid Oauth Token

**Example Messages:**
- `"Invalid oauth token"`
- `"Authentication failed"`
- `"Session expired"`

**Cause:**
Zoho SDK not initialized or session expired

**Solution:**
1. **Reinitialize SDK:**
   ```javascript
   await ZOHO.embeddedApp.init();
   ```

2. **Refresh page:** Sometimes a hard refresh fixes it

3. **Check widget configuration:**
   - Ensure widget is properly installed in Zoho CRM
   - Check `plugin-manifest.json` has correct scopes

**Prevention:**
- Always call `init()` before any API operations
- Handle session expiry gracefully in production

---

### Error: Subform Not Updating

**Example Messages:**
- `"Box dimensions not showing"`
- `"Subform data disappeared"`
- `"Bill_Dimension_Weight is null"`

**Cause:**
- Sending empty array `[]` deletes all subform rows
- Incorrect subform field structure
- Missing required subform fields

**Solution:**
1. **Never send empty array:**
   ```javascript
   // ❌ WRONG: Deletes all boxes
   Bill_Dimension_Weight: []
   
   // ✅ CORRECT: Omit field if no changes
   const updateData = { id: recordId };
   if (boxes.length > 0) {
     updateData.Bill_Dimension_Weight = boxes;
   }
   ```

2. **Check field structure:**
   ```javascript
   // Correct structure (from field_mappings.json)
   {
     Box_Number: 1,
     Box_Measurement: 'cm',
     Length: 70,
     Width: 23,
     Height: 5,
     Weight_Measurement: 'kg',
     Weight: 1.89
   }
   ```

3. **Verify subform exists:**
   - Setup → Modules → Parent_MTP_SKU → Fields
   - Ensure "Bill Dimension Weight" is type "Subform"

**Prevention:**
- Always validate subform data structure
- Never send empty arrays to subform fields

---

### Error: Workflow Not Triggering

**Example Messages:**
- (No error, but Zoho workflows don't run)

**Cause:**
`updateRecord()` doesn't trigger workflows by default

**Solution:**
Add `Trigger: ["workflow"]` to API call:

```javascript
await ZOHO.CRM.API.updateRecord({
  Entity: 'Parent_MTP_SKU',
  APIData: { id: recordId, ...data },
  Trigger: ["workflow"]  // ← Add this!
});
```

**Prevention:**
- Always include Trigger if you have Zoho workflows
- Test workflows after implementing

---

### Error: Decimal Precision Loss

**Example Messages:**
- (No error, but weights like 5.123 become 5.12 or 5.13)

**Cause:**
JavaScript floating point precision issues

**Solution:**
```javascript
// Round to 3 decimal places BEFORE sending
const weight = 5.123456789;
const rounded = parseFloat(weight.toFixed(3)); // 5.123
```

**Prevention:**
- Always use `.toFixed(3)` for weights
- Store as strings if precision is critical

---

## 🆕 Adding New Errors

Found a new error? Add it here!

**Template:**
```markdown
### Error: [Error Name]

**Example Messages:**
- "Exact error message 1"
- "Exact error message 2"

**Cause:**
What causes this error

**Solution:**
1. Step 1
2. Step 2
3. Code example if applicable

**Prevention:**
How to avoid this in the future
```

---

## 📞 Emergency: Error Not Listed?

1. **Check Zoho logs:** Setup → Developer Space → Logs
2. **Check browser console:** F12 → Console tab
3. **Search Zoho docs:** https://www.zoho.com/crm/developer/docs/
4. **Add error to this catalog** once solved!

---

**Last Updated:** 2026-02-03 - Audit Dimensions App  
**Contributors:** Claude 4.5 (Codex), Future You 🚀
