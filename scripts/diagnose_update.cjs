/**
 * Simple check: Does Update return success but not actually update?
 */

require('dotenv').config({ path: '.env.mcp' });
const axios = require('axios');
const fs = require('fs');

const MCP_URL = process.env.MCP_SERVER_URL;
const MCP_KEY = process.env.MCP_API_KEY;
const BASE_URL = `${MCP_URL}?key=${MCP_KEY}`;

const log = [];

function logMsg(msg) {
    console.log(msg);
    log.push(msg);
}

async function callMCPTool(toolName, args) {
    const payload = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: toolName, arguments: args }
    };

    const response = await axios.post(BASE_URL, payload, {
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.error) {
        throw new Error(`MCP Error: ${JSON.stringify(response.data.error)}`);
    }

    const textContent = response.data.result?.content?.[0]?.text;
    return textContent ? JSON.parse(textContent) : null;
}

async function diagnose() {
    logMsg('=== DIAGNOSTIC: MCP Update Test ===\n');

    // Get SB-BNA which we know has duplicates
    logMsg('Fetching SB-BNA record...');
    const record = await callMCPTool('ZohoCRM_Get_Record', {
        path_variables: { module: 'Parent_MTP_SKU', recordID: '4301492000081836052' }
    });

    const boxes = record?.data?.[0]?.MTP_Box_Dimensions || [];
    logMsg(`Current boxes: ${boxes.length}`);
    boxes.forEach((b, i) => logMsg(`  ${i + 1}. Box ${b.Box}: ${b.Length}x${b.Width}x${b.Height}, ${b.Weight}g`));

    // Try update
    logMsg('\nAttempting update (remove 1 box)...');
    const updateResp = await callMCPTool('ZohoCRM_Update_Record', {
        path_variables: { module: 'Parent_MTP_SKU', recordID: '4301492000081836052' },
        body: { data: [{ MTP_Box_Dimensions: [boxes[0]] }] }
    });

    logMsg('Update response status: ' + (updateResp?.data?.[0]?.code || 'UNKNOWN'));
    logMsg('Update response message: ' + (updateResp?.data?.[0]?.message || 'UNKNOWN'));

    // Wait and re-fetch
    logMsg('\nWaiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));

    logMsg('Re-fetching record...');
    const verify = await callMCPTool('ZohoCRM_Get_Record', {
        path_variables: { module: 'Parent_MTP_SKU', recordID: '4301492000081836052' }
    });

    const newBoxes = verify?.data?.[0]?.MTP_Box_Dimensions || [];
    logMsg(`Boxes after update: ${newBoxes.length}`);

    if (newBoxes.length === 1) {
        logMsg('\n✅ UPDATE WORKED!');
    } else {
        logMsg('\n❌ UPDATE FAILED - Changes did not persist!');
        logMsg('Possible reasons:');
        logMsg('1. MCP server is in read-only mode');
        logMsg('2. Insufficient permissions');
        logMsg('3. API rate limiting/caching');
        logMsg('4. Subform updates require different syntax');
    }

    fs.writeFileSync('diagnostic_log.txt', log.join('\n'), 'utf8');
    logMsg('\nLog saved to diagnostic_log.txt');
}

diagnose().catch(e => {
    logMsg('ERROR: ' + e.message);
    fs.writeFileSync('diagnostic_log.txt', log.join('\n'), 'utf8');
    process.exit(1);
});
