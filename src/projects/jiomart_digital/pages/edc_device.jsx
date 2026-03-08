import React, { useCallback, useMemo, useState } from "react";
import PageLayout from "../../../components/PageLayout";
import CustomDropdown from "../../../components/CustomDropdown";
import HistoryTable from "../../../components/HistoryTable";
import CustomModal from "../../../components/CustomModal";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import DevicesOtherOutlinedIcon from "@mui/icons-material/DevicesOtherOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";

const SAMPLE_JOBS = [
  {
    id: "8a780ce2-0fcc-44a1-b2fa-a6293c4856cd",
    created_by: "ravi.menon@company.com",
    created_at: "2026-02-03T09:29:37.745Z",
    type: "PAYTM",
    status: "completed",
    log_address: "#",
  },
  {
    id: "d341614a-61f8-4720-9fb7-07a498501828",
    created_by: "ravi.menon@company.com",
    created_at: "2026-02-03T09:23:57.149Z",
    type: "EDC",
    status: "completed",
    log_address: "#",
  },
];

const formatCreatedAt = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toISOString();
};

const OPERATION_OPTIONS = [
  { label: "EDC PINELABS", value: "PINELABS" },
  { label: "PAYTM MID", value: "PAYTMMID" },
  { label: "PAYTM TID", value: "PAYTMTID" },
];

const SAMPLE_FILE_CONFIG = {
  PINELABS: {
    filename: "edc-pinelabs-sample.csv",
    headers: ["store_id"],
    rows: [["T0DS"]],
  },
  PAYTMMID: {
    filename: "paytm-mid-sample.csv",
    headers: ["store_id", "MID"],
    rows: [["T0DS", "JIOMar362"]],
  },
  PAYTMTID: {
    filename: "paytm-tid-sample.csv",
    headers: ["store_id", "TID"],
    rows: [["T0DS", "11229783"]],
  },
};

const parseCsvPreviewData = async (file) => {
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((part) => part.trim());
  const rows = lines.slice(1).map((line, rowIndex) => {
    const cells = line.split(",").map((part) => part.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    if (!headers.length) {
      row.Row = `Row ${rowIndex + 1}`;
      row.Value = line;
    }
    return row;
  });

  return { headers, rows };
};

const parseJsonPreviewData = async (file) => {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (!items.length) return { headers: [], rows: [] };

  const normalizedRows = items.map((item, index) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return item;
    }
    return { value: String(item ?? ""), index: index + 1 };
  });

  const headers = Array.from(
    new Set(normalizedRows.flatMap((row) => Object.keys(row))),
  );
  return { headers, rows: normalizedRows };
};

const DB_OPTIONS = [
  { label: "PineLabs", value: "PINELABS" },
  { label: "PAYTM MID or TID", value: "PAYTM" },
  // { label: "GPAY", value: "GPAY" },
  // { label: "BILLDESK", value: "BILLDESK" },
  // { label: "PAYTM", value: "PAYTM" },
  // { label: "PHONEPE", value: "PHONEPE" },
  // { label: "GPAY", value: "GPAY" },
  // { label: "BILLDESK", value: "BILLDESK" },
];

const EdcDevice = () => {
  const [tipDismissed, setTipDismissed] = useState(false);
  const [operationType, setOperationType] = useState(OPERATION_OPTIONS[0]);
  const [uploadOperationType, setUploadOperationType] = useState(
    OPERATION_OPTIONS[0],
  );
  const [selectedDb, setSelectedDb] = useState(DB_OPTIONS[0]);
  const [storeIds, setStoreIds] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [historyRows, setHistoryRows] = useState(SAMPLE_JOBS);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [filePreviewHeaders, setFilePreviewHeaders] = useState([]);
  const [filePreviewRows, setFilePreviewRows] = useState([]);
  const [previewError, setPreviewError] = useState("");

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setHistoryRows(SAMPLE_JOBS);
    setHistoryLoading(false);
  }, []);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory, historyRefreshKey]);

  const historyColumns = useMemo(
    () => [
      {
        key: "id",
        label: "JOB ID",
        accessor: (row) => row.id ?? "—",
      },
      { key: "created_by", label: "CREATED BY" },
      {
        key: "created_at",
        label: "CREATED AT",
        accessor: (row) => formatCreatedAt(row.created_at),
      },
      { key: "type", label: "TYPE" },
      {
        key: "status",
        label: "STATUS",
        type: "badge",
        badgeColors: { completed: "success", processing: "info" },
      },
      {
        key: "log_address",
        label: "LOG",
        type: "download",
        headerClassName: "text-right",
        cellClassName: "text-right",
        downloadTitle: "Download",
      },
    ],
    [],
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const openFilePreviewModal = async (file) => {
    try {
      setUploadOperationType(operationType || OPERATION_OPTIONS[0]);
      const fileName = String(file?.name || "").toLowerCase();
      const parsed = fileName.endsWith(".json")
        ? await parseJsonPreviewData(file)
        : await parseCsvPreviewData(file);
      setFilePreviewHeaders(parsed.headers || []);
      setFilePreviewRows(parsed.rows || []);
      setPreviewError("");
      setFilePreviewOpen(true);
    } catch (error) {
      console.error("Failed to parse uploaded file for preview:", error);
      setFilePreviewHeaders([]);
      setFilePreviewRows([]);
      setPreviewError(error?.message || "Failed to parse uploaded file.");
      setFilePreviewOpen(true);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      setUploadFile(file);
      await openFilePreviewModal(file);
    }
  };
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      await openFilePreviewModal(file);
    }
  };

  const handleSampleDownload = () => {
    const selectedSample =
      SAMPLE_FILE_CONFIG[operationType?.value] || SAMPLE_FILE_CONFIG.PINELABS;
    const csvRows = [selectedSample.headers.join(",")].concat(
      selectedSample.rows.map((row) => row.join(",")),
    );
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = selectedSample.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadFile = () => {
    // Placeholder for API integration; closes preview after user confirms upload.
    setFilePreviewOpen(false);
  };

  return (
    <PageLayout
      title={
        <span className="inline-flex items-center gap-2">
          <DevicesOtherOutlinedIcon sx={{ fontSize: 28 }} />
          EDC Device Updates
        </span>
      }
      titleClassName="flex items-center gap-2"
      contentClassName="flex flex-1 flex-col gap-6 overflow-auto"
    >
      {/* Info banner */}
      {!tipDismissed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100">
          <div className="inline-flex items-center gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              i
            </span>
            <span>
              The platform supports up to 500 device update requests per batch.
              Ensure your file matches the selected operation schema.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTipDismissed(true)}
            className="shrink-0 cursor-pointer rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold uppercase text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            OK! GOT IT
          </button>
        </div>
      )}

      {/* Three cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Instructions */}
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800/50">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Instructions
          </h3>
          <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
            Keep the header in the file and each row will represent a unique
            Device ID.
          </p>
          <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
            In case of bulk updates, ensure the version exists in the
            repository before initiating.
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>Valid Serial Number format: SN-XXXX-XXXX</li>
            <li>File must match the operation&apos;s required extension</li>
            <li>Required fields: DeviceID, Action, Params</li>
          </ul>
        </div>

        {/* Select Operation */}
        <div className="flex flex-col rounded-xl border border-dashed border-gray-300 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800/50">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Select Operation
          </h3>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Operation Type
          </label>
          <CustomDropdown
            options={OPERATION_OPTIONS}
            value={operationType}
            onChange={(opt) => setOperationType(opt || OPERATION_OPTIONS[0])}
            searchable={false}
            placeholder="Select"
            buttonClassName="w-full border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
          />
          <button
            type="button"
            onClick={handleSampleDownload}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            <DownloadOutlinedIcon fontSize="small" />
            Download Selected Sample File
          </button>
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            Sample formats: EDC PINELABS (`store_id`), PAYTM MID (`store_id`,
            `MID`), PAYTM TID (`store_id`, `TID`).
          </p>
        </div>

        {/* Upload File */}
        <div className="flex flex-col rounded-xl border border-dashed border-gray-300 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800/50">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Upload File
          </h3>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mb-4 flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <CloudUploadOutlinedIcon sx={{ fontSize: 28 }} />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Drag and drop file here
            </p>
            <label className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30">
              <UploadOutlinedIcon fontSize="small" />
              Select File to Upload
              <input
                type="file"
                accept=".csv,.json"
                className="hidden"
                onClick={(e) => {
                  e.target.value = "";
                }}
                onChange={handleFileSelect}
              />
            </label>
            {uploadFile && (
              <div className="mt-2 w-full space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {uploadFile.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verify EDC Updates */}
      <div>
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Verify EDC Updates
          </h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Real-time verification
          </span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select DBs to search for EDC Device:
            </label>
            <CustomDropdown
              options={DB_OPTIONS}
              value={selectedDb}
              onChange={(opt) => setSelectedDb(opt || DB_OPTIONS[0])}
              searchable={false}
              placeholder="Select"
              buttonClassName="min-w-[200px] w-full border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enter store id here to verify :
            </label>
            <textarea
              value={storeIds}
              onChange={(e) => setStoreIds(e.target.value)}
              placeholder="Comma separated store IDs or one per line..."
              rows={3}
              className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            <SearchOutlinedIcon fontSize="small" />
            Search Data
          </button>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
          <HistoryTable
            columns={historyColumns}
            rowsOverride={historyRows}
            loadingOverride={historyLoading}
            onRefresh={fetchHistory}
            historyOptions={[{ key: "all", label: "All" }]}
            refreshKey={historyRefreshKey}
            firstColumnWidthPercent={22}
            showRefresh={false}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center justify-center gap-1 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <span>POWERED BY</span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200">
          <BoltIcon sx={{ fontSize: 18 }} className="text-amber-500" />
         Ahmed and team
        </span>
      </div>

      <CustomModal
        open={filePreviewOpen}
        onClose={() => setFilePreviewOpen(false)}
        size="lg"
        isDark={false}
      >
        <div className="space-y-4 p-2">
          <div>
            <h3 className="text-lg font-semibold text-blue-700">File Preview</h3>
            <p className="text-xs text-gray-500">
              {uploadFile?.name || "Uploaded file"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Operation to perform
            </label>
            <CustomDropdown
              options={OPERATION_OPTIONS}
              value={uploadOperationType}
              onChange={(opt) =>
                setUploadOperationType(opt || OPERATION_OPTIONS[0])
              }
              searchable={false}
              placeholder="Select"
              buttonClassName="w-full border border-gray-300 bg-white"
            />
          </div>

          {previewError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {previewError}
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-auto rounded-lg border border-gray-200">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    {(filePreviewHeaders.length ? filePreviewHeaders : ["data"]).map(
                      (header) => (
                        <th
                          key={header}
                          className="border-b border-gray-200 px-4 py-2 font-semibold text-gray-700"
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filePreviewRows.length > 0 ? (
                    filePreviewRows.map((row, rowIndex) => (
                      <tr key={`row-${rowIndex}`}>
                        {(filePreviewHeaders.length
                          ? filePreviewHeaders
                          : ["data"]
                        ).map((header) => (
                          <td
                            key={`${rowIndex}-${header}`}
                            className="border-b border-gray-100 px-4 py-2 text-gray-700"
                          >
                            {String(row[header] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={filePreviewHeaders.length || 1}
                        className="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        No data rows found in uploaded file.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFilePreviewOpen(false)}
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleUploadFile}
              disabled={!uploadFile}
              className="inline-flex items-center rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Upload
            </button>
          </div>
        </div>
      </CustomModal>
    </PageLayout>
  );
};

export default EdcDevice;
