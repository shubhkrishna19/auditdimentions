# 📦 Data Integrator Module

**Version:** 1.0.0  
**Purpose:** Portable, robust, self-documenting module for Zoho CRM data integration across all apps  
**Created:** 2026-02-03  
**Last Updated:** 2026-02-03

---

## 🎯 What This Module Does

This is a **copy-and-paste** module that any app can use to connect to Zoho CRM with:
- ✅ Pre-configured field mappings
- ✅ Data validation and integrity checks
- ✅ Rollback/restore capabilities  
- ✅ Transaction logging
- ✅ Self-documenting integration patterns
- ✅ Accumulated best practices from multiple projects

## 📁 Folder Structure

```
src/modules/DataIntegrator/
├── README.md                    # You are here
├── config/                      # Configuration Files
│   ├── field_mappings.json      # CRM Field API Names & Data Types
│   ├── validation_rules.js      # Data quality rules
│   └── modules_schema.json      # CRM Module structures
├── core/                        # Core Integration Logic
│   ├── Connector.js             # Base connector class
│   ├── ZohoProvider.js          # Zoho-specific implementation
│   ├── TransactionManager.js    # Rollback & checkpoint system
│   ├── DataValidator.js         # Pre-sync validation
│   └── ErrorHandler.js          # Centralized error management
├── knowledge_base/              # Agent & Developer Documentation
│   ├── INTEGRATION_GUIDE.md     # How to use this module
│   ├── BEST_PRACTICES.md        # Accumulated wisdom  
│   ├── ERROR_CATALOG.md         # Common issues & solutions
│   └── CHANGELOG.md             # Integration pattern evolution
└── logs/                        # Transaction History (gitignored)
    └── .gitkeep
```

---

## 🚀 Quick Start

### For AI Agents
1. Read `knowledge_base/INTEGRATION_GUIDE.md` first
2. Check `config/field_mappings.json` for current schema
3. Use `core/ZohoProvider.js` for all CRM operations
4. Log new patterns in `knowledge_base/BEST_PRACTICES.md`

### For Developers  
```javascript
import ZohoProvider from './modules/DataIntegrator/core/ZohoProvider';

const zoho = new ZohoProvider();
await zoho.init();

// All field names are mapped automatically
await zoho.updateProduct('ABC-123', {
  physicalWeight: 5.2,  // Maps to Billed_Physical_Weight
  volumetricWeight: 4.8  // Maps to Billed_Volumetric_Weight
});
```

---

## 🛡️ Data Integrity Features

### 1. **Checkpointing** (Before Every Write)
```javascript
// Automatic backup before update
const checkpoint = await zoho.createCheckpoint('ABC-123');
await zoho.updateProduct('ABC-123', newData);
// If something goes wrong:
await zoho.restoreCheckpoint(checkpoint.id);
```

### 2. **Validation** (Before Sending to CRM)
```javascript
// Data is validated against rules before API call
const result = await zoho.updateProduct('ABC-123', {
  physicalWeight: -5  // ❌ Fails: Weight cannot be negative
});
// Error caught locally, no bad data sent to Zoho
```

### 3. **Transaction Logging** (Every Operation Tracked)
```javascript
// All operations logged to logs/transaction_history.json
{
  "timestamp": "2026-02-03T11:19:00Z",
  "operation": "UPDATE",
  "module": "Parent_MTP_SKU",
  "recordId": "123456",
  "fields": ["Billed_Physical_Weight"],
  "oldValue": 5.0,
  "newValue": 5.2,
  "status": "SUCCESS"
}
```

---

## 🔧 Configuration Files

### `config/field_mappings.json`
Maps app field names to Zoho API names:
```json
{
  "Parent_MTP_SKU": {
    "physicalWeight": {
      "zohoApiName": "Billed_Physical_Weight",
      "type": "decimal",
      "required": false,
      "validation": "positive_number"
    }
  }
}
```

### `config/validation_rules.js`
Defines data quality checks:
```javascript
export const rules = {
  positive_number: (value) => value >= 0,
  required: (value) => value != null && value !== '',
  max_length: (value, limit) => value.length <= limit
};
```

---

## 📖 Knowledge Base

### `knowledge_base/BEST_PRACTICES.md`
- **MTP SKU Relationships:** Parent SKUs don't aggregate child weights
- **Weight Calculations:** Always convert to same units before MAX()
- **Batch Operations:** Use 10 records per batch, 500ms delay

### `knowledge_base/ERROR_CATALOG.md`
- **Error:** "Field Billed_Physical_Weight not found"
  - **Cause:** Field doesn't exist in Zoho layout
  - **Fix:** See IMMEDIATE_ACTION_CHECKLIST.md

---

## 🔄 Portability

### To Use in Another App:
1. **Copy** entire `src/modules/DataIntegrator` folder
2. **Update** `config/field_mappings.json` with new app's fields
3. **Merge** best practices from both apps
4. Done! 🎉

### To Merge Updates from Another App:
```bash
# If another app has new patterns/fixes
git merge other-app:src/modules/DataIntegrator/knowledge_base/BEST_PRACTICES.md
# Review and accept new learnings
```

---

## 🤝 Contributing Knowledge

When you discover a new integration pattern:
1. Document it in `knowledge_base/BEST_PRACTICES.md`
2. Add field mappings to `config/field_mappings.json`
3. Add validation rules if needed in `config/validation_rules.js`
4. Update `knowledge_base/CHANGELOG.md`

**Future AI agents thank you! 🙏**

---

## 📊 Current Status

### Modules Configured:
- ✅ Parent_MTP_SKU (Weight audit fields)
- ⏳ Products (Child products - pending)

### Features Implemented:
- ✅ Field mapping system
- ✅ Transaction logging structure
- ⏳ Checkpoint/restore (in progress)
- ⏳ Pre-sync validation (in progress)

### Apps Using This Module:
1. Audit Dimensions App (this app)

---

## 🆘 Support

### For AI Agents:
- All context is in `knowledge_base/` folder
- Start with `INTEGRATION_GUIDE.md`
- Field mappings are always in `config/`

### For Humans:
- See `IMMEDIATE_ACTION_CHECKLIST.md` for Zoho setup
- See `knowledge_base/ERROR_CATALOG.md` for troubleshooting

---

**This README is maintained by AI agents working on integration projects.**  
**Last updated by:** Codex (Claude 4.5 Sonnet)  
**Project:** Audit Dimensions - Zoho CRM Integration
