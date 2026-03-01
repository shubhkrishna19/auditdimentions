# 🧠 BRAINSTORMING: Data Integrations & Management Module

**Objective:** Create a standalone, portable, and robust module for managing data integrations (specifically Zoho CRM) that ensures data integrity, redundancy, and self-documentation for future AI agents.

## 1. Module Structure & Philosophy
The module will reside in `src/modules/DataIntegrator` and be designed as a "plug-and-play" component.

```text
src/modules/DataIntegrator/
├── config/                  # Configuration & Schema Definitions
│   ├── field_mappings.json  # App <-> CRM Field Maps
│   ├── validation_rules.js  # Data quality checks
│   └── connection_config.js # Environment-agnostic connection setup
├── core/                    # Core Logic
│   ├── Connector.js         # Base Connector Class
│   ├── ZohoProvider.js      # Zoho-Specific Implementation
│   ├── TransactionLog.js    # Audit Trail & Rollback capability
│   └── ErrorHandler.js      # Centralized error management
├── knowledge_base/          # "Self-Help" for Agents
│   ├── INTEGRATION_GUIDE.md # How to use this module
│   ├── BEST_PRACTICES.md    # Accumulated wisdom
│   └── ERROR_CATALOG.md     # Common errors and fixes
└── tools/                   # Utility Scripts
    ├── schema_inspector.js  # Analyzes CRM to update mappings
    └── data_restore.js      # Restoration utilities
```

## 2. Key Features

### 🛡️ Data Integrity & Redundancy
-   **Transaction Logging:** Every sync operation is logged to `localStorage` (or a dedicated table) *before* execution.
-   **Checkpointing:** Store "Pre-Update" state of records. If a sync fails or pushes bad data, we can use the "Restore" function to revert to the checkpoint.
-   **Validation Layers:** Data is validated against `validation_rules.js` *before* it leaves the app. (e.g., "Weight cannot be negative").

### 📚 Self-Documentation (Agent-Centric)
-   The `knowledge_base` folder is the "Brain" of the module.
-   Whenever an integration pattern is established, it is documented in `BEST_PRACTICES.md`.
-   Future agents are instructed to read `src/modules/DataIntegrator/README.md` first.

### 🔌 Portable Configuration
-   Field names (API names) are NOT hardcoded in logic files.
-   They are stored in `config/field_mappings.json`.
-   **Benefit:** If Zoho API names change (`Billed_Weight` -> `Billed_Weight_1`), we update *one* JSON file, not 50 lines of code.

## 3. Implementation Plan (Phased)

### Phase 1: Foundation (Current Session)
-   Create folder structure.
-   Implement `field_mappings.json` to solve the current "missing fields" confusion.
-   Migrate `ZohoSyncService` logic into `DataIntegrator/core/ZohoProvider.js`.

### Phase 2: Integrity & Validation
-   Add `validateData()` hook before sync.
-   Implement `createCheckpoint()` to save old data before overwriting.

### Phase 3: Knowledge Base
-   Populate `BEST_PRACTICES.md` with what we learned about MTP SKUs/Parent-Child logic.

---

## 4. Addressing "Pending Work" (Schema Verification)
To solve the immediate issue of fields not showing:
-   **Feature:** "Schema Validator"
-   **Action:** Click a button -> Module checks Zoho Metadata -> Compare against `field_mappings.json` -> Report MISSING fields.
-   **UI:** Display a red/green checklist to the user ("Field 'Billed_Physical_Weight' missing in CRM").

This bridges the gap between the immediate fix and the long-term, robust module.
