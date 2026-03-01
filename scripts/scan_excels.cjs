const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'scripts';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

console.log(`Scanning ${files.length} Excel files in ${dir}...`);

files.forEach(file => {
    try {
        const workbook = XLSX.readFile(path.join(dir, file));
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];

        if (headers && headers.includes('Amazon ASIN')) {
            console.log(`✅ FOUND IDENTIFIERS in: ${file}`);
            console.log('Headers:', headers);
        } else {
            console.log(`❌ No identifiers in: ${file}`);
        }
    } catch (e) {
        console.log(`⚠️ Error reading ${file}: ${e.message}`);
    }
});
