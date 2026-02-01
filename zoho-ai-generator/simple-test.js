// Simple test to check what's failing
import ZohoInspector from './zoho-inspector.js';
import fs from 'fs';

const inspector = new ZohoInspector();
const logFile = 'test-log.txt';

async function test() {
    let log = '';

    try {
        log += 'Step 1: Getting access token...\n';
        const token = await inspector.getAccessToken();
        log += `✅ Token: ${token.substring(0, 20)}...\n\n`;

        log += 'Step 2: Inspecting Products module...\n';
        const moduleInfo = await inspector.inspectModule('Products');
        log += `✅ Found ${moduleInfo.fieldCount} fields\n\n`;

        log += 'First 5 fields:\n';
        moduleInfo.fields.slice(0, 5).forEach(f => {
            log += `  - ${f.api_name} (${f.data_type})\n`;
        });

    } catch (error) {
        log += `\n❌ ERROR:\n`;
        log += `Message: ${error.message}\n`;
        log += `Stack: ${error.stack}\n`;
        if (error.response) {
            log += `\nAPI Response:\n`;
            log += JSON.stringify(error.response.data, null, 2);
        }
    }

    fs.writeFileSync(logFile, log);
    console.log(log);
    console.log(`\nLog saved to: ${logFile}`);
}

test();
