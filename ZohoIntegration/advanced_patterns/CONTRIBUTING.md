# 🤝 CONTRIBUTING GUIDE - MANDATORY FOR ALL AIs & DEVELOPERS

**IMPORTANT:** This is a **living, collaborative knowledge base**. Every AI agent and developer who uses this module **MUST** contribute their learnings back to benefit future users.

---

## 🎯 Why This Matters

This module serves as the **single source of truth** for Zoho CRM integration across all our company projects. When you discover a new pattern, solve an error, or learn a best practice, **you MUST document it** so:

1. **Future developers** don't repeat your mistakes
2. **Future AI agents** have the knowledge to work faster
3. **Company standards** are maintained and improved
4. **Integration quality** increases with every project

---

## ✅ MANDATORY Contributions

### **Every time you use this module, you MUST:**

1. ✅ **Update BEST_PRACTICES.md** if you discover:
   - A new integration pattern
   - A better way to handle data
   - A unit conversion rule
   - A Zoho API quirk
   - A performance optimization

2. ✅ **Update ERROR_CATALOG.md** if you encounter:
   - A new error message
   - A new solution to an existing problem
   - A prevention technique

3. ✅ **Update CHANGELOG.md** with:
   - Date and project name
   - What you changed/added
   - Why it was needed

4. ✅ **Update field_mappings.json** if you:
   - Add support for a new Zoho module
   - Discover new field API names
   - Add new validation rules

---

## 📝 How to Contribute

### **Pattern 1: Adding a New Best Practice**

**When:** You discover a better way to do something

**Steps:**
1. Open `knowledge_base/BEST_PRACTICES.md`
2. Add your pattern following this template:

```markdown
### Pattern X: [Your Pattern Name]

**Context:** [When does this apply?]  
**Problem:** [What issue does this solve?]  
**Answer:** [How to do it correctly]

**Code Example:**
```javascript
// Your working code example
// With comments explaining why
```

**Why This Matters:**
[Explain the impact or risk of not following this pattern]

**Gotcha:**
[What to watch out for or common mistakes]

**Discovered in:** [Project Name] - [Date] - [Your Name/AI Model]
```

### **Pattern 2: Documenting a New Error**

**When:** You encounter and solve an error

**Steps:**
1. Open `knowledge_base/ERROR_CATALOG.md`
2. Add your error following the template:

```markdown
### Error: [Error Name/Message]

**Example Messages:**
- "Exact error message you saw"

**Cause:**
[What causes this error]

**Solution:**
1. Step 1
2. Step 2
3. Code example if applicable

**Prevention:**
[How to avoid this in the future]

**Discovered in:** [Project Name] - [Date] - [Your Name/AI Model]
```

### **Pattern 3: Adding a New Module**

**When:** You integrate a new Zoho module

**Steps:**
1. Open `config/field_mappings.json`
2. Add your module:

```json
{
  "modules": {
    "Your_New_Module": {
      "description": "What this module is for",
      "identifier": "Unique_Field_Name",
      "fields": {
        "fieldName": {
          "zohoApiName": "Zoho_API_Name",
          "type": "decimal|string|picklist|etc",
          "required": true|false,
          "validation": "rule_name",
          "description": "What this field stores"
        }
      }
    }
  }
}
```

3. Add field discovery notes to BEST_PRACTICES.md

### **Pattern 4: Updating the Changelog**

**When:** Every time you make a contribution

**Steps:**
1. Open `knowledge_base/CHANGELOG.md`
2. Add an entry at the **top** of the file:

```markdown
## [YYYY-MM-DD] - [Your Project Name]

### Added
- New pattern: [Pattern name]
- New error solution: [Error name]

### Changed
- Updated [what] because [why]

### Fixed
- Fixed [what] that was causing [issue]

### Context
- **Project:** [Project Name]
- **Module:** [Zoho Module Name]
- **Contributor:** [Your Name/AI Model]
- **Reason:** [Why this change was needed]
```

---

## 🎓 Company Integration Standards

### **Our Zoho Integration Principles:**

1. **✅ ALWAYS use field_mappings.json**
   - Never hardcode Zoho API field names
   - Always map through config

2. **✅ ALWAYS create checkpoints before updates**
   - Use TransactionManager
   - Enable rollback capability

3. **✅ ALWAYS validate units before storing**
   - Check if weights are in grams
   - Check if dimensions are in cm
   - Convert for display, not storage

4. **✅ ALWAYS batch API calls**
   - Never loop without delays
   - Use 10 records/batch, 500ms delay
   - Respect rate limits

5. **✅ ALWAYS log for debugging**
   - Use `[ModuleName]` prefix
   - Log checkpoints created
   - Log errors with context

6. **✅ ALWAYS test with small dataset first**
   - Test with 1 product
   - Then 5 products
   - Then full sync

7. **✅ ALWAYS document what you learn**
   - Update BEST_PRACTICES.md
   - Update ERROR_CATALOG.md
   - Update CHANGELOG.md

---

## 🚫 What NOT to Do

### **❌ DON'T:**

1. ❌ Hardcode Zoho API field names in your code
2. ❌ Skip checkpoints to "save time"
3. ❌ Convert units before storing (always store raw)
4. ❌ Sync without testing on small dataset
5. ❌ Keep learnings to yourself - SHARE THEM!
6. ❌ Use different patterns across projects
7. ❌ Assume field names - always verify

---

## 📋 Pre-Integration Checklist

Before integrating with Zoho, **every AI/developer must:**

- [ ] Read `knowledge_base/INTEGRATION_GUIDE.md` completely
- [ ] Review `knowledge_base/BEST_PRACTICES.md` for all patterns
- [ ] Check `knowledge_base/ERROR_CATALOG.md` for known issues
- [ ] Verify `config/field_mappings.json` has your module
- [ ] Plan to use TransactionManager for checkpoints
- [ ] Commit to documenting your learnings

---

## 🏆 Quality Standards

### **Good Contribution Example:**

```markdown
### Pattern 8: Handling Subform Empty State

**Context:** When updating products with variable box counts  
**Problem:** Sending empty array `[]` to subform field deletes all existing boxes

**Answer:** Omit the subform field entirely if no data to update

**Code Example:**
```javascript
const updateData = { id: recordId };

// ✅ CORRECT: Only add subform if we have data
if (boxes && boxes.length > 0) {
    updateData.Bill_Dimension_Weight = boxes;
}
// If boxes empty, field not included in payload

// ❌ WRONG: Sending empty array
updateData.Bill_Dimension_Weight = []; // Deletes all!
```

**Why This Matters:**
Accidentally sending empty array will delete customer's existing box data, breaking shipments.

**Gotcha:**
Zoho treats `[]` as "delete all rows" not "no change"

**Discovered in:** Warehouse Management App - 2026-02-10 - Claude Sonnet 4.5
```

### **Bad Contribution Example:**

```markdown
### New thing
Send data correctly

**Code:**
Just send it right
```
❌ Too vague, no context, no examples

---

## 🔄 Review & Merge Process

### **For Standalone Projects:**
1. Make your changes to the module
2. Test thoroughly
3. Update all 3 docs (BEST_PRACTICES, ERROR_CATALOG, CHANGELOG)
4. Commit with message: `docs(ZohoModule): Add pattern for [X]`

### **For Team Projects:**
1. Make changes in your local module copy
2. Document in all 3 files
3. Submit for review (if applicable)
4. Merge learnings back to master module

### **For AI Agents:**
1. Read existing docs first (don't duplicate)
2. Add your learnings following templates
3. Be specific with code examples
4. Include project context
5. Update CHANGELOG with your contribution

---

## 📊 Contribution Metrics

**Our goal:** Every project adds at least:
- ✅ 1 new best practice pattern OR
- ✅ 1 new error solution OR
- ✅ 1 new module mapping

**Track your impact:**
- Number of patterns added
- Number of errors documented
- Number of modules supported
- Projects using your contributions

---

## 🎯 Example Contribution Flow

**Scenario:** You're building an Inventory Management app

```
1. Copy ZohoDataIntegrationModule to your project
2. Read all knowledge base docs
3. Implement integration using TransactionManager
4. Encounter error: "Picklist value not found"
5. Solve it by checking valid values first
6. Document in ERROR_CATALOG.md
7. Discover Parent-SKU doesn't need checkpoints (read-only)
8. Document in BEST_PRACTICES.md as Pattern 9
9. Add "Inventory_Items" module to field_mappings.json
10. Update CHANGELOG.md with all changes
11. Commit and push
12. Share module back with team
```

---

## 💡 Tips for Good Documentation

### **Be Specific:**
✅ "Use divisor 5 for grams, 5000 for kg"  
❌ "Use correct divisor"

### **Include Context:**
✅ "For Shopify integration where weights come in ounces, convert to grams first: `grams = ounces * 28.3495`"  
❌ "Convert weights"

### **Show Code:**
✅ Include working code snippets  
❌ Just describe in words

### **Explain Why:**
✅ "We store in grams because Zoho's shipping integration expects gram values"  
❌ "Store in grams"

### **Warn About Gotchas:**
✅ "Zoho treats picklist values as case-sensitive. 'Active' ≠ 'active'"  
❌ "Use correct case"

---

## 🚨 Mandatory Documentation Policy

**THIS IS NOT OPTIONAL**

By using this module, you agree to:

1. ✅ Document every new pattern you discover
2. ✅ Document every error you solve
3. ✅ Update field mappings when adding modules
4. ✅ Keep CHANGELOG current
5. ✅ Share learnings for team benefit

**Failure to document = Technical debt for the next developer**

---

## 🎓 For New Developers

If you're new to the team:

1. **Start here:** Read all files in `knowledge_base/`
2. **Study examples:** Look at existing patterns
3. **Follow templates:** Use provided contribution templates
4. **Ask questions:** Check ERROR_CATALOG first
5. **Give back:** Document what you learn

This module is **our collective knowledge**. Make it better! 🌱

---

## 📞 Questions?

- Check `INTEGRATION_GUIDE.md` for usage
- Check `BEST_PRACTICES.md` for patterns
- Check `ERROR_CATALOG.md` for errors
- Still stuck? Document your question and solution when you find it!

---

**Remember:** This module is only as good as we make it together. Every contribution makes Zoho integration easier for the next person. 🤝

---

**Last Updated:** 2026-02-03  
**Contributors:** 1 (You're next!)  
**Patterns Documented:** 7 (Add yours!)  
**Errors Cataloged:** 8 (Share yours!)
