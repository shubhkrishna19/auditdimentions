/**
 * Parent MTP SKU - Live Status Aggregator (DEBUG VERSION)
 * 
 * Logic: Parent status is determined by ALL child products
 * - If ANY child has Live_Status = 'Y' → Parent ProductActive = 'Y' (Green)
 * - If NO child has 'Y' → Parent ProductActive = 'NA' (Red - Not Available)
 * 
 * Module: Parent_MTP_SKU
 * Trigger: On Load
 * Field Updated: ProductActive (picklist)
 */

// Add debug logging
console.log('🔍 Parent MTP SKU Live Status Script Started');

function updateParentLiveStatus() {
    try {
        console.log('📋 updateParentLiveStatus function called');

        // Get current record ID
        var recordId = ZDK.Page.getEntityId();

        console.log('🆔 Record ID:', recordId);

        if (!recordId) {
            console.log('❌ No record ID found');
            return;
        }

        console.log('🔎 Searching for child Products...');

        // Fetch all child Products that link to this Parent MTP SKU
        ZOHO.CRM.API.searchRecord({
            Entity: "Products",
            Type: "criteria",
            Query: "(MTP_SKU:equals:" + recordId + ")"
        }).then(function (response) {

            console.log('📦 Search response:', response);

            if (!response.data || response.data.length === 0) {
                console.log('⚠️ No child products found - setting to NA');
                // No child products found - set to NA (Not Available)
                setLiveStatus('NA', '#ff0000'); // Red
                return;
            }

            var childProducts = response.data;
            console.log('✅ Found ' + childProducts.length + ' child products');

            var hasLiveChild = false;

            // Check if ANY child has Live_Status = 'Y'
            for (var i = 0; i < childProducts.length; i++) {
                var childStatus = childProducts[i].Live_Status;
                console.log('  Child ' + (i + 1) + ' Live_Status:', childStatus);

                if (childStatus === 'Y') {
                    hasLiveChild = true;
                    console.log('  ✅ Found live child!');
                    break; // Found at least one live child
                }
            }

            // Set parent status based on children
            if (hasLiveChild) {
                console.log('🟢 Setting parent to Y (Green)');
                setLiveStatus('Y', '#00cc00'); // Green - at least one child is live
            } else {
                console.log('🔴 Setting parent to NA (Red)');
                setLiveStatus('NA', '#ff0000'); // Red - no children have Y status
            }

        }).catch(function (error) {
            console.error('❌ Error fetching child products:', error);
            // On error, show warning status
            setLiveStatus('NA', '#ff9900'); // Orange - error state
        });

    } catch (error) {
        console.error('❌ Error in updateParentLiveStatus:', error);
    }
}

/**
 * Helper function to set ProductActive field value and color
 */
function setLiveStatus(value, color) {
    console.log('🎨 Setting ProductActive to:', value, 'with color:', color);

    var statusField = ZDK.Page.getField('ProductActive');

    if (!statusField) {
        console.error('❌ ProductActive field not found!');
        return;
    }

    console.log('✅ ProductActive field found');

    statusField.setValue(value);
    statusField.setColor(color);
    statusField.setReadOnly(true); // Make read-only since it's auto-calculated

    console.log('✅ ProductActive field updated successfully');
}

// Execute on page load
console.log('🚀 Executing updateParentLiveStatus...');
updateParentLiveStatus();
console.log('✅ Script execution complete');
