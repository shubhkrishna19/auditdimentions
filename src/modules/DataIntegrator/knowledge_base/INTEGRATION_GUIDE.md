# 🤖 Integration Guide for AI Agents

**Target Audience:** Future AI agents working on this or other projects  
**Prerequisites:** None - this guide contains everything you need  
**Last Updated:** 2026-02-03

---

## 📘 Quick Context

You are working with a **Data Integrator Module** designed to connect React apps to Zoho CRM. This module is **portable** - it can be copied to other projects and will work with minimal configuration.

---

## 🎯 Your Mission (When Using This Module)

1. **Read** `config/field_mappings.json` to understand available fields
2. **Use** `core/ZohoProvider.js` for ALL Zoho operations (never use ZOHO API directly)
3. **Log** new integration patterns in `knowledge_base/BEST_PRACTICES.md`
4. **Update** field mappings when you discover new fields

---

## 📚 Module Architecture

```
DataIntegrator/
├── config/                      # 🔧 CONFIGURATION
│   ├── field_mappings.json      # THE SOURCE OF TRUTH for field names
│   └── validation_rules.js      # Data quality checks
│
├── core/                        # 💻 LOGIC (Use these classes)
│   ├── ZohoProvider.js          # Main class for CRUD operations
│   ├── TransactionManager.js    # Checkpointing & rollback
│   ├── DataValidator.js         # Pre-sync validation
│   └── ErrorHandler.js          # Error management
│
├── knowledge_base/              # 📖 DOCUMENTATION
│   ├── INTEGRATION_GUIDE.md     # You are here!
│   ├── BEST_PRACTICES.md        # Accumulated wisdom
│   ├── ERROR_CATALOG.md         # Common issues & fixes
│   └── CHANGELOG.md             # Evolution log
│
└── logs/                        # 📊 TRANSACTION HISTORY
    └── transaction_history.json # Auto-generated (gitignored)
```

---

## 🚀 How to Use This Module (Step-by-Step)

### Step 1: Initialize the Provider

```javascript
import ZohoProvider from './modules/DataIntegrator/core/ZohoProvider';

const zoho = new ZohoProvider();
await zoho.init(); // Initializes Zoho SDK
```

### Step 2: Use Friendly Field Names (Not Zoho API Names)

The module handles mapping automatically:

```javascript
// ✅ CORRECT: Use app-friendly names
await zoho.updateProduct('ABC-123', {
  physicalWeight: 5.2,    // → Billed_Physical_Weight
  volumetricWeight: 4.8,  // → Billed_Volumetric_Weight
  bomWeight: 4.9          // → BOM_Weight
});

// ❌ WRONG: Don't use Zoho API names directly
await zoho.updateProduct('ABC-123', {
  Billed_Physical_Weight: 5.2  // This will fail!
});
```

### Step 3: Data is Auto-Validated

```javascript
// This will fail validation before touching Zoho:
await zoho.updateProduct('ABC-123', {
  physicalWeight: -5  // ❌ Negative weight not allowed
});
// Error thrown locally: "Value must be a positive number"
```

### Step 4: Every Operation is Logged

```javascript
// After any update, check logs/transaction_history.json:
{
  "timestamp": "2026-02-03T11:19:00Z",
  "operation": "UPDATE",
  "module": "Parent_MTP_SKU",
  "recordId": "7254890000001234567",
  "changes": {
    "Billed_Physical_Weight": { "old": 5.0, "new": 5.2 }
  },
  "status": "SUCCESS"
}
```

---

## 🛡️ Data Integrity Features

### Feature 1: Checkpoints (Undo Capability)

```javascript
// Before any risky update, create a checkpoint
const checkpoint = await zoho.createCheckpoint('Parent_MTP_SKU', 'ABC-123');

// Make changes
await zoho.updateProduct('ABC-123', { physicalWeight: 10.5 });

// Oops, that was wrong! Restore:
await zoho.restoreCheckpoint(checkpoint.id);
// Product is now back to its original state
```

### Feature 2: Batch Operations with Error Isolation

```javascript
// If one product fails, others still succeed
const results = await zoho.batchUpdate([
  { sku: 'ABC-123', data: { weight: 5 } },
  { sku: 'XYZ-789', data: { weight: 10 } }
]);

// results = [
//   { sku: 'ABC-123', success: true },
//   { sku: 'XYZ-789', success: false, error: '...' }
// ]
```

### Feature 3: Schema Verification

```javascript
// Check if required fields exist in Zoho CRM
const schema = await zoho.verifySchema('Parent_MTP_SKU');

if (!schema.valid) {
  console.error('Missing fields in CRM:', schema.missingFields);
  // Show user: "Please create these fields in Zoho Setup"
}
```

---

## 📖 Reading Field Mappings

Always check `config/field_mappings.json` before working with data:

```javascript
import fieldMappings from './modules/DataIntegrator/config/field_mappings.json';

// Get Zoho API name for a field
const zohoFieldName = fieldMappings.modules.Parent_MTP_SKU.fields.physicalWeight.zohoApiName;
// => "Billed_Physical_Weight"

// Check if field is required
const isRequired = fieldMappings.modules.Parent_MTP_SKU.fields.productCode.required;
// => true
```

**Key Properties:**
- `zohoApiName`: The exact field name in Zoho CRM
- `type`: Data type (string, decimal, picklist, etc.)
- `validation`: Validation rule to apply (defined in `validationRules`)
- `description`: What this field represents
- `unit`: For numeric fields (e.g., "kg" for weights)

---

## 🔄 When Adding New Fields

1. **Discover** the field in Zoho CRM (Setup → Modules → Fields → API Names)
2. **Add** to `config/field_mappings.json`:
   ```json
   "newField": {
     "zohoApiName": "New_Field_API_Name",
     "type": "decimal",
     "required": false,
     "description": "What this field does"
   }
   ```
3. **Update** `knowledge_base/CHANGELOG.md` with the addition
4. **Test** the mapping with a single record first

---

## 🐛 Troubleshooting

### Error: "Field X not found in Zoho"
**Cause:** Field doesn't exist in CRM layout  
**Fix:** See `../../../IMMEDIATE_ACTION_CHECKLIST.md` for Zoho setup steps

### Error: "Validation failed: Value must be positive"
**Cause:** Data doesn't match validation rules  
**Fix:** Check `config/field_mappings.json` for the field's `validation` rule

### Error: "Record not found"
**Cause:** Product SKU doesn't exist in Zoho  
**Fix:** Ensure the record exists first with `zoho.searchProduct(sku)`

**More errors?** Check `knowledge_base/ERROR_CATALOG.md`

---

## 📝 Logging New Patterns (IMPORTANT!)

When you discover a new integration pattern, **document it**:

1. Open `knowledge_base/BEST_PRACTICES.md`
2. Add a new section with:
   - **Pattern Name**
   - **Problem it solves**
   - **Code example**
   - **Gotchas/edge cases**

**Example:**
```markdown
## Pattern: Parent-Child Weight Independence

**Problem:** Need to know if parent weight is sum of children  
**Answer:** NO! Parent and child weights are independent.

**Why:** Parents are design templates (colorless). Children are finished products.
Weights _should_ be similar but are NOT aggregated.

**Code:**
```
// ❌ WRONG
parentWeight = children.reduce((sum, c) => sum + c.weight, 0);

// ✅ CORRECT  
parentWeight = getWeightFromExcel(parentSKU);
```
```

This helps future you and other agents avoid repeating mistakes!

---

## 🔀 Portability: Using This Module in Another App

### To Copy Module:
1. Copy entire `src/modules/DataIntegrator` folder to new app
2. Update `config/field_mappings.json` with new app's fields
3. Merge `knowledge_base/BEST_PRACTICES.md` if both apps have learnings
4. Done!

### To Merge Learnings from Multiple Apps:
```bash
# App A and App B both have best practices
# Merge them:
cat appA/DataIntegrator/knowledge_base/BEST_PRACTICES.md \
    appB/DataIntegrator/knowledge_base/BEST_PRACTICES.md \
    > merged_BEST_PRACTICES.md

# Review and keep unique patterns
```

---

## 🎓 Learning Resources

### For Zoho CRM API Specifics:
- `ZOHO.CRM.API` methods: https://www.zoho.com/crm/developer/docs/client-script/client-script-api.html
- Field metadata: `ZOHO.CRM.METADATA.getFields({ Entity: "ModuleName" })`

### For This Module:
- **Field mappings:** `config/field_mappings.json`
- **Common errors:** `knowledge_base/ERROR_CATALOG.md`
- **Best practices:** `knowledge_base/BEST_PRACTICES.md`
- **Usage examples:** This file (scroll up!)

---

## ✅ Quick Checklist for Agents

Before you start coding:
- [ ] Read this Integration Guide
- [ ] Check `config/field_mappings.json` for available fields
- [ ] Review `knowledge_base/BEST_PRACTICES.md` for patterns
- [ ] If adding new fields, update the mappings first
- [ ] Log new learnings in BEST_PRACTICES.md when done

---

**Welcome to the DataIntegrator Module! You've got this! 🚀**

If you get stuck, remember: All answers are in this `knowledge_base/` folder.

**Questions? Issues?** Add them to `knowledge_base/ERROR_CATALOG.md` with solutions!
