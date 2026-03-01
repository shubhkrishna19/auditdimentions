const XLSX = require('xlsx');
const fs = require('fs');

const file = 'SKU Aliases, Parent & Child Master Data (1).xlsx';
const skuToFind = 'TS-NL-W';

if (fs.existsSync(file)) {
    const workbook = XLSX.readFile(file);
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('child') && s.toLowerCase().includes('alias'));

    console.log(`Searching in Sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    const match = data.find(row => row['SKU Code'] === skuToFind);

    if (match) {
        console.log(`Found SKU: ${skuToFind}`);
        console.log('Row Data:', match);
    } else {
        console.log(`SKU ${skuToFind} NOT found in Excel.`);
    }
} else {
    console.log('File not found:', file);
}
