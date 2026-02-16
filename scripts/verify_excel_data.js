/**
 * Verify Excel data mapping
 */

import XLSX from 'xlsx';

const EXCEL_PATH = './scripts/SKU Aliases, Parent & Child Master Data LATEST .xlsx';

const workbook = XLSX.readFile(EXCEL_PATH);
const sheet = workbook.Sheets['Child SKUs - Alias Master'];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('📊 Sample Data (First 5 rows):\n');

for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    console.log(`Row ${i + 1}:`);
    console.log(`  Seller SKU: ${row['Seller SKU']}`);
    console.log(`  ASIN: ${row['ASIN'] || 'N/A'}`);
    console.log(`  FK FSN: ${row['FK FSN'] || 'N/A'}`);
    console.log(`  UL: ${row['UL'] || 'N/A'}`);
    console.log(`  PF : ${row['PF '] || 'N/A'}`);
    console.log(`  Myntra: ${row['Myntra'] || 'N/A'}`);
    console.log('');
}

console.log(`\n📈 Total rows: ${data.length}`);

// Count how many have identifiers
let withASIN = 0;
let withFK = 0;
let withUL = 0;
let withPF = 0;
let withMyntra = 0;

for (const row of data) {
    if (row['ASIN']) withASIN++;
    if (row['FK FSN']) withFK++;
    if (row['UL']) withUL++;
    if (row['PF ']) withPF++;
    if (row['Myntra']) withMyntra++;
}

console.log('\n📊 Identifier Coverage:');
console.log(`  Amazon ASIN: ${withASIN} products`);
console.log(`  Flipkart FSN: ${withFK} products`);
console.log(`  Urban Ladder: ${withUL} products`);
console.log(`  Pepperfry: ${withPF} products`);
console.log(`  Myntra: ${withMyntra} products`);
