/**
 * Schema Verification & Test Sync
 * Run this to verify field API names and test with 1 product
 */

class SchemaVerifier {
    async init() {
        return new Promise((resolve) => {
            ZOHO.embeddedApp.on("PageLoad", function () {
                resolve();
            });
            ZOHO.embeddedApp.init();
        });
    }

    /**
     * Check all field API names in Parent_MTP_SKU
     */
    async verifyFields() {
        console.log('🔍 Fetching Parent_MTP_SKU field metadata...');

        try {
            const response = await ZOHO.CRM.META.getFields({ Entity: "Parent_MTP_SKU" });

            if (!response.fields) {
                console.error('❌ No fields returned');
                return;
            }

            console.log(`✅ Found ${response.fields.length} total fields`);

            // Fields we're looking for
            const TARGET_FIELDS = [
                'Billed_Physical_Weight',
                'Billed_Volumetric_Weight',
                'Billed_Chargeable_Weight',
                'BOM_Weight',
                'Weight_Category_Billed',
                'Audit_History_Log',
                'Processing_Status',
                'Bill_Dimension_Weight', // Subform
                'Total_Weight'
            ];

            console.log('\n📋 Checking our target fields:');

            const results = {
                found: [],
                missing: [],
                details: {}
            };

            TARGET_FIELDS.forEach(targetField => {
                const field = response.fields.find(f => f.api_name === targetField);

                if (field) {
                    results.found.push(targetField);
                    results.details[targetField] = {
                        label: field.field_label,
                        type: field.data_type,
                        apiName: field.api_name
                    };
                    console.log(`✅ ${targetField} → "${field.field_label}" (${field.data_type})`);
                } else {
                    results.missing.push(targetField);
                    console.log(`❌ ${targetField} → NOT FOUND`);
                }
            });

            console.log('\n📊 Summary:');
            console.log(`Found: ${results.found.length}/${TARGET_FIELDS.length}`);
            console.log(`Missing: ${results.missing.length}`);

            if (results.missing.length > 0) {
                console.log('\n⚠️ Missing fields:', results.missing);
                console.log('Please create these in Zoho Setup');
            }

            // Check subform structure if it exists
            if (results.found.includes('Bill_Dimension_Weight')) {
                await this.checkSubformStructure(response.fields);
            }

            return results;

        } catch (error) {
            console.error('❌ Error fetching fields:', error);
            return null;
        }
    }

    /**
     * Check subform field structure
     */
    async checkSubformStructure(allFields) {
        console.log('\n📦 Checking Bill_Dimension_Weight subform structure...');

        const subformField = allFields.find(f => f.api_name === 'Bill_Dimension_Weight');

        if (subformField && subformField.subform) {
            console.log('Subform fields:');
            subformField.subform.fields.forEach(sf => {
                console.log(`  - ${sf.api_name}: ${sf.field_label} (${sf.data_type})`);
            });
        }
    }

    /**
     * Fetch one product to see actual data structure
     */
    async fetchSampleProduct(sku = 'PU-SUB') {
        console.log(`\n🔍 Fetching product: ${sku}`);

        try {
            const response = await ZOHO.CRM.API.searchRecord({
                Entity: "Parent_MTP_SKU",
                Type: "criteria",
                Query: `(Product_Code:equals:${sku})`
            });

            if (response.data && response.data.length > 0) {
                const product = response.data[0];

                console.log('✅ Product found!');
                console.log('\n📦 Product Data:');
                console.log('Product Code:', product.Product_Code);
                console.log('Product Name:', product.Product_MTP_Name);

                console.log('\n⚖️ Weight Fields:');
                console.log('Total Weight:', product.Total_Weight);
                console.log('Billed Physical Weight:', product.Billed_Physical_Weight || '(empty)');
                console.log('Billed Volumetric Weight:', product.Billed_Volumetric_Weight || '(empty)');
                console.log('Billed Chargeable Weight:', product.Billed_Chargeable_Weight || '(empty)');
                console.log('BOM Weight:', product.BOM_Weight || '(empty)');

                console.log('\n📦 Box Dimensions (Subform):');
                if (product.Bill_Dimension_Weight && product.Bill_Dimension_Weight.length > 0) {
                    product.Bill_Dimension_Weight.forEach(box => {
                        console.log(`Box ${box.Box_Number}:`);
                        console.log(`  Length: ${box.Length} ${box.Box_Measurement || 'cm'}`);
                        console.log(`  Width: ${box.Width}`);
                        console.log(`  Height: ${box.Height}`);
                        console.log(`  Weight: ${box.Weight} ${box.Weight_Measurement || '?'}`);
                    });
                } else {
                    console.log('(No box data)');
                }

                return product;

            } else {
                console.log(`❌ Product ${sku} not found`);
                return null;
            }

        } catch (error) {
            console.error('❌ Error fetching product:', error);
            return null;
        }
    }

    /**
     * Test update with dummy data
     */
    async testUpdate(sku = 'PU-SUB') {
        console.log(`\n🧪 TEST: Updating product ${sku} with test data...`);

        try {
            // First find the product
            const searchResponse = await ZOHO.CRM.API.searchRecord({
                Entity: "Parent_MTP_SKU",
                Type: "criteria",
                Query: `(Product_Code:equals:${sku})`
            });

            if (!searchResponse.data || searchResponse.data.length === 0) {
                console.log(`❌ Product ${sku} not found - cannot test`);
                return false;
            }

            const recordId = searchResponse.data[0].id;
            console.log(`✅ Found product, ID: ${recordId}`);

            // Prepare test data
            const testData = {
                id: recordId,
                Billed_Physical_Weight: 5.5,
                Billed_Volumetric_Weight: 4.8,
                Billed_Chargeable_Weight: 5.5,
                BOM_Weight: 5.2,
                Weight_Category_Billed: '5kg',
                Processing_Status: 'Y'
            };

            console.log('\n📤 Sending update...');
            console.log(JSON.stringify(testData, null, 2));

            const updateResponse = await ZOHO.CRM.API.updateRecord({
                Entity: "Parent_MTP_SKU",
                APIData: testData
            });

            if (updateResponse.data && updateResponse.data[0].code === 'SUCCESS') {
                console.log('✅ Update successful!');
                console.log('Updated record ID:', updateResponse.data[0].details.id);

                // Fetch again to verify
                console.log('\n🔍 Verifying update...');
                await this.fetchSampleProduct(sku);

                return true;
            } else {
                console.log('❌ Update failed');
                console.log('Response:', updateResponse);
                return false;
            }

        } catch (error) {
            console.error('❌ Test update error:', error);
            return false;
        }
    }
}

// Main execution
(async function () {
    console.log('🚀 Starting Schema Verification & Test Sync...\n');

    const verifier = new SchemaVerifier();
    await verifier.init();

    // Step 1: Verify fields exist
    console.log('='.repeat(60));
    console.log('STEP 1: VERIFY FIELD API NAMES');
    console.log('='.repeat(60));
    const fieldCheck = await verifier.verifyFields();

    // Step 2: Fetch sample product
    console.log('\n' + '='.repeat(60));
    console.log('STEP 2: FETCH SAMPLE PRODUCT (PU-SUB from screenshot)');
    console.log('='.repeat(60));
    const product = await verifier.fetchSampleProduct('PU-SUB');

    // Step 3: Test update
    if (fieldCheck && fieldCheck.missing.length === 0) {
        console.log('\n' + '='.repeat(60));
        console.log('STEP 3: TEST UPDATE (Optional - uncomment to run)');
        console.log('='.repeat(60));
        // Uncomment the line below to test updating PU-SUB:
        // await verifier.testUpdate('PU-SUB');
        console.log('⏸️ Test update skipped (uncomment in code to run)');
    } else {
        console.log('\n⚠️ Skipping test update - missing fields detected');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Check console output above for any missing fields');
    console.log('2. Verify weight units (grams vs kg) from sample product');
    console.log('3. If all looks good, uncomment test update and run again');
    console.log('4. Once test passes, we can sync all 319 products!');

})();
