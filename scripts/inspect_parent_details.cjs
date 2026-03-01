const fs = require('fs');

const file = 'parent_fields.json';

if (fs.existsSync(file)) {
    const fields = JSON.parse(fs.readFileSync(file, 'utf8'));

    // Check Installation Picklist
    const installField = fields.find(f => f.api_name === 'Installation');
    if (installField) {
        console.log('Installation Field Found:');
        console.log('Values:', installField.pick_list_values.map(v => v.display_value));
    } else {
        console.log('Installation Field NOT Found.');
    }

    // Check Tax Field
    const taxFields = fields.filter(f => f.display_label.toLowerCase().includes('tax') || f.api_name.toLowerCase().includes('tax'));
    if (taxFields.length > 0) {
        console.log('Tax Fields Found:');
        taxFields.forEach(f => console.log(`- ${f.display_label} (API: ${f.api_name}, Type: ${f.data_type})`));
    } else {
        console.log('No Tax fields found.');
    }

} else {
    console.log('File not found:', file);
}
