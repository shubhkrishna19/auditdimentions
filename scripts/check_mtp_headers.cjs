const XLSX = require('xlsx');
const fs = require('fs');

const file = 'SKU Aliases, Parent & Child Master Data (1).xlsx';

if (fs.existsSync(file)) {
    const workbook = XLSX.readFile(file);
    const sheetName = 'MTP SKUs - Master Data'; // User specified this sheet

    if (workbook.SheetNames.includes(sheetName)) {
        console.log(`Checking Sheet: ${sheetName}`);
        const sheet = workbook.Sheets[sheetName];
        const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
        console.log('Headers:', headers);
    } else {
        console.log(`Sheet "${sheetName}" not found. Available:`, workbook.SheetNames);
    }
} else {
    console.log('File not found:', file);
}
