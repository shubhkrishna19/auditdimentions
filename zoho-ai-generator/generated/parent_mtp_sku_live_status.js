/**
 * Parent MTP SKU - Live Status Aggregator
 * 
 * Logic: Parent status is determined by ALL child products
 * - If ANY child has Live_Status = 'Y' → Parent ProductActive = 'Y' (Green)
 * - If NO child has 'Y' → Parent ProductActive = 'NA' (Red - Not Available)
 * 
 * Module: Parent_MTP_SKU
 * Trigger: On Load
 * Field Updated: ProductActive (picklist)
 */

function updateParentLiveStatus() {
    try {
        // Get current record ID
        var recordId = ZDK.Page.getEntityId();

        if (!recordId) {
            console.log('No record ID found');
            return;
        }

        // Fetch all child Products that link to this Parent MTP SKU
        ZOHO.CRM.API.searchRecord({
            Entity: "Products",
            Type: "criteria",
            Query: "(MTP_SKU:equals:" + recordId + ")"
        }).then(function (response) {

            if (!response.data || response.data.length === 0) {
                // No child products found - set to NA (Not Available)
                setLiveStatus('NA', '#ff0000'); // Red
                return;
            }

            var childProducts = response.data;
            var hasLiveChild = false;

            // Check if ANY child has Live_Status = 'Y'
            for (var i = 0; i < childProducts.length; i++) {
                var childStatus = childProducts[i].Live_Status;

                if (childStatus === 'Y') {
                    hasLiveChild = true;
                    break; // Found at least one live child
                }
            }

            // Set parent status based on children
            if (hasLiveChild) {
                setLiveStatus('Y', '#00cc00'); // Green - at least one child is live
            } else {
                setLiveStatus('NA', '#ff0000'); // Red - no children have Y status
            }

        }).catch(function (error) {
            console.error('Error fetching child products:', error);
            // On error, show warning status
            setLiveStatus('NA', '#ff9900'); // Orange - error state
        });

    } catch (error) {
        console.error('Error in updateParentLiveStatus:', error);
    }
}

/**
 * Helper function to set ProductActive field value and color
 */
function setLiveStatus(value, color) {
    var statusField = ZDK.Page.getField('ProductActive');

    if (statusField) {
        statusField.setValue(value);
        statusField.setColor(color);
        statusField.setReadOnly(true); // Make read-only since it's auto-calculated
    }
}

// Execute on page load
updateParentLiveStatus();
