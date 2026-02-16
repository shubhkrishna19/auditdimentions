const XLSX = require('xlsx');

// Read the Dimensions Master.xlsx file
const workbook = XLSX.readFile('Dimensions Master.xlsx');

console.log('Sheet Names:', workbook.SheetNames);

// Get first sheet
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

console.log('\n=== First 15 rows ===');
data.slice(0, 15).forEach((row, i) => {
    console.log(`Row ${i}:`, JSON.stringify(row));
});

console.log('\n=== Column Headers (Row 2-3) ===');
console.log('Row 1:', data[1]);
console.log('Row 2:', data[2]);
