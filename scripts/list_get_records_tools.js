import fs from 'fs';

const data = JSON.parse(fs.readFileSync('mcp_tools.json', 'utf8'));

const tools = data.result.tools;
const getRecordTools = tools.filter(t => t.name.includes('Get_Records'));

getRecordTools.forEach(t => {
    console.log(`- ${t.name}`);
});
