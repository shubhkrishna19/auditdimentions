//$Id$
package com.processor.impl;

import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

import com.catalyst.Context;
import com.opencsv.CSVReader;
import com.opencsv.CSVWriter;
import com.processor.ZCRMQueueProcessor;
import com.processor.ZCRMRecordsProcessor;
import com.processor.record.ZCRMRecord;
import com.processor.record.ZCRMRecordsProcessorImpl;
import com.util.CommonUtil;
import com.util.Tables.READ_QUEUE;
import com.util.Tables.WRITE_QUEUE;
import com.zc.component.files.ZCFile;
import com.zc.component.files.ZCFileDetail;
import com.zc.component.object.ZCObject;
import com.zc.component.object.ZCRowObject;
import com.zc.component.zcql.ZCQL;

public class ZCRMReadQueueProcessor implements ZCRMQueueProcessor {

	private static final Integer BATCH_SIZE = 500;
	private static final String INPUT_FILE = System.getProperty("java.io.tmpdir") + "/input.csv";
	private static final String OUTPUT_FILE = System.getProperty("java.io.tmpdir") + "/output.csv";

	private Context context;

	public ZCRMReadQueueProcessor(Context context) {
		this.context = context;
	}

	private void closeWriter(CSVWriter csvWriter) {
		try {
			if (csvWriter != null) {
				csvWriter.close();
			}
		} catch (Exception ignored) {
		}
	}

	public void createWriteQueueJob(File file, String module) throws Exception {
		ZCFileDetail fileDetails = ZCFile.getInstance().getFolderInstance(CommonUtil.CSVFILES).uploadFile(file);
		ZCRowObject fileData = ZCRowObject.getInstance();
		fileData.set(WRITE_QUEUE.FILE_ID.value(), fileDetails.getFileId());
		fileData.set(WRITE_QUEUE.MODULE.value(), module);
		ZCObject.getInstance().getTableInstance(WRITE_QUEUE.TABLE.value()).insertRow(fileData);
	}

	private void persistReadQueueDetails(File file, String rowId, Long lineProcessed,
			String module) throws Exception {
		createWriteQueueJob(file, module);
		ZCQL.getInstance().executeQuery(
				"update ReadQueue set LINE_PROCESSED='" + lineProcessed + "' where ROWID='" + rowId + "'");
	}

	private void process(ZCRMRecordsProcessor processor, CSVWriter csvWriter, String[] headers,
			List<ZCRMRecord> zcrmRecords)
			throws Exception {
		List<ZCRMRecord> updatedRecords = processor.processRecords(zcrmRecords);
		for (ZCRMRecord zcrmRecord : updatedRecords) {
			List<String> values = new ArrayList<>();
			for (String header : headers) {
				values.add(String.valueOf(zcrmRecord.data.get(header)));
			}
			csvWriter.writeNext(values.stream().toArray(String[]::new));
		}
	}


	@Override
	public void process(JSONObject projectData, JSONArray tableData) throws Exception {

		JSONObject rowData = tableData.getJSONObject(0);
		if (rowData.has(READ_QUEUE.TABLE.value())) {
			rowData = rowData.getJSONObject(READ_QUEUE.TABLE.value());
		}
		String rowId = rowData.getString(READ_QUEUE.ROWID.value());
		ArrayList<ZCRowObject> rows = ZCQL.getInstance()
				.executeQuery("Select * from ReadQueue where IS_PROCESS_COMPLETED=false and ROWID='" + rowId + "'");
		ZCRMRecordsProcessor processor = new ZCRMRecordsProcessorImpl();

		for (ZCRowObject rowObj : rows) {
			String fileId = rowObj.get(READ_QUEUE.FILEID.value()).toString();
			String module = rowObj.get(READ_QUEUE.MODULE.value()).toString();
			Long processedLine = (rowObj.get(READ_QUEUE.LINE_PROCESSED.value()) != null)
					? Long.parseLong(rowObj.get(READ_QUEUE.LINE_PROCESSED.value()).toString())
					: 0;
			InputStream csvStream = ZCFile.getInstance().getFolderInstance(CommonUtil.CSVFILES)
					.downloadFile(Long.parseLong(fileId));
			File csvOutput = null;
			File csvInput = new File(INPUT_FILE);
			byte[] buffer = new byte[4096];
			int bytesRead;
			try (OutputStream outStream = new FileOutputStream(csvInput)) {
				while ((bytesRead = csvStream.read(buffer)) > 0) {
					outStream.write(buffer, 0, bytesRead);
				}
			}
			int totalRecords = 0;
			int bulkWriteChunkSize = 0;
			List<ZCRMRecord> zcrmRecords = new ArrayList<ZCRMRecord>();
			CSVWriter writer = null;
			CSVReader reader = new CSVReader(new FileReader(INPUT_FILE));
			String[] line;
			String[] headers = null;
			while ((line = reader.readNext()) != null && this.context.getRemainingExecutionTimeMs() > 60000) {
				totalRecords++;
				ZCRMRecord rec = new ZCRMRecord();
				rec.setModuleName(module);
				if (totalRecords == 1) {
					headers = line;
					continue;
				}

				if (totalRecords <= processedLine) {
					continue;
				}

				if (bulkWriteChunkSize == 0) {
					if (csvOutput == null) {
						csvOutput = new File(OUTPUT_FILE);
					}

					if (csvOutput.exists()) {
						csvOutput.delete();
					}
					writer = new CSVWriter(new FileWriter(csvOutput));
					writer.writeNext(headers);
				}

				for (int i = 0; i < line.length && totalRecords > 1; i++) {
					rec.data.put(headers[i], line[i]);
				}

				zcrmRecords.add(rec);
				bulkWriteChunkSize++;
				if (zcrmRecords.size() == BATCH_SIZE) {
					processedLine += zcrmRecords.size();
					process(processor, writer, headers, zcrmRecords);
					zcrmRecords.clear();
				}
				if (bulkWriteChunkSize >= 25000) {
					closeWriter(writer);
					persistReadQueueDetails(csvOutput, rowId, processedLine, module);
					bulkWriteChunkSize = 0;
				}
			}
			reader.close();
			if (!zcrmRecords.isEmpty()) {
				processedLine += zcrmRecords.size();
				process(processor, writer, headers, zcrmRecords);
				zcrmRecords.clear();
			}
			if (bulkWriteChunkSize > 0) {
				closeWriter(writer);
				persistReadQueueDetails(csvOutput, rowId, processedLine, module);
			}

			ZCQL.getInstance()
					.executeQuery("update ReadQueue set IS_PROCESS_COMPLETED=true where ROWID='" + rowId + "'");

			closeWriter(writer);
		}
	}
}
