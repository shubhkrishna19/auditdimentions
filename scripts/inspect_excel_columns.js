/**
 * Inspect Excel columns to see what's actually there
 */

import XLSX from 'xlsx';

const EXCEL_PATH = './scripts/SKU Aliases, Parent & Child Master Data LATEST .xlsx';

const workbook = XLSX.readFile(EXCEL_PATH);
const sheetNames = workbook.SheetNames;

console.log('📋 Available Sheets:');
sheetNames.forEach((name, i) => console.log(`   ${i + 1}. ${name}`));

// Check the Child SKUs sheet
const childSheet = sheetNames.find(s => s.toLowerCase().includes('child'));
if (childSheet) {
    console.log(`\n📊 Analyzing: ${childSheet}`);
    const sheet = workbook.Sheets[childSheet];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length > 0) {
        console.log(`\n📝 Column Names (${Object.keys(data[0]).length} total):`);
        Object.keys(data[0]).forEach((col, i) => {
            console.log(`   ${i + 1}. "${col}"`);
        });

        console.log(`\n🔍 Sample Row 1:`);
        const sample = data[0];
        Object.entries(sample).forEach(([key, value]) => {
            if (value) {
                console.log(`   ${key}: ${value}`);
            }
        });
    }
}
