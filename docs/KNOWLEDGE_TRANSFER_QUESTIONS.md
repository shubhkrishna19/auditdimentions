# Knowledge Transfer Questionnaire

**Purpose:** This file contains questions for the previous AI agent to answer, so all project knowledge is captured and transferred properly. The answers will be used to build a complete understanding of the project state, decisions made, and lessons learned.

**Instructions for the previous AI:** Please answer each question as thoroughly as possible with specific details, file paths, field names, and code references.

---

## 1. CRM DATA STRUCTURE

### 1.1 What are the EXACT Zoho CRM field API names and their data types for:
- Parent_MTP_SKU module (all custom fields you created or used)
- Products module (all custom fields you created or used)
- List every subform and its fields (e.g. MTP_Box_Dimensions, Bill_Dimension_Weight)

### 1.2 What UNITS does each weight field store in Zoho CRM?
- Is `Billed_Physical_Weight` in grams or kilograms?
- Is `Total_Weight` in grams or kilograms?
- Is `BOM_Weight` in grams or kilograms?
- Are box weights (`Weight` in subforms) in grams or kilograms?
- What about `Billed_Chargeable_Weight`?
- What about `Last_Audited_Total_Weight_kg`?

### 1.3 What is the Parent-Child relationship structure?
- How does a Child product link to its Parent MTP SKU? (exact field name and type)
- Can a child have multiple parents?
- Can a parent have zero children?

### 1.4 What custom modules or fields did you CREATE in Zoho CRM?
- List every field you added to any module
- Note which ones are required vs optional
- Note any picklist values (e.g. Weight_Category_Billed options)

---

## 2. EXCEL FILE FORMAT

### 2.1 What is the EXACT column structure of the audit Excel file?
- Column A through last column - what does each contain?
- Which row is the header row?
- Are there any merged cells or special formatting?

### 2.2 What units are used in the Excel file?
- Are box dimensions in cm, mm, or inches?
- Are box weights in grams or kg?
- Is the total weight column (column 16) in grams or kg?
- What about the volumetric weight column?

### 2.3 Are there multiple Excel file formats?
- Does the app need to handle different Excel templates?
- What's the difference between Audit_Dimensions.csv and DimentionsMasterAudit.xlsx?

---

## 3. ZOHO SDK & DEPLOYMENT

### 3.1 How is the app deployed and connected to Zoho?
- Is it a Connected App, Widget, or Web Tab?
- How was it registered in Zoho Developer Console?
- What is the exact URL configured in Zoho (Vercel URL)?

### 3.2 What Zoho SDK version is being used?
- Is it `ZohoEmbededAppSDK.min.js` v1.2 from zwidgets.com?
- Does `ZOHO.embeddedApp.init()` return a promise in this version?
- What events are available (PageLoad, etc.)?

### 3.3 What scopes/permissions does the widget have?
- What CRM scopes were configured?
- Any OAuth scopes needed?
- Any special permissions for reading/writing modules?

### 3.4 How does the Vercel deployment work?
- Is `VITE_API_MODE` set in Vercel dashboard or via .env.production?
- What Vercel project settings are configured (build command, output directory)?
- Any environment variables set in Vercel?

---

## 4. WEIGHT CONVERSION LOGIC

### 4.1 When data comes FROM Zoho CRM, what conversions are needed?
- Do we divide by 1000 for any field? If so, which ones?
- Are any fields already in the correct unit (KG)?
- Document the EXACT conversion for each field

### 4.2 When data goes TO Zoho CRM (updates), what conversions are needed?
- Do we multiply by 1000 for any field? If so, which ones?
- What units does each field expect on write?
- Document the EXACT conversion for each update field

### 4.3 When parsing the Excel file, what conversions are needed?
- Box weights: grams to kg?
- Total weight: grams to kg?
- Any conditional logic (e.g., if value > 1000, divide by 1000)?

---

## 5. FEATURES & FUNCTIONALITY

### 5.1 What features are FULLY WORKING?
- List each feature and its current state (working, partially working, broken)

### 5.2 What features are PARTIALLY IMPLEMENTED?
- What remains to be done for each?
- Any known bugs?

### 5.3 What features are PLANNED but not started?
- Priority order?
- Any design decisions already made?

### 5.4 The Bulk Apply feature:
- How does it work? (Source parent -> target children?)
- What data gets copied?
- Does it recalculate economics per target?

### 5.5 The Warehouse Entry feature:
- How does barcode scanning work?
- What's the save flow (local state -> auto-save -> CRM)?
- Is it connected to ZohoAPI?

---

## 6. ARCHITECTURE DECISIONS

### 6.1 Why was the Catalyst backend (ZohoSyncHub) created?
- What problem was it trying to solve?
- Why didn't client-side SDK work for that use case?
- Is it still needed or can we remove it?

### 6.2 Why are there two services (ZohoAPI.js and ZohoSyncService.js)?
- What does each one do?
- Which one should be the single source of truth?
- Can they be merged?

### 6.3 How does the AutoSaveService work?
- What triggers a save?
- What's the queue/debounce logic?
- Does it handle failures/retries?

### 6.4 How does the TransactionManager (checkpoint system) work?
- Where are checkpoints stored?
- How does rollback work?
- Is it fully implemented or partially?

---

## 7. KNOWN ISSUES & GOTCHAS

### 7.1 What bugs have you encountered and fixed?
- List each bug, what caused it, and how you fixed it

### 7.2 What bugs remain unfixed?
- Description, suspected cause, suggested fix

### 7.3 What Zoho-specific gotchas did you discover?
- API quirks, rate limits, field behavior, etc.
- Anything that surprised you or caused problems

### 7.4 What data integrity issues exist?
- Any risk of data loss or corruption?
- Race conditions?
- Duplicate records?

---

## 8. MOCK DATA

### 8.1 Where did the mock data come from?
- Is it based on real CRM data (sanitized)?
- Does it accurately represent the data structure?

### 8.2 Does mock data match the live CRM structure exactly?
- Same field names?
- Same data types?
- Same nested structures (subforms, lookups)?

---

## 9. SECURITY

### 9.1 What credentials/secrets exist?
- Where are they stored? (.env files, Vercel, Zoho console)
- Which ones need to be regenerated?

### 9.2 What security measures are in place?
- Input validation?
- XSS prevention?
- CORS configuration?

---

## 10. ANYTHING ELSE

### 10.1 What would you do differently if starting over?
### 10.2 What's the most fragile part of the codebase?
### 10.3 What documentation is missing?
### 10.4 Any other critical context that hasn't been covered?

---

**Please answer every question above as completely as possible. Your answers will directly impact the quality and speed of future development on this project.**

**Format your answers clearly under each question number (e.g., "1.1: The field names are...").**
