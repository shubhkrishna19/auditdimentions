const XLSX = require('xlsx');
const fs = require('fs');

const file = 'SKU Aliases, Parent & Child Master Data (1).xlsx';

if (fs.existsSync(file)) {
    const workbook = XLSX.readFile(file);
    console.log('Sheets:', workbook.SheetNames);

    // User said "child skus alias master sheet". Let's find it.
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('child') && s.toLowerCase().includes('alias'));

    if (sheetName) {
        console.log(`Checking Sheet: ${sheetName}`);
        const sheet = workbook.Sheets[sheetName];
        // Read header row (Row 1?)
        const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
        console.log('Headers:', headers);

        // Print Columns J to P (Indices 9 to 15)
        const specificCols = headers.slice(9, 16);
        console.log('Columns J-P:', specificCols);
    } else {
        console.log('Sheet not found matching "child skus alias master"');
    }

} else {
    console.log('File not found:', file);
}
