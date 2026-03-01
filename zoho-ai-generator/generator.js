#!/usr/bin/env node

/**
 * Zoho AI Code Generator
 * Generates Client Scripts, Deluge functions, and module configs from natural language
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Code generation templates
const templates = {
    clientScript: {
        parentChildStatus: (config) => `
// Auto-generated Client Script: ${config.name}
// Purpose: ${config.description}
// Generated: ${new Date().toISOString()}

function updateLiveStatus() {
    var parentField = ZDK.Page.getField('${config.parentField}');
    var parentSKU = parentField.getValue();
    
    if (!parentSKU || !parentSKU.id) {
        ZDK.Page.getField('${config.statusField}').setValue('N/A');
        return;
    }
    
    // Fetch parent record
    ZOHO.CRM.API.getRecord({
        Entity: "${config.parentModule}",
        RecordID: parentSKU.id
    }).then(function(response) {
        var parent = response.data[0];
        var isActive = parent.${config.parentStatusField};
        
        var statusField = ZDK.Page.getField('${config.statusField}');
        
        if (isActive === true || isActive === 'Active' || isActive === 'Live') {
            statusField.setValue('${config.activeValue}');
            statusField.setColor('#00cc00'); // Green
        } else {
            statusField.setValue('${config.inactiveValue}');
            statusField.setColor('#ff0000'); // Red
        }
        
        statusField.setReadOnly(true);
    }).catch(function(error) {
        console.error('Error fetching parent:', error);
        ZDK.Page.getField('${config.statusField}').setValue('ERROR');
    });
}

// Trigger on page load
function onLoad() {
    updateLiveStatus();
}

// Trigger when parent field changes
function onChange_${config.parentField}() {
    updateLiveStatus();
}
`,

        fieldCalculation: (config) => `
// Auto-generated Client Script: ${config.name}
// Purpose: ${config.description}
// Generated: ${new Date().toISOString()}

function calculate${config.resultField}() {
    ${config.inputFields.map(field =>
            `var ${field} = ZDK.Page.getField('${field}').getValue();`
        ).join('\n    ')}
    
    // Calculation logic
    var result = ${config.formula};
    
    // Update result field
    ZDK.Page.getField('${config.resultField}').setValue(result.toFixed(${config.decimals || 2}));
    
    ${config.validation ? `
    // Validation
    if (${config.validation.condition}) {
        ZDK.UI.Popup.warning('${config.validation.message}');
        ZDK.Page.getField('${config.validation.flagField}').setValue('${config.validation.flagValue}');
    }
    ` : ''}
}

// Trigger on page load
function onLoad() {
    calculate${config.resultField}();
}

// Trigger on input field changes
${config.inputFields.map(field => `
function onChange_${field}() {
    calculate${config.resultField}();
}`).join('\n')}
`,

        customValidation: (config) => `
// Auto-generated Client Script: ${config.name}
// Purpose: ${config.description}
// Generated: ${new Date().toISOString()}

function onBeforeSave() {
    ${config.validations.map(validation => `
    // Validation: ${validation.description}
    var ${validation.field} = ZDK.Page.getField('${validation.field}').getValue();
    if (${validation.condition}) {
        ZDK.UI.Popup.error('${validation.errorMessage}');
        return false; // Prevent save
    }
    `).join('\n    ')}
    
    return true; // Allow save
}
`
    },

    deluge: {
        parentChildSync: (config) => `
// Auto-generated Deluge Function: ${config.name}
// Purpose: ${config.description}
// Generated: ${new Date().toISOString()}

void ${config.functionName}(int recordId) {
    // Fetch child record
    childRecord = zoho.crm.getRecordById("${config.childModule}", recordId);
    
    // Get parent ID
    parentId = childRecord.get("${config.parentField}").get("id");
    
    if (parentId != null) {
        // Fetch parent record
        parentRecord = zoho.crm.getRecordById("${config.parentModule}", parentId);
        
        // Get parent status
        parentStatus = parentRecord.get("${config.parentStatusField}");
        
        // Update child status
        updateMap = Map();
        if (parentStatus == true || parentStatus == "Active") {
            updateMap.put("${config.childStatusField}", "${config.activeValue}");
        } else {
            updateMap.put("${config.childStatusField}", "${config.inactiveValue}");
        }
        
        // Update child record
        response = zoho.crm.updateRecord("${config.childModule}", recordId, updateMap);
        info "Updated child record: " + response;
    }
}
`,

        fieldCalculation: (config) => `
// Auto-generated Deluge Function: ${config.name}
// Purpose: ${config.description}
// Generated: ${new Date().toISOString()}

void ${config.functionName}(int recordId) {
    // Fetch record
    record = zoho.crm.getRecordById("${config.module}", recordId);
    
    // Get input values
    ${config.inputFields.map(field =>
            `${field} = record.get("${field}");`
        ).join('\n    ')}
    
    // Calculate result
    result = ${config.formula};
    
    // Update record
    updateMap = Map();
    updateMap.put("${config.resultField}", result);
    
    ${config.validation ? `
    // Validation
    if (${config.validation.condition}) {
        updateMap.put("${config.validation.flagField}", "${config.validation.flagValue}");
        
        // Send notification
        sendmail [
            from: zoho.adminuserid
            to: "${config.validation.notifyEmail}"
            subject: "${config.validation.subject}"
            message: "${config.validation.message}"
        ]
    }
    ` : ''}
    
    response = zoho.crm.updateRecord("${config.module}", recordId, updateMap);
    info "Calculation complete: " + response;
}
`
    }
};

// AI-powered code generator
class ZohoCodeGenerator {
    constructor() {
        this.outputDir = path.join(__dirname, 'generated');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Generate Client Script for parent-child status sync
     */
    generateParentChildStatusScript(options) {
        const config = {
            name: options.name || 'Parent Child Status Sync',
            description: options.description || 'Auto-update child status based on parent',
            parentField: options.parentField || 'Parent_SKU',
            statusField: options.statusField || 'Live_Status',
            parentModule: options.parentModule || 'Products',
            parentStatusField: options.parentStatusField || 'Product_Active',
            activeValue: options.activeValue || 'Y',
            inactiveValue: options.inactiveValue || 'NL'
        };

        const code = templates.clientScript.parentChildStatus(config);
        const filename = `${config.name.replace(/\s+/g, '_').toLowerCase()}.js`;
        const filepath = path.join(this.outputDir, filename);

        fs.writeFileSync(filepath, code);

        return {
            success: true,
            filepath,
            filename,
            code,
            deploymentInstructions: this.generateClientScriptDeploymentGuide(config, filename)
        };
    }

    /**
     * Generate Client Script for field calculations
     */
    generateFieldCalculationScript(options) {
        const config = {
            name: options.name || 'Field Calculation',
            description: options.description || 'Auto-calculate field values',
            inputFields: options.inputFields || [],
            resultField: options.resultField || 'Calculated_Value',
            formula: options.formula || '0',
            decimals: options.decimals || 2,
            validation: options.validation || null
        };

        const code = templates.clientScript.fieldCalculation(config);
        const filename = `${config.name.replace(/\s+/g, '_').toLowerCase()}.js`;
        const filepath = path.join(this.outputDir, filename);

        fs.writeFileSync(filepath, code);

        return {
            success: true,
            filepath,
            filename,
            code,
            deploymentInstructions: this.generateClientScriptDeploymentGuide(config, filename)
        };
    }

    /**
     * Generate Deluge function
     */
    generateDelugeFunction(type, options) {
        const template = templates.deluge[type];
        if (!template) {
            throw new Error(`Unknown Deluge template type: ${type}`);
        }

        const code = template(options);
        const filename = `${options.functionName}.deluge`;
        const filepath = path.join(this.outputDir, filename);

        fs.writeFileSync(filepath, code);

        return {
            success: true,
            filepath,
            filename,
            code,
            deploymentInstructions: this.generateDelugeDeploymentGuide(options, filename)
        };
    }

    /**
     * Generate deployment guide for Client Script
     */
    generateClientScriptDeploymentGuide(config, filename) {
        return `
# Deployment Instructions: ${config.name}

## Automated Deployment (Recommended)

\`\`\`bash
node deploy-client-script.js --file ${filename} --module ${config.parentModule || 'Products'}
\`\`\`

## Manual Deployment

1. **Login to Zoho CRM**
   - Go to https://crm.zoho.com

2. **Navigate to Client Script Editor**
   - Setup (⚙️) → Developer Hub → Client Script

3. **Create New Script**
   - Click "New Script"
   - Name: ${config.name}
   - Description: ${config.description}
   - Category: Module-based
   - Module: ${config.parentModule || 'Products'}
   - Page: Detail
   - Event: On Load, On Field Change

4. **Paste Code**
   - Copy the generated code from: ${filename}
   - Paste into the script editor

5. **Configure Triggers**
   - On Load: ✅ Enabled
   - On Field Change: ✅ ${config.parentField}

6. **Save and Test**
   - Click "Save"
   - Open a record in ${config.parentModule || 'Products'} module
   - Verify ${config.statusField} updates correctly

## Verification

- [ ] Script appears in Client Script list
- [ ] Status field updates on page load
- [ ] Status field updates when parent changes
- [ ] Colors display correctly (green/red)
`;
    }

    /**
     * Generate deployment guide for Deluge function
     */
    generateDelugeDeploymentGuide(config, filename) {
        return `
# Deployment Instructions: ${config.name}

## Manual Deployment (Required)

1. **Login to Zoho CRM**
   - Go to https://crm.zoho.com

2. **Navigate to Functions**
   - Setup (⚙️) → Developer Hub → Functions

3. **Create New Function**
   - Click "New Function"
   - Name: ${config.functionName}
   - Description: ${config.description}
   - Category: Automation

4. **Paste Code**
   - Copy the generated code from: ${filename}
   - Paste into the Deluge editor

5. **Configure Parameters**
   - Add parameter: recordId (Number)

6. **Save Function**
   - Click "Save"

7. **Attach to Workflow** (Optional)
   - Setup → Automation → Workflow Rules
   - Create rule for ${config.module || config.childModule}
   - Trigger: On field update (${config.parentField})
   - Action: Execute function ${config.functionName}

## Testing

\`\`\`bash
node test-deployed-code.js --function ${config.functionName} --record-id <test_record_id>
\`\`\`

## Verification

- [ ] Function appears in Functions list
- [ ] Test execution succeeds
- [ ] Records update correctly
- [ ] Workflow triggers function (if configured)
`;
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const generator = new ZohoCodeGenerator();

    // Parse command line arguments
    const getArg = (flag) => {
        const index = args.indexOf(flag);
        return index !== -1 ? args[index + 1] : null;
    };

    const type = getArg('--type');
    const output = getArg('--output');

    if (!type) {
        console.log(`
Zoho AI Code Generator

Usage:
  node generator.js --type <type> [options]

Types:
  parent-child-status  Generate parent-child status sync script
  field-calculation    Generate field calculation script
  deluge-sync         Generate Deluge sync function

Examples:
  node generator.js --type parent-child-status
  node generator.js --type field-calculation --output variance_calc.js
    `);
        process.exit(0);
    }

    let result;

    try {
        switch (type) {
            case 'parent-child-status':
                result = generator.generateParentChildStatusScript({
                    name: 'Live Status Checker',
                    description: 'Show Y if parent SKU is active, NL otherwise',
                    parentField: 'Parent_SKU',
                    statusField: 'Live_Status',
                    parentModule: 'Products',
                    parentStatusField: 'Product_Active',
                    activeValue: 'Y',
                    inactiveValue: 'NL'
                });
                break;

            case 'field-calculation':
                result = generator.generateFieldCalculationScript({
                    name: 'Dimension Variance Calculator',
                    description: 'Calculate variance between billed and actual dimensions',
                    inputFields: ['Billed_Length', 'Billed_Width', 'Billed_Height', 'Actual_Length', 'Actual_Width', 'Actual_Height'],
                    resultField: 'Variance_Percentage',
                    formula: '((Actual_Length * Actual_Width * Actual_Height - Billed_Length * Billed_Width * Billed_Height) / (Billed_Length * Billed_Width * Billed_Height)) * 100',
                    decimals: 2,
                    validation: {
                        condition: 'Math.abs(result) > 5',
                        message: 'High variance detected!',
                        flagField: 'Status',
                        flagValue: 'Flagged'
                    }
                });
                break;

            default:
                console.error(`Unknown type: ${type}`);
                process.exit(1);
        }

        console.log('✅ Code generated successfully!');
        console.log(`📄 File: ${result.filename}`);
        console.log(`📁 Path: ${result.filepath}`);
        console.log('\n' + result.deploymentInstructions);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

export default ZohoCodeGenerator;
