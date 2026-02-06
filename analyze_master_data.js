const XLSX = require('xlsx');

function analyzeFile(filePath) {
    console.log(`\n\n🔍 ANALYZING: ${filePath}`);
    const workbook = XLSX.readFile(filePath);

    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of Arrays

        if (data.length === 0) {
            console.log("  [Empty Sheet]");
            return;
        }

        // Row 2 (Index 2) is usually header in DimMaster based on previous output
        // Row 1 (Index 0) is header in Alias file
        let headerRow = data[0];
        if (filePath.includes('DimensionsMaster')) {
            headerRow = data[2];
            console.log(`  Row Count: ${data.length} (316 expected?)`);
        } else {
            console.log(`  Row Count: ${data.length}`);
        }

        console.log(`  Header Row Index: ${filePath.includes('DimensionsMaster') ? 2 : 0}`);

        // Print all headers with Index
        headerRow.forEach((h, i) => {
            if (h) console.log(`    [${i}] ${h}`);
        });

        // Sample Row (Row 5 or Row 3)
        const sampleIdx = filePath.includes('DimensionsMaster') ? 5 : 2;
        if (data[sampleIdx]) {
            console.log(`  Sample Row (${sampleIdx}):`);
            data[sampleIdx].forEach((v, i) => {
                if (v && headerRow[i]) console.log(`      ${headerRow[i]}: ${v}`);
            });
        }
    });
}

try {
    analyzeFile('./DimensionsMasterLatest.xlsx');
    analyzeFile('./SKU Aliases, Parent & Child Master Data (1).xlsx');
} catch (e) {
    console.error("Error:", e.message);
}
