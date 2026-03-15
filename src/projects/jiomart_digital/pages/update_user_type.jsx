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

const USER_TYPE_HISTORY_ENDPOINT = "/__deku/api/v1/job/fetch";
const LOCAL_USER_TYPE_HISTORY_ENDPOINT =
  "http://localhost:8173/__deku/api/v1/job/fetch";

const USER_TYPE_SEARCH_ENDPOINTS = [
  "http://localhost:8173/__deku/api/v1/__jmd/retailer/user-type/fetch",
  "/__deku/api/v1/__jmd/retailer/user-type/fetch",
];

const USER_TYPE_UPLOAD_ENDPOINTS = [
  // "/__deku/api/v1/__jmd/user_type/update",
  // "/__deku/api/v1/__jmd/retailer_user_type/update",
  // "http://localhost:8173/__deku/api/v1/__jmd/retailer/user-type/update",
  "http://localhost:8173/__deku/api/v1/__jmd/retailer/user-type/update",
];

const ALLOWED_TASK_TYPES = new Set([
  "jmd:retailer_user_type_update",
  "jmd:user_type_update",
  "usertype:update",
]);

const REQUIRED_HEADERS = ["UserID", "NewTypeID"];
const FILE_TYPE_OPTIONS = [{ label: "CSV Format (.csv)", value: "csv" }];

const formatTimestamp = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return `${date} ${time}`;
};

const normalizeTaskTypeLabel = (taskType = {}) => {
  if (!taskType || typeof taskType !== "object") return "—";
  const type = String(taskType.type || "")
    .replace(/_/g, " ")
    .trim();
  const subType = String(taskType.sub_type || taskType.subType || "")
    .replace(/_/g, " ")
    .trim();

  return [type, subType]
    .filter(Boolean)
    .map((value) =>
      value.replace(/\b\w/g, (char) => char.toUpperCase()),
    )
    .join(" - ") || "—";
};

const isAllowedTaskType = (taskType = {}) => {
  const type = String(taskType.type || "").trim().toLowerCase();
  const subType = String(taskType.sub_type || taskType.subType || "")
    .trim()
    .toLowerCase();
  return ALLOWED_TASK_TYPES.has(`${type}:${subType}`);
};

const normalizeHistoryRows = (items = []) =>
  items
    .filter((item) => isAllowedTaskType(item?.task_type || item?.taskType))
    .map((item, index) => ({
      id: String(item?.job_id || item?.id || `history-${index + 1}`),
      task_type_label: normalizeTaskTypeLabel(item?.task_type || item?.taskType),
      timestamp: item?.completed_at || item?.created_at || item?.timestamp || "",
      status: String(item?.status || "unknown").toLowerCase(),
      log_address:
        item?.log_trace?.json_address || item?.log_trace?.csv_address || "",
    }));

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .replace(/^"|"$/g, "")
    .toLowerCase();

const parsePartnerIds = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const findInvalidPartnerIds = (partnerIds = []) =>
  partnerIds.filter((partnerId) => !/^\d+$/.test(String(partnerId || "").trim()));

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

const pickValue = (source, keys) => {
  if (!source || typeof source !== "object") return "";
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const coerceResponseArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.rows)) return payload.data.rows;
  }
  return [];
};

const normalizeUserTypeRows = (payload, fallbackPartnerIds = []) => {
  const items = coerceResponseArray(payload);

  if (!items.length) {
    return fallbackPartnerIds.map((id) => ({
      partner_id: id,
      user_id: "Data not found",
      current_user_type: "Data not found",
      requested_user_type: "—",
      status: "failed",
      reason: "User details not found",
    }));
  }

  return items.map((item, index) => {
    const details =
      item?.details && typeof item.details === "object" ? item.details : item;
    const fallbackId = fallbackPartnerIds[index] || `Row-${index + 1}`;
    const success =
      item?.success === true ||
      String(item?.status || "")
        .trim()
        .toLowerCase() === "success";

    return {
      partner_id: String(
        pickValue(details, ["partner_id", "partnerId", "retailer_id"]) ||
          pickValue(item, ["partner_id", "partnerId"]) ||
          fallbackId,
      ),
      user_id: String(
        pickValue(details, ["user_id", "userId", "uid"]) || "Data not found",
      ),
      current_user_type: String(
        pickValue(details, [
          "current_user_type",
          "currentUserType",
          "user_type",
          "userType",
        ]) || "Data not found",
      ),
      requested_user_type: String(
        pickValue(details, ["new_user_type", "newUserType", "requested_user_type"]) ||
          "—",
      ),
      status: success ? "success" : String(item?.status || "failed"),
      reason: String(item?.reason || (success ? "" : "User details not found")),
    };
  });
};

const normalizeUserTypeUploadRows = (payload, fallbackRows = []) => {
  const items = coerceResponseArray(payload);

  if (!items.length) {
    return fallbackRows.map((row, index) => ({
      id: `${row?.UserID || row?.userId || "row"}-${index}`,
      user_id: String(row?.UserID || row?.userId || "—"),
      success: false,
      reason: String(
        payload?.error || payload?.message || "No response rows returned",
      ),
    }));
  }

  return items.map((item, index) => {
    const details =
      item?.details && typeof item.details === "object" ? item.details : item;
    return {
      id: `${pickValue(details, ["user_id", "userId", "UserID"]) || index}`,
      user_id: String(
        pickValue(details, ["user_id", "userId", "UserID", "id"]) || "—",
      ),
      success:
        item?.success === true ||
        String(item?.status || "").trim().toLowerCase() === "success",
      reason: String(item?.reason || item?.message || item?.error || "—"),
    };
  });
};

const fetchUserTypeHistory = async () => {
  const endpoints = [
    USER_TYPE_HISTORY_ENDPOINT,
    LOCAL_USER_TYPE_HISTORY_ENDPOINT,
  ];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await apiClient.post(
        endpoint,
        {
          type: "all",
          limit: 50,
          offset: 0,
          cluster: "jiomart digital",
        },
        {
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

  throw lastError || new Error("Failed to fetch user type update history.");
};

const fetchUserTypeDetails = async (partnerIds = []) => {
  let lastError = null;

  for (const endpoint of USER_TYPE_SEARCH_ENDPOINTS) {
    try {
      const response = await apiClient.post(
        endpoint,
        { partner_ids: partnerIds },
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

  throw lastError || new Error("Failed to fetch user type details.");
};

const uploadUserTypeFile = async (file, onProgress) => {
  let lastError = null;
  const formData = new FormData();
  formData.append("file", file);

  for (const endpoint of USER_TYPE_UPLOAD_ENDPOINTS) {
    try {
      const response = await apiClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
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

  throw lastError || new Error("Failed to upload user type file.");
};

const UpdateUserType = () => {
  const fileInputRef = useRef(null);
  const [fileType, setFileType] = useState(FILE_TYPE_OPTIONS[0]);
  const [partnerIds, setPartnerIds] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
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
  const [userInfoOpen, setUserInfoOpen] = useState(false);
  const [userInfoRows, setUserInfoRows] = useState([]);
  const [userInfoSearch, setUserInfoSearch] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetchUserTypeHistory();
      setHistoryRows(normalizeHistoryRows(response?.data?.data || []));
    } catch (error) {
      console.error("Failed to fetch user type update history", error);
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
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
      { key: "task_type_label", label: "TASK TYPE" },
      {
        key: "timestamp",
        label: "TIMESTAMP",
        accessor: (row) => formatTimestamp(row.timestamp),
      },
      {
        key: "status",
        label: "STATUS",
        type: "badge",
        badgeColors: {
          completed: "success",
          success: "success",
          processing: "info",
          queued: "info",
          running: "info",
          pending: "warning",
          failed: "error",
          error: "error",
        },
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

  const filteredUserInfoRows = useMemo(() => {
    const query = userInfoSearch.trim().toLowerCase();
    if (!query) return userInfoRows;
    return userInfoRows.filter((row) =>
      [
        row.partner_id,
        row.user_id,
        row.current_user_type,
        row.requested_user_type,
        row.status,
        row.reason,
      ].some((value) => String(value || "").toLowerCase().includes(query)),
    );
  }, [userInfoRows, userInfoSearch]);

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
    const csv = "UserID,NewTypeID\nUSER123,TYPE_A\nUSER456,TYPE_B";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "user-type-update-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrimaryUpload = async () => {
    if (!uploadFile || !fileValidation.isValid || !filePreviewRows.length) return;

    setUploadingFile(true);
    setUploadProgress(5);
    setUploadMessage("");
    setUploadResponseRows([]);

    try {
      const response = await uploadUserTypeFile(uploadFile, (progress) => {
        setUploadProgress((prev) => Math.max(prev, Math.min(progress, 95)));
      });
      const responseData = response?.data || {};
      setUploadResponseRows(
        normalizeUserTypeUploadRows(responseData, filePreviewRows),
      );
      const message =
        responseData?.message ||
        responseData?.error ||
        "User type update file processed.";
      setUploadProgress(100);
      setUploadMessage(message);
      setHistoryRefreshKey((prev) => prev + 1);
      await fetchHistory();
    } catch (error) {
      const errorPayload = error?.response?.data || {};
      setUploadProgress(0);
      setUploadResponseRows(
        normalizeUserTypeUploadRows(errorPayload, filePreviewRows),
      );
      setUploadMessage(
        errorPayload?.message ||
          errorPayload?.error ||
          error?.message ||
          "Failed to upload file.",
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const handleClosePreview = () => {
    if (uploadingFile) return;
    setFilePreviewOpen(false);
    resetUploadUiState();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSearchData = async () => {
    const ids = parsePartnerIds(partnerIds);
    setPreviewError("");
    setUserInfoSearch("");
    setUserInfoOpen(true);

    if (!ids.length) {
      setPreviewError("Please enter at least one partner id.");
      setUserInfoRows([]);
      return;
    }

    const invalidIds = findInvalidPartnerIds(ids);
    if (invalidIds.length) {
      setPreviewError("Only numeric partner ids are allowed.");
      setUserInfoRows([]);
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await fetchUserTypeDetails(ids);
      setUserInfoRows(normalizeUserTypeRows(response?.data || {}, ids));
    } catch (error) {
      const isTimeout =
        error?.code === "ECONNABORTED" ||
        String(error?.message || "").toLowerCase().includes("timeout");
      setPreviewError(
        (isTimeout && "Request timed out. Please try again.") ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch user type details.",
      );
      setUserInfoRows(normalizeUserTypeRows([], ids));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadUserInfo = () => {
    const headers = [
      "partner_id",
      "user_id",
      "current_user_type",
      "requested_user_type",
      "status",
      "reason",
    ];
    const rows = filteredUserInfoRows.map((row) =>
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
    link.download = "user-type-details.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadUploadResults = () => {
    const headers = ["user_id", "success", "reason"];
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
    link.download = "user-type-upload-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout
      title="User Type ID Update"
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
            <li>Each row in the CSV represents a unique User ID.</li>
            <li>Ensure the User Type matches the system registry.</li>
            <li>
              Required fields: <code className="font-mono text-xs">UserID</code>,
              <code className="ml-1 font-mono text-xs">NewTypeID</code>.
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
            {uploadFile ? (
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
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="absolute h-px w-full bg-gray-300 dark:bg-gray-600" />
        <div className="relative h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold text-blue-600 dark:text-blue-400">
          Get User Info
        </h2>
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enter Partner id :
          </label>
          <textarea
            value={partnerIds}
            onChange={(e) => setPartnerIds(e.target.value)}
            placeholder="Enter comma separated partner id here"
            rows={4}
            className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Only numeric partner ids are allowed. Use commas or new lines to add
            multiple ids.
          </p>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSearchData}
              disabled={previewLoading}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-white px-6 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <SearchOutlinedIcon fontSize="small" />
              {previewLoading ? "Searching..." : "Search Data"}
            </button>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              userInfoOpen ? "mt-4 max-h-[70vh] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#0f1318]">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  USER DETAILS
                </h3>
                <button
                  type="button"
                  onClick={() => setUserInfoOpen(false)}
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
                      value={userInfoSearch}
                      onChange={(e) => setUserInfoSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-[#141a22] dark:text-gray-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadUserInfo}
                    disabled={previewLoading || filteredUserInfoRows.length === 0}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-[#141a22] dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                  >
                    <DownloadOutlinedIcon fontSize="small" />
                    Download
                  </button>
                </div>
                {previewError ? (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-300">
                    {previewError}
                  </p>
                ) : null}
              </div>

              <div className="max-h-[42vh] overflow-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-[#1a202b]">
                    <tr>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        partner_id
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        user_id
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        current_user_type
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        requested_user_type
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        status
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        reason
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewLoading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          Loading user details...
                        </td>
                      </tr>
                    ) : filteredUserInfoRows.length > 0 ? (
                      filteredUserInfoRows.map((row, index) => (
                        <tr
                          key={`${row.partner_id}-${index}`}
                          className="odd:bg-blue-50/60 dark:odd:bg-blue-500/10"
                        >
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-900 dark:border-gray-700 dark:text-gray-100">
                            {row.partner_id}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.user_id}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.current_user_type}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.requested_user_type}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.status}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.reason || "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
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
                    <tr key={`${rowIndex}-${row.UserID || "row"}`}>
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
                        user_id
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
                          {row.user_id}
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

export default UpdateUserType;
