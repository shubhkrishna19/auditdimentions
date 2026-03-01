package com.processor.record;

import java.util.ArrayList;
import java.util.logging.Logger;
import com.catalyst.bulk.ZCRMRecordsProcessor;
import com.zc.component.object.ZCRowObject;

public class ZCRMRecordsProcessorImpl implements ZCRMRecordsProcessor {
    
    private static final Logger LOGGER = Logger.getLogger(ZCRMRecordsProcessorImpl.class.getName());

    @Override
    public ArrayList<ZCRowObject> ZCRMRecordsProcessor(ArrayList<ZCRowObject> records) throws Exception {
        LOGGER.info("Processing " + records.size() + " product records...");
        
        ArrayList<ZCRowObject> processedRecords = new ArrayList<>();
        
        for (ZCRowObject record : records) {
            try {
                // Get product code
                String productCode = (String) record.get("Product_Code");
                
                // Get weights (in grams from Zoho)
                Double physicalWeight = getDoubleValue(record, "Billed_Physical_Weight");
                Double volumetricWeight = getDoubleValue(record, "Billed_Volumetric_Weight");
                
                // Calculate chargeable weight
                Double chargeableWeight = Math.max(physicalWeight, volumetricWeight);
                
                // Update fields
                record.put("Billed_Chargeable_Weight", chargeableWeight);
                record.put("BOM_Weight", physicalWeight);
                record.put("Total_Weight", chargeableWeight);
                
                // Calculate weight category
                Double chargeableKg = chargeableWeight / 1000.0;
                String category = "10kg";
                if (chargeableKg <= 0.5) category = "500gm";
                else if (chargeableKg <= 1.0) category = "1kg";
                else if (chargeableKg <= 2.0) category = "2kg";
                else if (chargeableKg <= 5.0) category = "5kg";
                
                record.put("Weight_Category_Billed", category);
                
                processedRecords.add(record);
                
            } catch (Exception e) {
                LOGGER.warning("Error processing record: " + e.getMessage());
            }
        }
        
        LOGGER.info("Processed " + processedRecords.size() + " records successfully");
        return processedRecords;
    }
    
    // Helper method
    private Double getDoubleValue(ZCRowObject record, String fieldName) {
        Object value = record.get(fieldName);
        if (value == null) return 0.0;
        if (value instanceof Double) return (Double) value;
        if (value instanceof Integer) return ((Integer) value).doubleValue();
        if (value instanceof String) {
            try {
                return Double.parseDouble((String) value);
            } catch (NumberFormatException e) {
                return 0.0;
            }
        }
        return 0.0;
    }
}
