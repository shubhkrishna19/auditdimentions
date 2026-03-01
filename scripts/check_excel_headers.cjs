const XLSX = require('xlsx');
const fs = require('fs');

const file = 'scripts/DimensionsMasterLatest.xlsx';

if (fs.existsSync(file)) {
    const workbook = XLSX.readFile(file);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    console.log('Headers:', headers);
} else {
    console.log('File not found:', file);
}
