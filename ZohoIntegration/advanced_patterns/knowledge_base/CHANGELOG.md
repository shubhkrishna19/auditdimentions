# 📜 Integration Patterns Changelog

**Purpose:** Track evolution of integration patterns and data structures  
**Format:** Newest entries first

---

## [2026-02-03] - Initial Module Creation

### Added
- **Data Integrator Module** - Portable integration framework
- **Field Mappings** - Complete Parent_MTP_SKU schema
- **7 Best Practice Patterns:**
  1. Parent-Child weight independence
  2. Weight calculations (physical/volumetric/chargeable)
  3. Batch processing (10 records, 500ms delay)
  4. Schema verification before sync
  5. UPDATE-only mode for existing records
  6. Subform data structure
  7. 3-level error handling

### Documented
- **Parent-Child Logic:** Parents are design templates, not sum of children
- **Unit Conversion:** Always grams → kg before comparison
- **Volumetric Formula:** `(L×W×H in cm) / 5000 = kg`
- **Chargeable Logic:** `MAX(physical_kg, volumetric_kg)`

### Errors Cataloged
1. Field Not Found → Create in Zoho Setup
2. Product Not Found → Verify SKU exists
3. Validation Failed → Check validation rules
4. API Rate Limit → Use batch delays
5. Invalid OAuth → Reinitialize SDK
6. Subform Issues → Don't send empty arrays
7. Workflow Not Triggering → Add Trigger parameter
8. Decimal Precision → Use .toFixed(3)

### Context
- **Project:** Audit Dimensions App
- **Modules:** Parent_MTP_SKU, Products (child)
- **Purpose:** Sync weight/dimension data from Excel to Zoho CRM
- **Key Learning:** Data must be validated locally before API calls

---

## How to Add Entries

When adding new patterns or changing existing ones:

```markdown
## [YYYY-MM-DD] - Brief Title

### Added
- New feature/pattern with description

### Changed
- What changed and why (important!)
- Migration notes if applicable

### Fixed
- Bugs or incorrect patterns corrected

### Removed
- Deprecated patterns (with reason)

### Context
- Project name
- Why this change was needed
```

---

## Pattern Version History

| Pattern | Version | Date | Status |
|---------|---------|------|--------|
| Parent-Child Weights | 1.0 | 2026-02-03 | Active |
| Weight Calculations | 1.0 | 2026-02-03 | Active |
| Batch Processing | 1.0 | 2026-02-03 | Active |
| Schema Verification | 1.0 | 2026-02-03 | Active |
| UPDATE-only Mode | 1.0 | 2026-02-03 | Active |
| Subform Structure | 1.0 | 2026-02-03 | Active |
| Error Handling | 1.0 | 2026-02-03 | Active |

---

**Next Contributor:** You! 🚀  
Document your learnings so future agents benefit!
