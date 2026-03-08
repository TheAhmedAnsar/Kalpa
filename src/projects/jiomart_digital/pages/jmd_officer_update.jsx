import React, { useCallback, useMemo, useState } from "react";
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

const formatTimestamp = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return `${date} ${time}`;
};

const FILE_TYPE_OPTIONS = [
  { label: "CSV Format (.csv)", value: "csv" },
];
const SAMPLE_DOWNLOAD_OPTIONS = [
  { label: "Insert Officer Sample", value: "insert_officer" },
  { label: "Update Officer Sample", value: "update_officer" },
];
const INSERT_REQUIRED_HEADERS = [
  "employeeId",
  "name",
  "emailId",
  "mobileNumber",
];
const UPDATE_REQUIRED_HEADERS = ["employeeId", "Is_active"];
const OFFICER_FETCH_ENDPOINT = "/__deku/api/v1/__jmd/officer/fetch";
const LOCAL_OFFICER_FETCH_ENDPOINT =
  "http://localhost:8173/__deku/api/v1/__jmd/officer/fetch";
const OFFICER_INSERT_ENDPOINT = "/__deku/api/v1/__jmd/officer/insert";
const LOCAL_OFFICER_INSERT_ENDPOINT =
  "http://localhost:8173/__deku/api/v1/__jmd/officer/insert";
const OFFICER_UPDATE_ENDPOINT = "/__deku/api/v1/__jmd/officer/update";
const LOCAL_OFFICER_UPDATE_ENDPOINT =
  "http://localhost:8173/__deku/api/v1/__jmd/officer/update";

const parseEmployeeIds = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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
const parseCsvHeaders = async (file) => {
  const text = await file.text();
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0);
  if (!firstLine) return [];
  return firstLine.split(",").map((header) => header.trim());
};

const detectOperationByHeaders = (headers = []) => {
  const normalized = headers.map(normalizeHeader);
  const insertHeaders = ["employeeid", "name", "emailid", "mobilenumber"];
  const updateHeaders = ["employeeid", "is_active"];

  const isInsert = insertHeaders.every((h) => normalized.includes(h));
  const isUpdate = updateHeaders.every((h) => normalized.includes(h));

  if (isInsert) return "insert_officer";
  if (isUpdate) return "update_officer";
  return "unknown";
};

const postOfficerFetch = async (employeeIds = []) => {
  const endpoints = [OFFICER_FETCH_ENDPOINT, LOCAL_OFFICER_FETCH_ENDPOINT];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await apiClient.post(
        endpoint,
        { employee_ids: employeeIds },
        { timeout: 15000 },
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

  throw lastError || new Error("All configured officer fetch endpoints failed.");
};

const postOfficerInsert = async (payload, onProgress) => {
  const endpoints = [OFFICER_INSERT_ENDPOINT, LOCAL_OFFICER_INSERT_ENDPOINT];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await apiClient.post(endpoint, payload, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
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

  throw lastError || new Error("All configured insert endpoints failed.");
};

const postOfficerUpdate = async (payload, onProgress) => {
  const endpoints = [OFFICER_UPDATE_ENDPOINT, LOCAL_OFFICER_UPDATE_ENDPOINT];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await apiClient.post(endpoint, payload, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
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

  throw lastError || new Error("All configured update endpoints failed.");
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

const normalizeOfficerRows = (payload, fallbackEmployeeIds = []) => {
  const items = coerceResponseArray(payload);
  if (!items.length) {
    return fallbackEmployeeIds.map((id) => ({
      employee_id: id,
      name: "Data not found",
      email_id: "Data not found",
      mobile_number: "Data not found",
      is_active: "Data not found",
      status: "failed",
      reason: "Officer not found",
    }));
  }

  return items.map((item, index) => {
    const fallbackId = fallbackEmployeeIds[index] || `Row-${index + 1}`;
    const details =
      item?.details && typeof item.details === "object" ? item.details : item;
    const success = item?.success === true;
    const nameValue = pickValue(details, ["name", "employee_name"]);
    const emailValue = pickValue(details, ["email_id", "emailId", "email"]);
    const mobileValue = pickValue(details, [
      "mobile_number",
      "mobileNumber",
      "mobile",
      "phone",
    ]);
    const activeValue = pickValue(details, ["is_active", "isActive", "active"]);
    return {
      employee_id: String(
        pickValue(details, ["employee_id", "employeeId", "id", "employee"]) ||
          pickValue(item, ["employee_id", "employeeId"]) ||
          fallbackId,
      ),
      name: String(nameValue === "" ? "Data not found" : nameValue),
      email_id: String(emailValue === "" ? "Data not found" : emailValue),
      mobile_number: String(mobileValue === "" ? "Data not found" : mobileValue),
      is_active: String(activeValue === "" ? "Data not found" : activeValue),
      status: success ? "success" : "failed",
      reason: String(item?.reason || (success ? "" : "Officer not found")),
    };
  });
};

const getValueByHeaderAliases = (row, aliases = []) => {
  if (!row || typeof row !== "object") return "";
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const found = entries.find(
      ([header]) => normalizeHeader(header) === normalizedAlias,
    );
    if (!found) continue;
    const value = found[1];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const extractApiMessage = (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object") return "";

  const direct =
    payload.message ||
    payload.error ||
    payload.reason ||
    payload.detail ||
    "";
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const first = payload.errors[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      return (
        first.message ||
        first.error ||
        first.reason ||
        JSON.stringify(first)
      );
    }
  }

  return "";
};

const collectRowFailureReasons = (payload) => {
  if (!payload || typeof payload !== "object") return [];
  const rows = Array.isArray(payload.data) ? payload.data : [];
  return rows
    .filter((row) => row && typeof row === "object" && row.success === false)
    .map((row) => {
      const id =
        row.employee_id || row.employeeId || row.id || row.employee || "Unknown";
      const reason = row.reason || row.message || row.error || "Failed";
      return `${id}: ${reason}`;
    });
};

const JmdOfficerUpdate = () => {
  console.log("JmdOfficerUpdate component loaded");
  const [fileType, setFileType] = useState(FILE_TYPE_OPTIONS[0]);
  const [sampleType, setSampleType] = useState(SAMPLE_DOWNLOAD_OPTIONS[0]);
  const [partnerIds, setPartnerIds] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [historyRows, setHistoryRows] = useState(SAMPLE_JOBS);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshKey] = useState(0);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [filePreviewHeaders, setFilePreviewHeaders] = useState([]);
  const [filePreviewRows, setFilePreviewRows] = useState([]);
  const [detectedOperation, setDetectedOperation] = useState("unknown");
  const [uploadedHeaders, setUploadedHeaders] = useState([]);
  const [fileValidation, setFileValidation] = useState({
    checked: false,
    isValid: false,
    message: "",
  });
  const [userInfoOpen, setUserInfoOpen] = useState(false);
  const [userInfoSearch, setUserInfoSearch] = useState("");
  const [userInfoRows, setUserInfoRows] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setHistoryRows(SAMPLE_JOBS);
    setHistoryLoading(false);
  }, []);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory, historyRefreshKey]);

  const resetUploadUiState = () => {
    setUploadingFile(false);
    setUploadMessage("");
    setUploadProgress(0);
  };

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
  const validateUploadedFile = async (file) => {
    if (!file) return { isValid: false, headers: [] };

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileValidation({
        checked: true,
        isValid: false,
        message: "Invalid file type. Please upload a .csv file.",
      });
      setUploadedHeaders([]);
      return { isValid: false, headers: [] };
    }

    try {
      const headers = await parseCsvHeaders(file);
      setUploadedHeaders(headers);
      const normalized = headers.map(normalizeHeader);
      const insertRequired = INSERT_REQUIRED_HEADERS.map(normalizeHeader);
      const updateRequired = UPDATE_REQUIRED_HEADERS.map(normalizeHeader);
      const isInsertValid = insertRequired.every((h) => normalized.includes(h));
      const isUpdateValid = updateRequired.every((h) => normalized.includes(h));

      if (!isInsertValid && !isUpdateValid) {
        setFileValidation({
          checked: true,
          isValid: false,
          message:
            "Invalid headers. Allowed headers are: employeeId,name,emailId,mobileNumber OR employeeId,Is_active",
        });
        return { isValid: false, headers };
      }

      setFileValidation({
        checked: true,
        isValid: true,
        message: isInsertValid
          ? "Valid Insert Officer CSV format."
          : "Valid Update Officer CSV format.",
      });
      return { isValid: true, headers };
    } catch {
      setUploadedHeaders([]);
      setFileValidation({
        checked: true,
        isValid: false,
        message: "Could not read CSV headers. Please re-upload the file.",
      });
      return { isValid: false, headers: [] };
    }
  };
  const openFilePreviewModal = async (file) => {
    resetUploadUiState();
    const { headers, rows } = await parseCsvPreviewData(file);
    setFilePreviewHeaders(headers);
    setFilePreviewRows(rows);
    setDetectedOperation(detectOperationByHeaders(headers));
    setFilePreviewOpen(true);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      setUploadFile(file);
      const result = await validateUploadedFile(file);
      if (result?.isValid) {
        await openFilePreviewModal(file);
      } else {
        setFilePreviewOpen(false);
        resetUploadUiState();
      }
    }
  };
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const result = await validateUploadedFile(file);
      if (result?.isValid) {
        await openFilePreviewModal(file);
      } else {
        setFilePreviewOpen(false);
        resetUploadUiState();
      }
    }
    e.target.value = "";
  };

  const handleSampleDownload = (type) => {
    const isUpdate = type === "update_officer";
    const csv = isUpdate
      ? "employeeId,Is_active\n12345678,1"
      : "employeeId,name,emailId,mobileNumber\n12345678,Mr. Pradeep Koulagi,pradeep.koulagi@ril.com,6360113728";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = isUpdate
      ? "jmd-officer-update-sample.csv"
      : "jmd-officer-insert-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const getPrimaryActionLabel = () => {
    if (detectedOperation === "insert_officer") return "Insert Officer";
    if (detectedOperation === "update_officer") return "Update Officer";
    return "Upload";
  };

  const buildInsertPayload = () => ({
    officer_data: filePreviewRows.map((row) => ({
      employeeId: String(
        getValueByHeaderAliases(row, ["employeeId", "employee_id"]),
      ).trim(),
      emailId: String(
        getValueByHeaderAliases(row, ["emailId", "email_id"]),
      ).trim(),
      mobileNumber: String(
        getValueByHeaderAliases(row, ["mobileNumber", "mobile_number"]),
      ).trim(),
      name: String(getValueByHeaderAliases(row, ["name"])).trim(),
    })),
  });

  const buildUpdatePayload = () => ({
    officer_data: filePreviewRows.map((row) => {
      const isActiveRaw = String(
        getValueByHeaderAliases(row, ["Is_active", "is_active", "isActive"]),
      ).trim();
      return {
        employeeId: String(
          getValueByHeaderAliases(row, ["employeeId", "employee_id"]),
        ).trim(),
        Is_active: isActiveRaw,
      };
    }),
  });

  const handlePrimaryUpload = async () => {
    if (!filePreviewRows.length || detectedOperation === "unknown") return;

    setUploadingFile(true);
    setUploadProgress(5);
    setUploadMessage("");
    let progressTimer = null;
    progressTimer = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 3));
    }, 250);

    try {
      const payload =
        detectedOperation === "insert_officer"
          ? buildInsertPayload()
          : buildUpdatePayload();

      const requestFn =
        detectedOperation === "insert_officer"
          ? postOfficerInsert
          : postOfficerUpdate;

      const response = await requestFn(payload, (progress) => {
        setUploadProgress((prev) => Math.max(prev, Math.min(progress, 95)));
      });
      if (progressTimer) clearInterval(progressTimer);
      setUploadProgress(100);

      const responseData = response?.data || {};
      const apiMessage = extractApiMessage(responseData);
      const rowFailures = collectRowFailureReasons(responseData);
      const hasExplicitFailure = responseData?.success === false;
      const failureCount =
        Number(responseData?.failure_count) || rowFailures.length || 0;

      if (hasExplicitFailure || failureCount > 0) {
        const reasonPreview = rowFailures.slice(0, 3).join(" | ");
        setUploadMessage(
          apiMessage ||
            (reasonPreview
              ? `${getPrimaryActionLabel()} completed with errors: ${reasonPreview}`
              : `${getPrimaryActionLabel()} completed with ${failureCount} failed row(s).`),
        );
      } else {
        setUploadMessage(
          apiMessage || `${getPrimaryActionLabel()} request completed successfully.`,
        );
      }
      fetchHistory();
    } catch (error) {
      if (progressTimer) clearInterval(progressTimer);
      setUploadProgress(0);
      const errorPayload = error?.response?.data;
      const apiMessage = extractApiMessage(errorPayload);
      const rowFailures = collectRowFailureReasons(errorPayload);
      const reasonPreview = rowFailures.slice(0, 3).join(" | ");
      setUploadMessage(
        apiMessage ||
          (reasonPreview
            ? `${getPrimaryActionLabel()} failed: ${reasonPreview}`
            : "") ||
          error?.message ||
          `${getPrimaryActionLabel()} request failed.`,
      );
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setUploadingFile(false);
    }
  };

  const handleSearchData = async () => {
    const employeeIds = parseEmployeeIds(partnerIds);
    setPreviewError("");
    setUserInfoSearch("");
    setUserInfoOpen(true);

    if (!employeeIds.length) {
      setPreviewError("Please enter at least one employeeId.");
      setUserInfoRows([]);
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await postOfficerFetch(employeeIds);
      const responseData = response?.data || {};
      setUserInfoRows(normalizeOfficerRows(responseData, employeeIds));
    } catch (error) {
      const isTimeout =
        error?.code === "ECONNABORTED" ||
        String(error?.message || "").toLowerCase().includes("timeout");
      const message =
        (isTimeout && "Request timed out. Please try again.") ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch officer details.";
      setPreviewError(message);
      setUserInfoRows(normalizeOfficerRows([], employeeIds));
    } finally {
      setPreviewLoading(false);
    }
  };

  const filteredUserInfoRows = useMemo(() => {
    const query = userInfoSearch.trim().toLowerCase();
    if (!query) return userInfoRows;
    return userInfoRows.filter((row) =>
      [
        row.employee_id,
        row.name,
        row.email_id,
        row.mobile_number,
        row.is_active,
        row.status,
        row.reason,
      ].some(
        (value) => String(value || "").toLowerCase().includes(query),
      ),
    );
  }, [userInfoRows, userInfoSearch]);

  const handleDownloadUserInfo = () => {
    const headers = [
      "employee_id",
      "name",
      "email_id",
      "mobile_number",
      "is_active",
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
    link.download = "jmd-officer-details.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout
      title="JMD Officer Update"
      titleClassName="text-blue-600 font-bold"
      contentClassName="flex flex-1 flex-col gap-6 overflow-auto"
    >
      {/* Three cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Instructions */}
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
            <li>Each row in the CSV represents a unique JMD Officer ID.</li>
            <li>Ensure the officer type matches the system registry.</li>
            <li>
              Required fields: <code className="font-mono text-xs">OfficerID</code>
              , <code className="font-mono text-xs">OfficerType</code>.
            </li>
            <li>Do not modify the sample file header structure.</li>
          </ul>
        </div>

        {/* Update Configuration */}
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
          <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Sample Download
            </label>
            <CustomDropdown
              options={SAMPLE_DOWNLOAD_OPTIONS}
              value={sampleType}
              onChange={(opt) => setSampleType(opt || SAMPLE_DOWNLOAD_OPTIONS[0])}
              searchable={false}
              placeholder="Select Sample (Insert/Update)"
              buttonClassName="w-full border border-blue-600 bg-white text-blue-700 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300"
            />
            <button
              type="button"
              onClick={() => handleSampleDownload(sampleType?.value)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <DownloadOutlinedIcon fontSize="small" />
              Download Sample
            </button>
          </div>
        </div>

        {/* File Upload */}
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
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
            {uploadFile && (
              <div className="mt-2 w-full space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {uploadFile.name}
                </p>
                {uploadedHeaders.length > 0 ? (
                  <p className="rounded bg-gray-50 px-2 py-1 text-[11px] text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                    Headers: {uploadedHeaders.join(", ")}
                  </p>
                ) : null}
                {fileValidation.checked ? (
                  <div className="flex w-full justify-center">
                    <div
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-center ${
                        fileValidation.isValid
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                      }`}
                    >
                      {fileValidation.isValid ? (
                        <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
                      ) : (
                        <ErrorOutlineIcon sx={{ fontSize: 14 }} />
                      )}
                      {fileValidation.message}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-px w-full bg-gray-300 dark:bg-gray-600" />
        <div className="relative h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      {/* Get JMD Officer Info */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-blue-600 dark:text-blue-400">
          Get JMD Officer Info
        </h2>
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enter Officer id :
          </label>
          <textarea
            value={partnerIds}
            onChange={(e) => setPartnerIds(e.target.value)}
            placeholder="Enter comma separated officer id here"
            rows={4}
            className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSearchData}
              disabled={previewLoading}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-white px-6 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <SearchOutlinedIcon fontSize="small" />
              {previewLoading ? "Fetching..." : "Fetch Data"}
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
                  OFFICER DETAILS
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
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-600 dark:bg-[#141a22] dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
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
                        employee_id
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        name
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        email_id
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        mobile_number
                      </th>
                      <th className="border-b border-gray-200 px-5 py-3 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-100">
                        is_active
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
                          colSpan={7}
                          className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          Loading officer details...
                        </td>
                      </tr>
                    ) : filteredUserInfoRows.length > 0 ? (
                      filteredUserInfoRows.map((row, index) => (
                        <tr
                          key={`${row.employee_id}-${index}`}
                          className="odd:bg-blue-50/60 dark:odd:bg-blue-500/10"
                        >
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-900 dark:border-gray-700 dark:text-gray-100">
                            {row.employee_id}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.name}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.email_id}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.mobile_number}
                          </td>
                          <td className="border-b border-gray-200 px-5 py-3 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                            {row.is_active}
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
                          colSpan={7}
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

      {/* Recent Activity */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Recent Activity
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

      {/* Footer */}
      <div className="flex flex-col items-center justify-center gap-1 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <span>POWERED BY</span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200">
          <BoltIcon sx={{ fontSize: 18 }} className="text-blue-600" />
          EnterpriseHub
        </span>
      </div>

      <CustomModal
        open={filePreviewOpen}
        onClose={() => {
          if (uploadingFile) return;
          setFilePreviewOpen(false);
          resetUploadUiState();
        }}
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
                  {(filePreviewHeaders.length
                    ? filePreviewHeaders
                    : ["employeeId", "name", "emailId", "mobileNumber"]
                  ).map((header) => (
                    <th
                      key={header}
                      className="border-b border-gray-200 px-4 py-2 font-semibold text-gray-700"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filePreviewRows.length > 0 ? (
                  filePreviewRows.map((row, rowIndex) => (
                    <tr key={`${rowIndex}-${row.employeeId || "row"}`}>
                      {(filePreviewHeaders.length
                        ? filePreviewHeaders
                        : ["employeeId", "name", "emailId", "mobileNumber"]
                      ).map((header) => (
                        <td
                          key={`${rowIndex}-${header}`}
                          className="border-b border-gray-100 px-4 py-2 text-gray-700"
                        >
                          {row[header] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={filePreviewHeaders.length || 4}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >
                      No data rows found in uploaded file.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {uploadMessage ? (
            <p className="text-xs font-medium text-gray-600">{uploadMessage}</p>
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
              onClick={() => {
                setFilePreviewOpen(false);
                resetUploadUiState();
              }}
              disabled={uploadingFile}
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrimaryUpload}
              disabled={
                uploadingFile ||
                !filePreviewRows.length ||
                detectedOperation === "unknown"
              }
              className="inline-flex items-center rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadingFile ? "Uploading..." : getPrimaryActionLabel()}
            </button>
          </div>
        </div>
      </CustomModal>
    </PageLayout>
  );
};

export default JmdOfficerUpdate;
