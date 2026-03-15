import React, { useCallback, useMemo, useRef, useState } from "react";
import PageLayout from "../../../components/PageLayout";
import CustomDropdown from "../../../components/CustomDropdown";
import HistoryTable from "../../../components/HistoryTable";
import CustomModal from "../../../components/CustomModal";
import apiClient from "../../../api/client";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

const SAMPLE_JOBS = [
  {
    id: "8a780ce2-0fcc-44a1-b2fa-a6293c4856cd",
    requested_by: "admin.user@enterprise.com",
    timestamp: "2026-02-03T23:14:00Z",
    status: "completed",
    log_address: "#",
  },
];

const GT_DELETION_FETCH_ENDPOINTS = [
  "http://localhost:8173/__deku/api/v1/__jmd/gt-deletion/fetch",
  "/__deku/api/v1/__jmd/gt-deletion/fetch",
];
const GT_DELETION_UPLOAD_ENDPOINTS = [
  "http://localhost:8173/__deku/api/v1/__jmd/gt-deletion/delete",
  "/__deku/api/v1/__jmd/gt-deletion/delete",
];

const FILE_TYPE_OPTIONS = [{ label: "CSV Format (.csv)", value: "csv" }];
const REQUIRED_HEADERS = ["mobile_number"];

const formatTimestamp = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return `${date} ${time}`;
};

const parseMobileNumbers = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const findInvalidMobileNumbers = (mobileNumbers = []) =>
  mobileNumbers.filter((mobileNumber) => !/^\d+$/.test(String(mobileNumber || "").trim()));

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .replace(/^"|"$/g, "")
    .toLowerCase();

const parseCsvPreviewData = async (file) => {
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((part) => part.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",").map((part) => part.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
};

const validateCsvHeaders = (headers = []) => {
  const normalizedHeaders = headers.map(normalizeHeader);
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !normalizedHeaders.includes(normalizeHeader(header)),
  );

  if (!headers.length) {
    return {
      checked: true,
      isValid: false,
      message: "Could not read file headers.",
    };
  }

  if (missingHeaders.length) {
    return {
      checked: true,
      isValid: false,
      message: `Missing required headers: ${missingHeaders.join(", ")}`,
    };
  }

  return {
    checked: true,
    isValid: true,
    message: "File headers look valid.",
  };
};

const buildNormalizedGtDeletionCsvFile = (rows = [], originalFileName = "gt-delete.csv") => {
  const csvLines = [
    REQUIRED_HEADERS.join(","),
    ...rows.map((row) => `"${String(row?.mobile_number ?? row?.mobile_number?.trim?.() ?? "").replace(/"/g, '""')}"`),
  ];
  const csvContent = `${csvLines.join("\n")}\n`;
  return new File([csvContent], originalFileName, {
    type: "text/csv;charset=utf-8;",
  });
};

const fetchGtDeletionDetails = async (mobileNumbers = []) => {
  let lastError = null;

  for (const endpoint of GT_DELETION_FETCH_ENDPOINTS) {
    try {
      const response = await apiClient.post(
        endpoint,
        { mobile_numbers: mobileNumbers },
        {
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
          },
          skipAuth: true,
        },
      );
      return response;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (status && status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Failed to fetch GT deletion details.");
};

const uploadGtDeletionFile = async (file, rows, onProgress) => {
  let lastError = null;
  const formData = new FormData();
  const normalizedFile = buildNormalizedGtDeletionCsvFile(
    rows,
    file?.name || "gt-delete.csv",
  );
  formData.append("file", normalizedFile);

  for (const endpoint of GT_DELETION_UPLOAD_ENDPOINTS) {
    try {
      const response = await apiClient.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        skipAuth: true,
        onUploadProgress: (event) => {
          if (!onProgress) return;
          const total = event?.total || 0;
          const loaded = event?.loaded || 0;
          if (total > 0) {
            onProgress(Math.round((loaded / total) * 100));
          }
        },
      });
      return response;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (status && status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Failed to upload GT deletion file.");
};

const normalizeGtDeletionUploadResponse = (payload, fallbackRows = []) => {
  const items = Array.isArray(payload?.data) ? payload.data : [];

  if (!items.length) {
    return fallbackRows.map((row, index) => ({
      id: `${row?.mobile_number || "row"}-${index}`,
      mobile_number: String(row?.mobile_number || "—"),
      success: false,
      reason: payload?.error || payload?.message || "No response rows returned",
    }));
  }

  return items.map((item, index) => ({
    id: `${item?.mobile_number || "row"}-${index}`,
    mobile_number: String(item?.mobile_number || "—"),
    success: item?.success === true,
    reason: String(item?.reason || item?.message || "—"),
  }));
};

const normalizeGtDeletionRows = (payload, fallbackMobileNumbers = []) => {
  const items = Array.isArray(payload?.data) ? payload.data : [];

  if (!items.length) {
    return fallbackMobileNumbers.map((mobileNumber, index) => ({
      id: `${mobileNumber}-${index}`,
      prm_id: "—",
      mobile_number: mobileNumber,
      seller_name: "Data not found",
      user_type_id: "—",
    }));
  }

  return items.flatMap((item, itemIndex) => {
    const mobileNumber = String(item?.mobile_number || fallbackMobileNumbers[itemIndex] || "—");
    const rows = Array.isArray(item?.data) ? item.data : [];

    if (!rows.length) {
      return [
        {
          id: `${mobileNumber}-${itemIndex}`,
          prm_id: "—",
          mobile_number: mobileNumber,
          seller_name: item?.reason || "Data not found",
          user_type_id: "—",
        },
      ];
    }

    return rows.map((row, rowIndex) => ({
      id: `${mobileNumber}-${row?.id || rowIndex}`,
      prm_id: String(row?.prm_id || "—"),
      mobile_number: String(row?.mobile_number || mobileNumber),
      seller_name: String(row?.seller_name || row?.store_name || "—"),
      user_type_id:
        row?.user_type_id === null || row?.user_type_id === undefined
          ? "—"
          : String(row.user_type_id),
    }));
  });
};

const GTDeletion = () => {
  const fileInputRef = useRef(null);
  const [fileType, setFileType] = useState(FILE_TYPE_OPTIONS[0]);
  const [retailerIds, setRetailerIds] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [historyRows, setHistoryRows] = useState(SAMPLE_JOBS);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshKey] = useState(0);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [filePreviewHeaders, setFilePreviewHeaders] = useState([]);
  const [filePreviewRows, setFilePreviewRows] = useState([]);
  const [fileValidation, setFileValidation] = useState({
    checked: false,
    isValid: false,
    message: "",
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadResponseRows, setUploadResponseRows] = useState([]);
  const [searchRows, setSearchRows] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

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
        accessor: (row) => (row.id ? `${String(row.id).slice(0, 8)}...` : "—"),
      },
      { key: "requested_by", label: "REQUESTED BY" },
      {
        key: "timestamp",
        label: "TIMESTAMP",
        accessor: (row) => formatTimestamp(row.timestamp),
      },
      {
        key: "status",
        label: "STATUS",
        type: "badge",
        badgeColors: { completed: "success", processing: "info" },
      },
      {
        key: "log_address",
        label: "ACTIONS",
        type: "download",
        headerClassName: "text-right",
        cellClassName: "text-right",
        downloadTitle: "Download",
      },
    ],
    [],
  );

  const filteredSearchRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return searchRows;
    return searchRows.filter((row) =>
      [row.prm_id, row.mobile_number, row.seller_name, row.user_type_id].some(
        (value) => String(value || "").toLowerCase().includes(query),
      ),
    );
  }, [searchQuery, searchRows]);

  const resetUploadUiState = () => {
    setUploadingFile(false);
    setUploadProgress(0);
    setUploadMessage("");
    setUploadResponseRows([]);
  };

  const openFilePreviewModal = async (file) => {
    resetUploadUiState();
    const parsed = await parseCsvPreviewData(file);
    setFilePreviewHeaders(parsed.headers || []);
    setFilePreviewRows(parsed.rows || []);
    setFileValidation(validateCsvHeaders(parsed.headers || []));
    setFilePreviewOpen(true);
  };

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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    setUploadFile(file);
    await openFilePreviewModal(file);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    await openFilePreviewModal(file);
    e.target.value = "";
  };

  const handleSampleDownload = () => {
    const csv = "mobile_number\n7977859426";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gt-deletion-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSearchData = async () => {
    const mobileNumbers = parseMobileNumbers(retailerIds);
    setSearchError("");
    setSearchQuery("");
    setSearchOpen(true);

    if (!mobileNumbers.length) {
      setSearchError("Please enter at least one mobile number.");
      setSearchRows([]);
      return;
    }

    const invalidMobileNumbers = findInvalidMobileNumbers(mobileNumbers);
    if (invalidMobileNumbers.length) {
      setSearchError("Only numeric mobile numbers are allowed.");
      setSearchRows([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetchGtDeletionDetails(mobileNumbers);
      setSearchRows(normalizeGtDeletionRows(response?.data || {}, mobileNumbers));
    } catch (error) {
      const isTimeout =
        error?.code === "ECONNABORTED" ||
        String(error?.message || "").toLowerCase().includes("timeout");
      setSearchError(
        (isTimeout && "Request timed out. Please try again.") ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch GT deletion details.",
      );
      setSearchRows(normalizeGtDeletionRows({}, mobileNumbers));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDownloadSearchRows = () => {
    const headers = ["prm_id", "mobile_number", "seller_name", "user_type_id"];
    const rows = filteredSearchRows.map((row) =>
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
    link.download = "gt-deletion-details.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrimaryUpload = async () => {
    if (!uploadFile || !fileValidation.isValid || !filePreviewRows.length) return;

    setUploadingFile(true);
    setUploadProgress(5);
    setUploadMessage("");

    try {
      const response = await uploadGtDeletionFile(
        uploadFile,
        filePreviewRows,
        (progress) => {
          setUploadProgress((prev) => Math.max(prev, Math.min(progress, 95)));
        },
      );
      const normalizedRows = normalizeGtDeletionUploadResponse(
        response?.data || {},
        filePreviewRows,
      );
      const message =
        response?.data?.message ||
        response?.data?.error ||
        "GT deletion file processed.";
      setUploadProgress(100);
      setUploadMessage(message);
      setUploadResponseRows(normalizedRows);
    } catch (error) {
      const errorPayload = error?.response?.data || {};
      setUploadProgress(0);
      setUploadMessage(
        errorPayload?.message ||
          errorPayload?.error ||
          error?.message ||
          "Failed to upload GT deletion file.",
      );
      setUploadResponseRows(
        normalizeGtDeletionUploadResponse(errorPayload, filePreviewRows),
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadUploadResults = () => {
    const headers = ["mobile_number", "success", "reason"];
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
    link.download = "gt-deletion-upload-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClosePreview = () => {
    if (uploadingFile) return;
    setFilePreviewOpen(false);
    resetUploadUiState();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <PageLayout
      title="GT Deletion"
      titleClassName="text-blue-600 font-bold"
      contentClassName="flex flex-1 flex-col gap-6 overflow-auto"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800/50">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Instructions
            </h3>
          </div>
          <ul className="list-inside list-disc space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>Each row in the CSV represents a unique mobile number.</li>
            <li>Ensure the mobile number is present in system before deletion request.</li>
            <li>
              Required field: <code className="font-mono text-xs">mobile_number</code>.
            </li>
            <li>Do not modify the sample file header structure.</li>
          </ul>
        </div>

        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Update Configuration
          </h3>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Select File Type
          </label>
          <CustomDropdown
            options={FILE_TYPE_OPTIONS}
            value={fileType}
            onChange={(opt) => setFileType(opt || FILE_TYPE_OPTIONS[0])}
            searchable={false}
            placeholder="Select"
            buttonClassName="w-full border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
          />
          <button
            type="button"
            onClick={handleSampleDownload}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            <DownloadOutlinedIcon fontSize="small" />
            Download the sample file
          </button>
        </div>

        <div className="flex flex-col rounded-xl border border-dashed border-gray-300 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800/50">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            File Upload
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
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <DescriptionOutlinedIcon sx={{ fontSize: 32 }} />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Drag and drop your file here
            </p>
            <label className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30">
              <UploadOutlinedIcon fontSize="small" />
              Select File to Upload
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
            {uploadFile && (
              <div className="mt-2 flex w-full flex-col items-center space-y-2 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {uploadFile.name}
                </p>
                {fileValidation.checked ? (
                  <div className="flex w-full justify-center">
                    <div
                      className={`inline-flex max-w-full items-start gap-2 rounded px-3 py-2 text-left text-[11px] leading-snug ${
                        fileValidation.isValid
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                      }`}
                    >
                      {fileValidation.isValid ? (
                        <CheckCircleOutlineIcon
                          sx={{ fontSize: 14 }}
                          className="mt-0.5 shrink-0"
                        />
                      ) : (
                        <ErrorOutlineIcon
                          sx={{ fontSize: 14 }}
                          className="mt-0.5 shrink-0"
                        />
                      )}
                      <span className="break-words">{fileValidation.message}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="absolute h-px w-full bg-gray-300 dark:bg-gray-600" />
        <div className="relative h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold text-blue-600 dark:text-blue-400">
          Get GT Retailer Info
        </h2>
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enter mobile number :
          </label>
          <textarea
            value={retailerIds}
            onChange={(e) => setRetailerIds(e.target.value)}
            placeholder="Enter comma separated mobile numbers here"
            rows={4}
            className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Only numeric mobile numbers are allowed. Use commas or new lines to add
            multiple numbers.
          </p>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSearchData}
              disabled={searchLoading}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-white px-6 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <SearchOutlinedIcon fontSize="small" />
              {searchLoading ? "Searching..." : "Search Data"}
            </button>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              searchOpen ? "mt-4 max-h-[70vh] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#0f1318]">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  RETAILER DETAILS
                </h3>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Close
                </button>
              </div>

              <div className="border-b border-gray-200 px-5 py-3 dark:border-gray-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-md">
                    <SearchOutlinedIcon
                      fontSize="small"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-[#141a22] dark:text-gray-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSearchRows}
                    disabled={searchLoading || filteredSearchRows.length === 0}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-[#141a22] dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                  >
                    <DownloadOutlinedIcon fontSize="small" />
                    Download
                  </button>
                </div>
                {searchError ? (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-300">
                    {searchError}
                  </p>
                ) : null}
              </div>

              <div className="max-h-[42vh] overflow-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-[#1a202b]">
                    <tr>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        prm_id
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        mobile_number
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        seller_name
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        user_type_id
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchLoading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          Loading retailer details...
                        </td>
                      </tr>
                    ) : filteredSearchRows.length > 0 ? (
                      filteredSearchRows.map((row) => (
                        <tr
                          key={row.id}
                          className="odd:bg-blue-50/60 dark:odd:bg-blue-500/10"
                        >
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-900 dark:border-gray-700 dark:text-gray-100">
                            {row.prm_id}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.mobile_number}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.seller_name}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.user_type_id}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
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
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Recent Updates
          </h2>
          <button
            type="button"
            className="cursor-pointer text-sm font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            VIEW ALL
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
          <HistoryTable
            columns={historyColumns}
            rowsOverride={historyRows}
            loadingOverride={historyLoading}
            onRefresh={fetchHistory}
            historyOptions={[{ key: "all", label: "All" }]}
            refreshKey={historyRefreshKey}
            firstColumnWidthPercent={18}
            showRefresh={false}
          />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-1 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <span>POWERED BY</span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200">
          <BoltIcon sx={{ fontSize: 18 }} className="text-blue-600" />
          EnterpriseHub
        </span>
      </div>

      <CustomModal
        open={filePreviewOpen}
        onClose={handleClosePreview}
        size="lg"
        isDark={false}
      >
        <div className="space-y-4 p-2">
          <div>
            <h3 className="text-lg font-semibold text-blue-700">File Data Review</h3>
            <p className="text-xs text-gray-500">
              Review uploaded file before proceeding.
            </p>
          </div>

          <div className="max-h-[50vh] overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-gray-100">
                <tr>
                  {(filePreviewHeaders.length ? filePreviewHeaders : REQUIRED_HEADERS).map(
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
                    <tr key={`${rowIndex}-${row.mobile_number || "row"}`}>
                      {(filePreviewHeaders.length ? filePreviewHeaders : REQUIRED_HEADERS).map(
                        (header) => (
                          <td
                            key={`${rowIndex}-${header}`}
                            className="border-b border-gray-100 px-4 py-2 text-gray-700"
                          >
                            {row[header] || "—"}
                          </td>
                        ),
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={filePreviewHeaders.length || REQUIRED_HEADERS.length}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >
                      No data rows found in uploaded file.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {fileValidation.checked ? (
            <p
              className={`text-xs font-medium ${
                fileValidation.isValid ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {fileValidation.message}
            </p>
          ) : null}

          {uploadMessage ? (
            <p className="text-xs font-medium text-gray-600">{uploadMessage}</p>
          ) : null}

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
              <div className="max-h-44 overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      <th className="border-b border-gray-200 px-4 py-2 font-semibold text-gray-700">
                        mobile_number
                      </th>
                      <th className="border-b border-gray-200 px-4 py-2 font-semibold text-gray-700">
                        success
                      </th>
                      <th className="border-b border-gray-200 px-4 py-2 font-semibold text-gray-700">
                        reason
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResponseRows.map((row) => (
                      <tr key={row.id}>
                        <td className="border-b border-gray-100 px-4 py-2 text-gray-700">
                          {row.mobile_number}
                        </td>
                        <td
                          className={`border-b border-gray-100 px-4 py-2 font-semibold ${
                            row.success ? "text-emerald-700" : "text-red-700"
                          }`}
                        >
                          {String(row.success)}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2 text-gray-700">
                          {row.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClosePreview}
              disabled={uploadingFile}
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrimaryUpload}
              disabled={
                uploadingFile || !filePreviewRows.length || !fileValidation.isValid
              }
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

export default GTDeletion;
