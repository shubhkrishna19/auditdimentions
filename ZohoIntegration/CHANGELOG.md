# Zoho Integration Module - Changelog

All notable changes and lessons learned from the Dimensions Audit project.

---

## [1.0.0] - 2026-02-15

### ✅ Initial Release - Production Ready

Complete Zoho CRM integration toolkit extracted from Dimensions Audit Authenticator project.

---

## Features Added

### Knowledge Base
- **ZOHO_SDK_REFERENCE.md** - Complete SDK v1.2 documentation
  - All CRUD operations with code examples
  - Pagination patterns
  - Subform operations
  - Event listeners
  - Error handling patterns

- **BEST_PRACTICES.md** - Production-tested patterns
  - 12 proven patterns for common scenarios
  - Anti-patterns to avoid
  - Data quality prevention
  - Excel import patterns
  - Parent-child sync automation

- **MCP_INTEGRATION.md** - Model Context Protocol guide
  - ⚠️ **CRITICAL UPDATE**: MCP uses HTTP calls, NOT SDK methods!
  - Complete axios-based examples
  - OAuth token management
  - Pagination with HTTP endpoints
  - Batch processing patterns
  - CommonJS vs ES modules handling

- **FIELD_MAPPINGS.md** - Complete CRM schema reference
  - Parent_MTP_SKU module fields
  - Products module fields
  - Subform structures
  - Unit conventions (KG for weights, cm for dimensions)
  - API response structures

- **TROUBLESHOOTING.md** - Common issues and solutions
  - SDK initialization problems
  - API errors (MANDATORY_NOT_FOUND, INVALID_MODULE, etc.)
  - Pagination issues
  - Rate limiting solutions
  - Subform duplication fixes
  - MCP script errors
  - Deployment issues

### Services
- **ZohoAPI.js** - Production-ready CRM service
  - Dual-mode (development mock + production live)
  - Complete CRUD operations
  - Pagination with progress callbacks
  - Batch updates with rate limiting
  - Error handling and retries
  - Unit: kg for weights, cm for dimensions

- **DimensionAuditParser.js** - Excel parsing service
  - Multi-row header detection
  - Unit conversion (grams → kg)
  - SKU matching with fuzzy logic
  - Data validation

### Scripts
- **cleanup_duplicate_boxes.cjs** - Remove duplicate subform entries
  - Deduplicates by box number + dimensions + weight
  - Works on both Parent_MTP_SKU and Products
  - Rate limited, safe to run multiple times
  - ⚠️ **Uses HTTP calls via axios, not MCP SDK methods**

- **populate_product_identifiers.cjs** - Bulk populate platform IDs
  - Reads Excel files
  - Populates Product_Identifiers subform
  - Skips existing data
  - ⚠️ **Uses HTTP calls via axios, not MCP SDK methods**

### Configuration
- **.env.example** - Environment template
- **field_mappings.json** - Complete CRM schema in JSON
- **slate.config.json** - Catalyst Slate deployment config

---

## Lessons Learned

### 1. Weight Units - CRITICAL ⚠️
**Issue**: Initially assumed CRM weights were in grams (based on old field_mappings.json)

**Reality**: ALL CRM weights are in KILOGRAMS!

**Fix**:
- Updated all documentation to clarify: KG in CRM, grams in Excel
- Added warnings in multiple places
- Removed incorrect /1000 division

**Impact**: Prevented massive data corruption (34.4 kg showing as 0.034 kg)

### 2. MCP Scripts Must Use HTTP Calls ⚠️
**Issue**: Initially tried using MCP SDK with `zoho-crm_get-records` tool calls

**Reality**: MCP scripts must use direct HTTP calls via axios!

**Fix**:
- Rewrote all scripts to use axios
- Created OAuth token management
- Added HTTP endpoint examples in MCP_INTEGRATION.md

**Impact**: Scripts now work correctly in production

### 3. CommonJS vs ES Modules
**Issue**: Scripts failed with `ERR_REQUIRE_ESM` when package.json has `"type": "module"`

**Solution**: Use `.cjs` extension for CommonJS scripts

**Files affected**:
- cleanup_duplicate_boxes.cjs
- populate_product_identifiers.cjs

### 4. Pagination Is Not Optional
**Issue**: Only getting first 200 records

**Solution**: Implemented pagination loop in all fetch operations

**Pattern**:
```javascript
while (hasMore) {
  const response = await fetchPage(page);
  if (response.data.length < 200) hasMore = false;
  page++;
}
```

### 5. Duplicate Boxes Problem
**Issue**: Running population scripts multiple times created duplicate subform entries

**Root Cause**: Zoho doesn't deduplicate subform data automatically

**Solution**: Created cleanup_duplicate_boxes.cjs script

**Prevention**: Always clear subform before adding new data

### 6. Parent-Child Field Names Differ
**Issue**: Confusion between parent and child box subforms

**Clarification**:
- Parent: `MTP_Box_Dimensions` with `Box` field
- Child: `Bill_Dimension_Weight` with `BL` field

### 7. Live Status Mapping
**Issue**: Multiple "live" statuses (Y, YB, YD, YH)

**Solution**: Created mapping in field_mappings.json:
- Live: Y, YB, YD, YH
- Not Live: RL, NL, AR, DI

### 8. SKU Matching Challenges
**Issue**: Excel SKUs don't match CRM (spaces, case, dashes)

**Solution**: Normalize before comparison:
```javascript
function normalizeSKU(sku) {
  return sku.trim().toUpperCase().replace(/\s+/g, '-');
}
```

### 9. Rate Limiting
**Issue**: Hitting 100 req/min limit during batch updates

**Solution**:
- Batch size: 10 products
- Delay: 500ms between batches
- Exponential backoff on rate limit errors

### 10. Excel Unit Detection
**Issue**: Excel files use grams, but no consistent column naming

**Solution**: Heuristic approach:
- If value > 1000, likely grams → divide by 1000
- If column name contains "(g)", definitely grams
- Otherwise, assume kg

---

## Breaking Changes

None - this is the initial release.

---

## Migration Guide

### From Direct SDK Usage

**Before** (scattered code):
```javascript
const response = await ZOHO.CRM.API.getAllRecords({
  Entity: 'Products'
});
const products = response.data;
```

**After** (using ZohoAPI service):
```javascript
import ZohoAPI from './ZohoIntegration/services/ZohoAPI';

const zoho = new ZohoAPI();
await zoho.init();

const products = await zoho.fetchAllRecords('Products');
```

### From Custom Scripts to MCP Scripts

**Before** (manual pagination, no error handling):
```javascript
const products = await getProducts();
for (const p of products) {
  await updateProduct(p);
}
```

**After** (using provided scripts):
```bash
node ZohoIntegration/scripts/cleanup_duplicate_boxes.cjs
```

---

## Known Issues

### 1. MCP SDK Not Fully Utilized
**Status**: Documented, not blocking

**Issue**: Scripts use axios HTTP calls instead of MCP SDK tools

**Reason**: MCP requires HTTP endpoints, not SDK method calls

**Workaround**: Continue using axios pattern (works correctly)

### 2. Mock Data Not Included
**Status**: TODO

**Missing**: mockData.js file for development mode

**Workaround**: Copy from original project or create custom mock data

### 3. Transaction Manager Not Included
**Status**: Optional

**Missing**: TransactionManager.js for checkpoint/rollback

**Impact**: No automatic rollback on batch failures

**Workaround**: Manual verification and cleanup if needed

---

## Upgrade Path

This is v1.0.0. Future versions will:

1. Add more script templates
2. Include mock data generation
3. Add TransactionManager for rollback support
4. Add more code examples
5. Add automated testing utilities
6. Add data migration tools

---

## Credits

**Developed for**: Dimensions Audit Authenticator project
**Date**: February 2026
**AI Assistant**: Claude (Anthropic)
**User**: Shubh

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-02-15 | Initial release - Production ready |

---

**Next Version**: 1.1.0 (planned)
- Add code examples folder
- Add script templates
- Add testing utilities
- Add migration tools
