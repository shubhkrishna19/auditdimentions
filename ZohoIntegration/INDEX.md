# 📖 Zoho Integration Module - Complete Index

Quick reference to find what you need.

---

## 🚀 Getting Started

| I want to... | Read this file | Time |
|-------------|----------------|------|
| Get started quickly | [README.md](README.md) | 15 min |
| Understand what's included | [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md) | 10 min |
| See version history | [CHANGELOG.md](CHANGELOG.md) | 5 min |

---

## 📚 Learn Zoho Integration

| Topic | File | Purpose | Time |
|-------|------|---------|------|
| **SDK Basics** | [ZOHO_SDK_REFERENCE.md](knowledge_base/ZOHO_SDK_REFERENCE.md) | Learn all SDK methods, CRUD, pagination | 30 min |
| **CRM Schema** | [FIELD_MAPPINGS.md](knowledge_base/FIELD_MAPPINGS.md) | Understand modules, fields, units | 15 min |
| **Best Practices** | [BEST_PRACTICES.md](knowledge_base/BEST_PRACTICES.md) | 12 proven patterns, anti-patterns | 30 min |
| **MCP Scripts** | [MCP_INTEGRATION.md](knowledge_base/MCP_INTEGRATION.md) | ⚠️ HTTP calls (NOT SDK!) | 20 min |
| **⚠️ MCP Limits** | [MCP_LIMITATIONS.md](knowledge_base/MCP_LIMITATIONS.md) | **CRITICAL**: MCP is READ-ONLY! | 10 min |
| **Fix Issues** | [TROUBLESHOOTING.md](knowledge_base/TROUBLESHOOTING.md) | Common errors + solutions | As needed |

**Total Learning Time**: ~2 hours

---

## 🔧 Use Services

| Service | File | Purpose | Lines |
|---------|------|---------|-------|
| **Main CRM Service** | [ZohoAPI.js](services/ZohoAPI.js) | CRUD, pagination, batch updates | ~400 |
| **Excel Parser** | [DimensionAuditParser.js](services/DimensionAuditParser.js) | Parse Excel, match SKUs | ~300 |

### Quick Example

```javascript
import ZohoAPI from './ZohoIntegration/services/ZohoAPI';

const zoho = new ZohoAPI();
await zoho.init();

// Fetch all products (with pagination)
const products = await zoho.fetchAllRecords('Products');

// Update a product
await zoho.updateProduct({
  id: '123456',
  Total_Weight: 5.5
});
```

---

## 📜 Run Scripts

| Script | File | Purpose | When to Use |
|--------|------|---------|-------------|
| **Deduplicate Boxes** | [cleanup_duplicate_boxes.cjs](scripts/cleanup_duplicate_boxes.cjs) | Remove duplicate subform entries | After running population multiple times |
| **Populate IDs** | [populate_product_identifiers.cjs](scripts/populate_product_identifiers.cjs) | Add platform IDs from Excel | Initial data import |

### Quick Run

```bash
# Clean duplicate boxes
node ZohoIntegration/scripts/cleanup_duplicate_boxes.cjs

# Populate platform IDs
node ZohoIntegration/scripts/populate_product_identifiers.cjs
```

---

## ⚙️ Configuration

| File | Purpose | Format |
|------|---------|--------|
| [.env.example](config/.env.example) | Credentials template | ENV |
| [field_mappings.json](config/field_mappings.json) | CRM schema in JSON | JSON (150 lines) |
| [slate.config.json](config/slate.config.json) | Deployment config | JSON |

---

## 📖 Documentation Quick Reference

### By Topic

| Topic | File | Section |
|-------|------|---------|
| **SDK Initialization** | ZOHO_SDK_REFERENCE.md | Initialization Patterns (3 methods) |
| **CRUD Operations** | ZOHO_SDK_REFERENCE.md | CRUD Operations |
| **Pagination** | ZOHO_SDK_REFERENCE.md | Pagination + BEST_PRACTICES.md Pattern 9 |
| **Subforms** | ZOHO_SDK_REFERENCE.md | Subform Operations |
| **Batch Updates** | BEST_PRACTICES.md | Pattern 10 |
| **Excel Import** | BEST_PRACTICES.md | Patterns 4, 5, 6 |
| **Unit Conversion** | FIELD_MAPPINGS.md | Unit Conventions + BEST_PRACTICES.md Pattern 8 |
| **Parent-Child Sync** | BEST_PRACTICES.md | Pattern 7 |
| **Error Handling** | ZOHO_SDK_REFERENCE.md | Error Handling + Pattern 11 |
| **Rate Limiting** | ZOHO_SDK_REFERENCE.md | Rate Limits + BEST_PRACTICES.md Pattern 10 |
| **MCP with HTTP** | MCP_INTEGRATION.md | All sections (HTTP only!) |
| **Field Names** | FIELD_MAPPINGS.md | All modules |

---

## 🆘 Troubleshooting Quick Lookup

| Error | Solution File | Section |
|-------|---------------|---------|
| `ZOHO is not defined` | TROUBLESHOOTING.md | SDK Not Loading |
| SDK timeout | TROUBLESHOOTING.md | SDK Init Timeout |
| `MANDATORY_NOT_FOUND` | TROUBLESHOOTING.md | MANDATORY_NOT_FOUND |
| `INVALID_MODULE` | TROUBLESHOOTING.md | INVALID_MODULE |
| `INVALID_DATA` | TROUBLESHOOTING.md | INVALID_DATA |
| Only 200 records | TROUBLESHOOTING.md | Only Getting 200 Records |
| `RATE_LIMIT_EXCEEDED` | TROUBLESHOOTING.md | Too Many Requests |
| Subform not updating | TROUBLESHOOTING.md | Subform Data Not Updating |
| Duplicate boxes | TROUBLESHOOTING.md | Subform Rows Duplicating |
| `ERR_REQUIRE_ESM` | TROUBLESHOOTING.md | ERR_REQUIRE_ESM |
| MCP connection failed | TROUBLESHOOTING.md | MCP Client Connection Failed |
| Weights show 0.000 | TROUBLESHOOTING.md | Weights Showing as 0.000 kg |
| SKU not found | TROUBLESHOOTING.md | SKU Not Found in Search |

---

## ⚠️ Critical Warnings Index

| Warning | Where to Find |
|---------|---------------|
| **⚠️ MCP is READ-ONLY!** | MCP_LIMITATIONS.md (Complete explanation) |
| **Weights are in KG, not grams!** | FIELD_MAPPINGS.md (Unit Conventions) |
| **MCP uses HTTP, not SDK!** | MCP_INTEGRATION.md (Overview) |
| **For writes: Use Direct OAuth API** | MCP_LIMITATIONS.md (Best Practice Architecture) |
| **Pagination is mandatory** | ZOHO_SDK_REFERENCE.md (Pagination) |
| **Rate limiting required** | ZOHO_SDK_REFERENCE.md (Rate Limits) |
| **Use .cjs for CommonJS** | MCP_INTEGRATION.md (CommonJS vs ES Modules) |

---

## 📊 Code Examples Index

| Example | File | Location |
|---------|------|----------|
| Initialize SDK | ZOHO_SDK_REFERENCE.md | Initialization Patterns |
| Fetch all records | ZOHO_SDK_REFERENCE.md | Fetch All Records |
| Update single record | ZOHO_SDK_REFERENCE.md | Update Single Record |
| Update subform | ZOHO_SDK_REFERENCE.md | Update Subform Data |
| Batch updates | BEST_PRACTICES.md | Pattern 10 |
| Pagination loop | BEST_PRACTICES.md | Pattern 9 |
| Excel parsing | BEST_PRACTICES.md | Pattern 4 |
| Unit conversion | BEST_PRACTICES.md | Pattern 5 |
| SKU matching | BEST_PRACTICES.md | Pattern 6 |
| Error handling | BEST_PRACTICES.md | Pattern 11 |
| Dual-mode service | BEST_PRACTICES.md | Pattern 12 |
| HTTP requests (MCP) | MCP_INTEGRATION.md | HTTP Endpoints Reference |
| OAuth token | MCP_INTEGRATION.md | Get Access Token |

---

## 🎯 Common Tasks Quick Guide

### Task: Fetch All Products

1. **Read**: ZOHO_SDK_REFERENCE.md → Fetch All Records
2. **Copy code**: Pagination pattern
3. **Use**: `await fetchAllRecords('Products')`

### Task: Bulk Update 500 Products

1. **Read**: BEST_PRACTICES.md → Pattern 10
2. **Copy code**: Batch processing with rate limiting
3. **Use**: `await batchUpdateProducts(products, onProgress)`

### Task: Import from Excel

1. **Read**: BEST_PRACTICES.md → Patterns 4, 5, 6
2. **Check units**: FIELD_MAPPINGS.md → Unit Conventions
3. **Use**: DimensionAuditParser.js as template

### Task: Fix Duplicate Boxes

1. **Run**: `node scripts/cleanup_duplicate_boxes.cjs`
2. **Read**: TROUBLESHOOTING.md → Subform Rows Duplicating
3. **Verify**: Check CRM UI for clean data

### Task: Create New MCP Script

1. **Read**: MCP_INTEGRATION.md → Basic MCP Script Template
2. **Copy**: axios HTTP pattern (NOT SDK!)
3. **Use**: `.cjs` extension for CommonJS

---

## 📁 File Count Summary

| Category | Count |
|----------|-------|
| **Documentation** | 8 files (README, CHANGELOG, INDEX, SUMMARY + 5 guides) |
| **Services** | 2 files (ZohoAPI + Parser) |
| **Scripts** | 2 files (cleanup + populate) |
| **Config** | 3 files (.env.example + JSON configs) |
| **TOTAL** | **15 files** |

---

## 📈 Documentation Stats

| Metric | Value |
|--------|-------|
| Total Documentation | ~79 KB |
| Total Code (Services) | ~700 lines |
| Total Scripts | ~450 lines |
| Learning Time | ~2 hours |
| Production Tested | ✅ 615 products |
| Success Rate | 100% |

---

## 🔗 External Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| **Zoho SDK Docs** | https://www.zoho.com/crm/developer/docs/widgets/ | Official SDK reference |
| **Zoho API Docs** | https://www.zoho.com/crm/developer/docs/api/v2/ | REST API documentation |
| **API Console** | https://api-console.zoho.com/ | Create OAuth apps |
| **MCP Protocol** | https://modelcontextprotocol.io/ | Model Context Protocol |

---

## 🎓 Recommended Reading Order

### For Beginners (Never used Zoho)

1. README.md - Get overview (15 min)
2. ZOHO_SDK_REFERENCE.md - Learn SDK (30 min)
3. FIELD_MAPPINGS.md - Understand schema (15 min)
4. BEST_PRACTICES.md - Learn patterns (30 min)
5. Start coding with ZohoAPI.js

### For Quick Integration (Have Zoho experience)

1. INTEGRATION_SUMMARY.md - Quick overview (10 min)
2. Copy ZohoAPI.js to your app (5 min)
3. Read FIELD_MAPPINGS.md - Check units (10 min)
4. Start using fetchAllRecords() and updateProduct()

### For Script Development (Need bulk operations)

1. MCP_INTEGRATION.md - ⚠️ HTTP calls! (20 min)
2. Copy script template from MCP guide (5 min)
3. Modify for your use case (30 min)
4. Test with small dataset first

---

## 💡 Pro Tips

1. **Always read FIELD_MAPPINGS.md first** - Units matter! (KG not grams)
2. **Use TROUBLESHOOTING.md** - Most errors already solved
3. **Copy ZohoAPI.js** - Don't rewrite, just import
4. **Test with mock data** - Use dual-mode pattern
5. **Implement pagination** - Required for > 200 records
6. **Add rate limiting** - Prevent API errors
7. **Use .cjs extension** - For MCP scripts with CommonJS

---

**Quick Access**:
- 🚀 [README.md](README.md) - Start here
- 📊 [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md) - Complete overview
- 🆘 [TROUBLESHOOTING.md](knowledge_base/TROUBLESHOOTING.md) - Fix issues
- 📚 [ZOHO_SDK_REFERENCE.md](knowledge_base/ZOHO_SDK_REFERENCE.md) - Learn SDK

---

*Last Updated: February 15, 2026*
*Version: 1.0.0*
*Status: Production Ready ✅*
