import React, { useState } from "react";
import PageLayout from "../../../components/PageLayout";
import CustomDropdown from "../../../components/CustomDropdown";
import CustomModal from "../../../components/CustomModal";
import apiClient from "../../../api/client";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import DevicesOtherOutlinedIcon from "@mui/icons-material/DevicesOtherOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import { useSnackbar } from "notistack";

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
const EDC_UPDATE_ENDPOINT = "/__deku/api/v1/__jmd/edc/update";
const LOCAL_EDC_UPDATE_ENDPOINT =
  "http://localhost:8173/__deku/api/v1/__jmd/edc/update";
const EDC_PAYTM_UPDATE_ENDPOINT = "/__deku/api/v1/__jmd/edc/update/paytm";
const LOCAL_EDC_PAYTM_UPDATE_ENDPOINT =
  "http://localhost:8173/__deku/api/v1/__jmd/edc/update/paytm";
const VERIFY_EDC_ENDPOINT = "/__deku/api/v1/__jmd/verifyedc";
const LOCAL_VERIFY_EDC_ENDPOINT =
  "http://localhost:8173/__deku/api/v1/__jmd/verifyedc";

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .replace(/^"|"$/g, "")
    .toLowerCase();

const detectUploadOperationByHeaders = (headers = []) => {
  const normalized = headers.map(normalizeHeader).filter(Boolean);
  const matches = (expected) =>
    normalized.length === expected.length &&
    expected.every((header) => normalized.includes(header));

  if (matches(["store_id"])) return "PINELABS";
  if (matches(["store_id", "mid"])) return "PAYTMMID";
  if (matches(["store_id", "tid"])) return "PAYTMTID";
  return "UNKNOWN";
};

const mapOperationToUpdateType = (operationValue) => {
  if (operationValue === "PAYTMTID") return "TID";
  return "MID";
};

const parseDeviceTags = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const extractApiMessage = (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object") return "";
  return (
    payload.message ||
    payload.error ||
    payload.reason ||
    payload.detail ||
    ""
  );
};

const normalizeUploadResponse = (payload) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const rows = Array.isArray(body.data) ? body.data : [];
  return {
    summary: {
      success: body.success !== false,
      search_option: body.search_option || "—",
      total_rows: Number(body.total_rows || rows.length || 0),
      success_count: Number(body.success_count || 0),
      failure_count: Number(body.failure_count || 0),
    },
    rows: rows.map((row, index) => ({
      id: `${row?.store_id || "row"}-${index}`,
      store_id: row?.store_id || "—",
      success: row?.success === true,
      message: row?.message || row?.error || row?.reason || "—",
    })),
  };
};

const normalizeVerifyResponse = (payload) => {
  const body = payload && typeof payload === "object" ? payload : {};
  const results = Array.isArray(body.results) ? body.results : [];
  const fallbackData = Array.isArray(body.data) ? body.data : [];

  const rowsFromResults = results.map((item, index) => {
    const first = Array.isArray(item?.data) && item.data.length ? item.data[0] : {};
    return {
      id: `${item?.store_id || item?.device_tag || "row"}-${index}`,
      query_tag: String(item?.store_id || item?.device_tag || "—"),
      success: item?.success === true,
      row_count: Number(item?.row_count || 0),
      reason: String(
        item?.reason || item?.message || (item?.success ? "Matched" : "Data not found"),
      ),
      store_id: first?.store_id ?? "—",
      merchant_store_pos_code: first?.merchant_store_pos_code ?? "—",
      device_tag: first?.device_tag ?? item?.store_id ?? "—",
      terminal_serial_no: first?.terminal_serial_no ?? "—",
      edc_device_serial_no: first?.edc_device_serial_no ?? "—",
    };
  });

  const rows =
    rowsFromResults.length > 0
      ? rowsFromResults
      : fallbackData.map((item, index) => ({
          id: `${item?.device_tag || item?.store_id || "row"}-${index}`,
          query_tag: String(item?.device_tag || item?.store_id || "—"),
          success: true,
          row_count: 1,
          reason: "Matched",
          store_id: item?.store_id ?? "—",
          merchant_store_pos_code: item?.merchant_store_pos_code ?? "—",
          device_tag: item?.device_tag ?? "—",
          terminal_serial_no: item?.terminal_serial_no ?? "—",
          edc_device_serial_no: item?.edc_device_serial_no ?? "—",
        }));

  return {
    summary: {
      success: body.success !== false,
      total_store_ids: Number(body.total_store_ids || rows.length || 0),
      success_count: Number(body.success_count || 0),
      failure_count: Number(body.failure_count || 0),
    },
    rows,
  };
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

const EdcDevice = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [tipDismissed, setTipDismissed] = useState(false);
  const [operationType, setOperationType] = useState(OPERATION_OPTIONS[0]);
  const [uploadOperationType, setUploadOperationType] = useState(
    OPERATION_OPTIONS[0],
  );
  const [storeIds, setStoreIds] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [filePreviewHeaders, setFilePreviewHeaders] = useState([]);
  const [filePreviewRows, setFilePreviewRows] = useState([]);
  const [previewError, setPreviewError] = useState("");
  const [detectedUploadOperation, setDetectedUploadOperation] = useState("");
  const [uploadValidationError, setUploadValidationError] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadResponseSummary, setUploadResponseSummary] = useState(null);
  const [uploadResponseRows, setUploadResponseRows] = useState([]);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySummary, setVerifySummary] = useState(null);
  const [verifyRows, setVerifyRows] = useState([]);

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
      const fileName = String(file?.name || "").toLowerCase();
      const parsed = fileName.endsWith(".json")
        ? await parseJsonPreviewData(file)
        : await parseCsvPreviewData(file);
      setFilePreviewHeaders(parsed.headers || []);
      setFilePreviewRows(parsed.rows || []);
      setPreviewError("");
      const detected = fileName.endsWith(".json")
        ? "UNKNOWN"
        : detectUploadOperationByHeaders(parsed.headers || []);
      setDetectedUploadOperation(detected);
      const detectedOption =
        OPERATION_OPTIONS.find((option) => option.value === detected) || null;
      const selectedOptionForPreview =
        detectedOption || operationType || OPERATION_OPTIONS[0];
      setUploadOperationType(selectedOptionForPreview);
      const selectedValue = selectedOptionForPreview?.value;
      const mismatch = detected !== "UNKNOWN" && detected !== selectedValue;
      setUploadValidationError(
        mismatch
          ? "Selected operation is not compatible with file. Please choose proper operation."
          : "",
      );
      setUploadResponseSummary(null);
      setUploadResponseRows([]);
      setFilePreviewOpen(true);
    } catch (error) {
      console.error("Failed to parse uploaded file for preview:", error);
      setFilePreviewHeaders([]);
      setFilePreviewRows([]);
      setPreviewError(error?.message || "Failed to parse uploaded file.");
      setDetectedUploadOperation("");
      setUploadValidationError("");
      setUploadResponseSummary(null);
      setUploadResponseRows([]);
      setFilePreviewOpen(true);
    }
  };

  const postEdcPaytmUpdate = async ({ file, updateType }, onProgress) => {
    const endpoints = [EDC_PAYTM_UPDATE_ENDPOINT, LOCAL_EDC_PAYTM_UPDATE_ENDPOINT];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const formData = new FormData();
        formData.append("update_type", updateType);
        formData.append("file", file);

        const response = await apiClient.post(endpoint, formData, {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (event) => {
            if (!onProgress) return;
            const total = event?.total || 0;
            const loaded = event?.loaded || 0;
            if (total > 0) {
              const percent = Math.round((loaded / total) * 100);
              onProgress(percent);
            }
          },
        });
        return response;
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        if (status && status !== 404) throw error;
      }
    }

    throw lastError || new Error("All configured EDC update endpoints failed.");
  };

  const postEdcPineLabsUpdate = async ({ file }, onProgress) => {
    const endpoints = [EDC_UPDATE_ENDPOINT, LOCAL_EDC_UPDATE_ENDPOINT];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const formData = new FormData();
        formData.append("search_option", "PineLabs");
        formData.append("file", file);

        const response = await apiClient.post(endpoint, formData, {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (event) => {
            if (!onProgress) return;
            const total = event?.total || 0;
            const loaded = event?.loaded || 0;
            if (total > 0) {
              const percent = Math.round((loaded / total) * 100);
              onProgress(percent);
            }
          },
        });
        return response;
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        if (status && status !== 404) throw error;
      }
    }

    throw lastError || new Error("All configured PineLabs update endpoints failed.");
  };

  const postVerifyEdc = async (deviceTagsValue) => {
    const endpoints = [VERIFY_EDC_ENDPOINT, LOCAL_VERIFY_EDC_ENDPOINT];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await apiClient.post(
          endpoint,
          { device_tags: deviceTagsValue },
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            timeout: 15000,
          },
        );
        return response;
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        if (status && status !== 404) throw error;
      }
    }

    throw lastError || new Error("All configured verify EDC endpoints failed.");
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadMessage("");
      setUploadProgress(0);
      setUploadResponseSummary(null);
      setUploadResponseRows([]);
      await openFilePreviewModal(file);
    }
  };
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadMessage("");
      setUploadProgress(0);
      setUploadResponseSummary(null);
      setUploadResponseRows([]);
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

  const handleUploadFile = async () => {
    if (
      detectedUploadOperation &&
      detectedUploadOperation !== "UNKNOWN" &&
      uploadOperationType?.value !== detectedUploadOperation
    ) {
      const message =
        "Selected operation is not compatible with file. Please choose proper operation.";
      setUploadValidationError(message);
      enqueueSnackbar(message, { variant: "error" });
      return;
    }

    if (!uploadFile) {
      enqueueSnackbar("Please upload a file.", { variant: "error" });
      return;
    }

    setUploadingFile(true);
    setUploadProgress(5);
    setUploadMessage("");
    setUploadResponseSummary(null);
    setUploadResponseRows([]);
    let progressTimer = null;
    progressTimer = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 3));
    }, 250);

    try {
      const isPineLabs = uploadOperationType?.value === "PINELABS";
      const updateType = mapOperationToUpdateType(uploadOperationType?.value);
      const response = isPineLabs
        ? await postEdcPineLabsUpdate({ file: uploadFile }, (progress) => {
            setUploadProgress((prev) => Math.max(prev, Math.min(progress, 95)));
          })
        : await postEdcPaytmUpdate(
            { file: uploadFile, updateType },
            (progress) => {
              setUploadProgress((prev) =>
                Math.max(prev, Math.min(progress, 95)),
              );
            },
          );

      if (progressTimer) clearInterval(progressTimer);
      setUploadProgress(100);

      const responseData = response?.data || {};
      const normalizedResponse = normalizeUploadResponse(responseData);
      setUploadResponseSummary(normalizedResponse.summary);
      setUploadResponseRows(normalizedResponse.rows);
      const apiMessage = extractApiMessage(responseData);
      const hasFailure =
        responseData?.success === false ||
        Number(responseData?.failure_count || 0) > 0 ||
        normalizedResponse.rows.some((row) => row.success === false);
      const message =
        apiMessage ||
        (hasFailure
          ? "EDC update failed."
          : `EDC update completed successfully (${isPineLabs ? "PineLabs" : updateType}).`);
      setUploadMessage(message);
      enqueueSnackbar(message, { variant: hasFailure ? "error" : "success" });
    } catch (error) {
      if (progressTimer) clearInterval(progressTimer);
      setUploadProgress(0);
      const errorPayload = error?.response?.data || {};
      const normalizedResponse = normalizeUploadResponse(errorPayload);
      if (
        normalizedResponse.summary.total_rows > 0 ||
        normalizedResponse.rows.length > 0
      ) {
        setUploadResponseSummary(normalizedResponse.summary);
        setUploadResponseRows(normalizedResponse.rows);
      }
      const apiMessage = extractApiMessage(errorPayload);
      const message = apiMessage || error?.message || "EDC update request failed.";
      setUploadMessage(message);
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setUploadingFile(false);
    }
  };

  const handlePreviewOperationChange = (opt) => {
    const next = opt || OPERATION_OPTIONS[0];
    setUploadOperationType(next);

    if (!detectedUploadOperation || detectedUploadOperation === "UNKNOWN") {
      setUploadValidationError("");
      return;
    }

    if (next?.value !== detectedUploadOperation) {
      const message =
        "Selected operation is not compatible with file. Please choose proper operation.";
      setUploadValidationError(message);
      enqueueSnackbar(message, { variant: "error" });
      return;
    }

    setUploadValidationError("");
  };

  const handleVerifySearch = async () => {
    const tags = parseDeviceTags(storeIds);
    if (!tags.length) {
      setVerifyError("Please enter at least one device tag.");
      setVerifySummary(null);
      setVerifyRows([]);
      return;
    }

    const deviceTagsValue = tags.join(",");
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const response = await postVerifyEdc(deviceTagsValue);
      const normalized = normalizeVerifyResponse(response?.data || {});
      setVerifySummary(normalized.summary);
      setVerifyRows(normalized.rows);
    } catch (error) {
      const message =
        extractApiMessage(error?.response?.data) ||
        error?.message ||
        "Failed to verify EDC device tags.";
      setVerifyError(message);
      setVerifySummary(null);
      setVerifyRows([]);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDownloadUploadResults = () => {
    const headers = ["store_id", "success", "message"];
    const rows = uploadResponseRows.map((row) =>
      headers.map((header) => row[header] ?? ""),
    );
    const csvLines = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell)}"`).join(",")),
    ];
    const blob = new Blob([`${csvLines.join("\n")}\n`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "edc-upload-results.csv";
    link.click();
    URL.revokeObjectURL(url);
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
              <div className="mt-2 flex w-full flex-col items-center space-y-2 text-center">
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
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enter device id here to verify :
          </label>
          <textarea
            value={storeIds}
            onChange={(e) => setStoreIds(e.target.value)}
            placeholder="Comma separated device IDs or one per line..."
            rows={4}
            className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleVerifySearch}
            disabled={verifyLoading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            <SearchOutlinedIcon fontSize="small" />
            {verifyLoading ? "Searching..." : "Search Data"}
          </button>
        </div>

        {verifyError ? (
          <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-300">
            {verifyError}
          </p>
        ) : null}
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
          <div className="max-h-[42vh] overflow-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-[#1a202b]">
                <tr>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                    query_tag
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                    success
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                    row_count
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                    reason
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                    store_id
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                    device_tag
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                    terminal_serial_no
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                    edc_device_serial_no
                  </th>
                </tr>
              </thead>
              <tbody>
                {verifyLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      Verifying device tags...
                    </td>
                  </tr>
                ) : verifyRows.length > 0 ? (
                  verifyRows.map((row) => (
                    <tr key={row.id} className="odd:bg-blue-50/60 dark:odd:bg-blue-500/10">
                      <td className="border-b border-gray-200 px-4 py-3 text-gray-900 dark:border-gray-700 dark:text-gray-100">
                        {row.query_tag}
                      </td>
                      <td
                        className={`border-b border-gray-200 px-4 py-3 font-semibold dark:border-gray-700 ${
                          row.success ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                        }`}
                      >
                        {String(row.success)}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                        {row.row_count}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                        {row.reason}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                        {row.store_id}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                        {row.device_tag}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                        {row.terminal_serial_no}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                        {row.edc_device_serial_no}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No rows to display.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
        onClose={() => {
          if (uploadingFile) return;
          setFilePreviewOpen(false);
        }}
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
              onChange={handlePreviewOperationChange}
              searchable={false}
              placeholder="Select"
              buttonClassName="w-full border border-gray-300 bg-white"
            />
            {detectedUploadOperation && detectedUploadOperation !== "UNKNOWN" ? (
              <p className="text-xs text-gray-500">
                Detected from file:{" "}
                <span className="font-semibold text-gray-700">
                  {detectedUploadOperation}
                </span>
              </p>
            ) : null}
            {uploadValidationError ? (
              <p className="text-xs font-medium text-red-600">
                {uploadValidationError}
              </p>
            ) : null}
          </div>

          {uploadMessage ? (
            <p className="text-xs font-medium text-gray-700">{uploadMessage}</p>
          ) : null}
          {(uploadingFile || uploadProgress > 0) && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-right text-[11px] text-gray-500">
                {uploadProgress}% uploaded
              </p>
            </div>
          )}
          {uploadResponseRows.length > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleDownloadUploadResults}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-600"
                >
                  <DownloadOutlinedIcon fontSize="small" />
                  Download Results
                </button>
              </div>
              <div className="max-h-44 overflow-auto rounded-md border border-gray-200">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      <th className="border-b border-gray-200 px-3 py-2 font-semibold text-gray-700">
                        store_id
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 font-semibold text-gray-700">
                        success
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 font-semibold text-gray-700">
                        message
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResponseRows.map((row) => (
                      <tr key={row.id}>
                        <td className="border-b border-gray-100 px-3 py-2 text-gray-700">
                          {row.store_id}
                        </td>
                        <td
                          className={`border-b border-gray-100 px-3 py-2 font-semibold ${
                            row.success ? "text-emerald-700" : "text-red-700"
                          }`}
                        >
                          {String(row.success)}
                        </td>
                        <td className="border-b border-gray-100 px-3 py-2 text-gray-700">
                          {row.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {previewError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {previewError}
            </div>
          ) : uploadResponseRows.length === 0 ? (
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
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (uploadingFile) return;
                setFilePreviewOpen(false);
              }}
              disabled={uploadingFile}
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleUploadFile}
              disabled={!uploadFile || uploadingFile}
              className="inline-flex items-center rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadingFile ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </CustomModal>
    </PageLayout>
  );
};

export default EdcDevice;
