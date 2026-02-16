import fs from 'fs';

const data = JSON.parse(fs.readFileSync('mcp_tools.json', 'utf8'));

const tools = data.result.tools;
const targetTools = tools.filter(t => t.name === 'ZohoCRM_Get_Records');

targetTools.forEach(t => {
    console.log(`\n🔹 ${t.name}`);
    console.log(`Schema:`, JSON.stringify(t.inputSchema, null, 2));
});
