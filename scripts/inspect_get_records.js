import fs from 'fs';

const data = JSON.parse(fs.readFileSync('mcp_tools.json', 'utf8'));

const tools = data.result.tools;
const target = tools.find(t => t.name === 'ZohoCRM_Get_Records');

console.log('--- ZohoCRM_Get_Records Path Variables ---');
console.log(JSON.stringify(target.inputSchema.properties.path_variables, null, 2));
