import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import CustomModal from "../../../components/CustomModal";
import CsvPreviewTable from "../../../components/CsvPreviewTable";
import XlsxPreviewTable from "../../../components/XlsxPreviewTable";
import HistoryTable from "../../../components/HistoryTable";
import apiClient from "../../../api/client";
import { useSnackbar } from "notistack";
import { selectUserEmail } from "../../../store/user";

const TABS = [
  { value: "moqRules", label: "MOQ Rules" },
  { value: "holidayUpdate", label: "Holiday Update" },
];

const TAB_LOOKUP = new Map(TABS.map((tab) => [tab.value, tab]));

const HOLIDAY_FULFILMENT_DEFAULT = "fm/lm";

const BUTTON_PRIMARY =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_SECONDARY =
  "inline-flex h-10 items-center cursor-pointer justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 hover:border-blue-500 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#15171a] dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-300";

const BUTTON_ACCENT =
  "inline-flex h-10 items-center cursor-pointer justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

const HISTORY_SECTIONS = [];

const HISTORY_SECTION_MAP = HISTORY_SECTIONS.reduce((accumulator, section) => {
  accumulator.set(section.key, section);
  return accumulator;
}, new Map());

const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const DEFAULT_HISTORY_STATE = Object.freeze({
  loading: false,
  hasFetched: false,
  error: "",
  entries: [],
});

const ensureHistoryString = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return String(value ?? "");
};

const pickHistoryValue = (source, keys) => {
  if (!source || typeof source !== "object") return "";
  for (const key of keys) {
    if (key in source && source[key] !== undefined && source[key] !== null) {
      const value = source[key];
      if (value !== "") {
        return value;
      }
    }
  }
  return "";
};

const coerceHistoryArray = (payload) => {
  if (!payload && payload !== 0) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === "object") {
    if (Array.isArray(payload.entries)) return payload.entries;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.results)) return payload.results;
  }
  return [];
};

const flattenHistoryItems = (items) => {
  if (!Array.isArray(items)) return [];
  const stack = [...items];
  const result = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      stack.push(...current);
    } else if (current !== undefined && current !== null) {
      result.push(current);
    }
  }

  return result.reverse();
};

const formatDumpTypeLabel = (value) => {
  if (!value && value !== 0) return "—";

  if (typeof value === "string") {
    const text = ensureHistoryString(value).replace(/_/g, " ").trim();
    if (!text) return "—";
    const [firstWord, ...rest] = text.split(/\s+/);
    const formattedFirst = firstWord
      ? firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase()
      : "";
    const formattedRest = rest.map((word) => word.toUpperCase());
    return [formattedFirst, ...formattedRest]
      .filter((segment) => segment && segment.trim())
      .join(" ");
  }

  if (typeof value === "object") {
    const typeValue = ensureHistoryString(
      pickHistoryValue(value, ["type", "Type", "category", "kind"]) ||
        value.type,
    );
    const subTypeValue = ensureHistoryString(
      pickHistoryValue(value, [
        "sub_type",
        "subType",
        "sub_category",
        "subCategory",
        "subtype",
      ]) || value.sub_type,
    );

    const formattedType = typeValue
      ? typeValue.charAt(0).toUpperCase() + typeValue.slice(1).toLowerCase()
      : "";
    const formattedSubType = subTypeValue ? subTypeValue.toUpperCase() : "";

    const combined = [formattedType, formattedSubType]
      .filter((segment) => segment && segment.trim())
      .join(" - ");

    return combined || "—";
  }

  const text = ensureHistoryString(value).trim();
  return text || "—";
};

const normalizeHistoryEntries = (payload, sectionKey, fallback = []) => {
  const rawItems = flattenHistoryItems(coerceHistoryArray(payload));
  const fallbackItems = flattenHistoryItems(coerceHistoryArray(fallback));
  const baseItems = rawItems.length ? rawItems : fallbackItems;

  return baseItems.map((item, index) => {
    if (!item || typeof item !== "object") {
      const text = ensureHistoryString(item);
      return {
        id: `${sectionKey}-${index}`,
        fileName: text || `Entry ${index + 1}`,
        user: "",
        timestamp: "",
      };
    }

    if (sectionKey === "fyndDump") {
      const dumpTypeValue =
        item.dump_type || item.dumpType || item.type || item.request_type;
      const createdAtValue =
        item.created_at ||
        item.createdAt ||
        item.timestamp ||
        item.updated_at ||
        item.updatedAt;

      return {
        id: ensureHistoryString(
          item.id || item.req_id || `${sectionKey}-${index}`,
        ),
        requestedBy: ensureHistoryString(
          pickHistoryValue(item, [
            "requested_by",
            "requestedBy",
            "user",
            "email",
            "created_by",
            "createdBy",
          ]) || item.requested_by,
        ),
        dumpType: formatDumpTypeLabel(dumpTypeValue),
        createdAt: ensureHistoryString(createdAtValue),
        fileAddress: ensureHistoryString(
          pickHistoryValue(item, [
            "file_address",
            "fileAddress",
            "gcp_file_address",
          ]) || item.file_address,
        ),
      };
    }

    const fileName = ensureHistoryString(
      pickHistoryValue(item, [
        "fileName",
        "file_name",
        "filename",
        "name",
        "label",
      ]) ||
        item.fileName ||
        item.file_name,
    );
    const user = ensureHistoryString(
      pickHistoryValue(item, [
        "user",
        "userName",
        "user_name",
        "uploadedBy",
        "uploaded_by",
        "createdBy",
        "created_by",
        "owner",
      ]) || item.user,
    );
    const timestampRaw =
      pickHistoryValue(item, [
        "timestamp",
        "uploadedAt",
        "uploaded_at",
        "createdAt",
        "created_at",
        "time",
        "updated_at",
      ]) || item.timestamp;

    return {
      id: ensureHistoryString(item.id || item._id || `${sectionKey}-${index}`),
      fileName: fileName || `Entry ${index + 1}`,
      user,
      timestamp: ensureHistoryString(timestampRaw),
    };
  });
};

const formatHistoryTimestamp = (value) => {
  const text = ensureHistoryString(value);
  if (!text) return "—";
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return HISTORY_DATE_FORMATTER.format(date);
  }
  return text;
};

const formatJobTypeLabel = (jobType = {}) => {
  if (!jobType || typeof jobType !== "object") return "—";
  const type = ensureHistoryString(jobType.type).toUpperCase() || "—";
  const subType = ensureHistoryString(jobType.sub_type || jobType.subType);
  const sub = subType ? subType.toUpperCase() : "";
  return [type, sub].filter(Boolean).join(" - ") || "—";
};

const normalizeJobHistory = (items = []) =>
  items.map((item, index) => {
    const id = ensureHistoryString(item.id || item.req_id || index);
    const status = ensureHistoryString(item.status).toLowerCase() || "unknown";
    const createdAt = ensureHistoryString(
      item.created_at || item.createdAt || item.timestamp,
    );
    const requestedBy =
      ensureHistoryString(item.user) ||
      ensureHistoryString(item.user_email) ||
      "—";
    const jobTypeLabel = formatJobTypeLabel(item.job_type || item.jobType);
    const fileUrl = ensureHistoryString(
      item.file_address || item.fileAddress || item.file_url || "",
    );
    const logUrl = ensureHistoryString(
      item.log_trace?.json_address || item.log_trace?.csv_address || "",
    );

    return {
      id,
      status,
      createdAt,
      requestedBy,
      jobTypeLabel,
      fileUrl,
      logUrl,
    };
  });

const cloneHistoryEntries = (entries, sectionKey) =>
  (entries || []).map((entry, index) => ({
    id: ensureHistoryString(entry?.id || `${sectionKey}-${index}`),
    fileName: ensureHistoryString(entry?.fileName) || `Entry ${index + 1}`,
    user: ensureHistoryString(entry?.user),
    timestamp: ensureHistoryString(entry?.timestamp),
    requestedBy: ensureHistoryString(entry?.requestedBy),
    dumpType: ensureHistoryString(entry?.dumpType),
    createdAt: ensureHistoryString(entry?.createdAt || entry?.timestamp),
    fileAddress: ensureHistoryString(entry?.fileAddress),
  }));

const escapeCsvValue = (value) => {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const triggerCsvDownload = (filename, headers, rows) => {
  const normalizedHeaders = headers.map(escapeCsvValue).join(",");
  const normalizedRows = rows
    .map((row) =>
      headers.map((_, idx) => escapeCsvValue(row[idx] ?? "")).join(","),
    )
    .join("\n");
  const csvContent =
    normalizedHeaders + (normalizedRows ? `\n${normalizedRows}` : "") + "\n";
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const triggerXlsxDownload = (filename, headers, rows) => {
  // Create a simple tab-separated format for XLSX
  const content = [headers, ...rows].map((row) => row.join("\t")).join("\n");

  const blob = new Blob([content], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const VaultWorkspace = ({ enabledTabs }) => {
  const resolvedTabs = useMemo(() => {
    if (!enabledTabs || enabledTabs.length === 0) {
      return TABS;
    }
    return enabledTabs.map((value) => TAB_LOOKUP.get(value)).filter(Boolean);
  }, [enabledTabs]);

  const userEmail = useSelector(selectUserEmail);
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(
    () => resolvedTabs[0]?.value ?? TABS[0].value,
  );
  const [uploadedFile, setUploadedFile] = useState(null);
  const [holidayFulfilmentModel, setHolidayFulfilmentModel] = useState(
    HOLIDAY_FULFILMENT_DEFAULT,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [lastRequestId, setLastRequestId] = useState("");
  const [dumpLoading, setDumpLoading] = useState(false);
  const [dumpRequestId, setDumpRequestId] = useState("");
  const [showDumpModal, setShowDumpModal] = useState(false);
  const [moqActionsOpen, setMoqActionsOpen] = useState(false);
  const [holidayActionsOpen, setHolidayActionsOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const fileInputRef = useRef(null);
  const moqMenuRef = useRef(null);
  const holidayMenuRef = useRef(null);
  const [isTabContentVisible, setIsTabContentVisible] = useState(true);
  const isInitialTabRender = useRef(true);
  const holidayPreviewColumns = useMemo(
    () => [
      "holiday",
      holidayFulfilmentModel ? holidayFulfilmentModel.toLowerCase() : "fm/lm",
    ],
    [holidayFulfilmentModel],
  );
  const historyFallbackMap = useMemo(() => {
    const map = new Map();
    HISTORY_SECTIONS.forEach((section) => {
      const normalized = normalizeHistoryEntries(
        section.fallbackEntries ?? [],
        section.key,
      );
      map.set(section.key, normalized);
    });
    return map;
  }, []);
  const [historyState, setHistoryState] = useState(() => {
    const initial = {};
    HISTORY_SECTIONS.forEach((section) => {
      if (section.key === "verifyPromise") return;
      initial[section.key] = { ...DEFAULT_HISTORY_STATE };
    });
    return initial;
  });

  const activeHistoryState = historyState[activeTab];

  const fetchHistory = async (sectionKey) => {
    const section = HISTORY_SECTION_MAP.get(sectionKey);
    if (!section?.endpoint) return;

    setHistoryState((prev) => {
      const current = prev[sectionKey] ?? { ...DEFAULT_HISTORY_STATE };
      return {
        ...prev,
        [sectionKey]: {
          ...current,
          loading: true,
          error: "",
        },
      };
    });

    try {
      const response = await apiClient.get(section.endpoint);
      const payload = response?.data ?? [];
      const fallbackEntries = historyFallbackMap.get(sectionKey) ?? [];
      const normalized = normalizeHistoryEntries(
        payload,
        sectionKey,
        fallbackEntries,
      );

      setHistoryState((prev) => {
        const current = prev[sectionKey] ?? { ...DEFAULT_HISTORY_STATE };
        return {
          ...prev,
          [sectionKey]: {
            ...current,
            loading: false,
            hasFetched: true,
            error: "",
            entries: cloneHistoryEntries(normalized, sectionKey),
          },
        };
      });
    } catch (error) {
      const fallbackEntries = historyFallbackMap.get(sectionKey) ?? [];
      const fallback = cloneHistoryEntries(fallbackEntries, sectionKey);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load history.";

      setHistoryState((prev) => {
        const current = prev[sectionKey] ?? { ...DEFAULT_HISTORY_STATE };
        return {
          ...prev,
          [sectionKey]: {
            ...current,
            loading: false,
            hasFetched: true,
            error: message,
            entries: fallback,
          },
        };
      });
    }
  };

  // const renderHistoryPanel = (sectionKey) => {
  //   const section = HISTORY_SECTION_MAP.get(sectionKey);
  //   if (!section || !section.endpoint) return null;
  //   const state = historyState[sectionKey] ?? { ...DEFAULT_HISTORY_STATE };

  //   return (
  //     <HistoryTable
  //       sectionKey={sectionKey}
  //       entries={state.entries}
  //       loading={state.loading}
  //       error={state.error}
  //       onRetry={() => fetchHistory(sectionKey)}
  //     />
  //   );
  // };

  const resetUploadState = () => {
    setUploadedFile(null);
    setHolidayFulfilmentModel(HOLIDAY_FULFILMENT_DEFAULT);
    setPreviewOpen(false);
    setMoqActionsOpen(false);
    setHolidayActionsOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetAllState = (nextTab) => {
    if (nextTab) setActiveTab(nextTab);
    resetUploadState();
  };

  useEffect(() => {
    setHistoryRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const section = HISTORY_SECTION_MAP.get(activeTab);
    if (!section?.endpoint) return;
    if (!activeHistoryState?.hasFetched && !activeHistoryState?.loading) {
      fetchHistory(activeTab);
    }
  }, [activeTab, activeHistoryState?.hasFetched, activeHistoryState?.loading]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moqActionsOpen) {
        if (moqMenuRef.current && !moqMenuRef.current.contains(event.target)) {
          setMoqActionsOpen(false);
        }
      }
      if (holidayActionsOpen) {
        if (
          holidayMenuRef.current &&
          !holidayMenuRef.current.contains(event.target)
        ) {
          setHolidayActionsOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moqActionsOpen, holidayActionsOpen]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setMoqActionsOpen(false);
    setHolidayActionsOpen(false);
    if (activeTab === "moqRules" || activeTab === "holidayUpdate") {
      setPreviewOpen(true);
    }
  };

  const handleClosePreview = () => {
    resetUploadState();
  };

  const handleSubmit = async () => {
    if (!uploadedFile) return;
    const isMoq = activeTab === "moqRules";
    setPreviewOpen(false);
    const formData = new FormData();

    formData.append("file", uploadedFile);

    if (isMoq) {
      formData.append(
        "job_type",
        JSON.stringify({ type: "moq", sub_type: "update" }),
      );
    } else {
      formData.append(
        "job_type",
        JSON.stringify({ type: "holiday", sub_type: "update" }),
      );
    }

    formData.append("execution_type", "now");

    try {
      const response = await apiClient.post(
        "/__deku/api/v1/job/create",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const requestId =
        response?.data?.request_id || response?.data?.req_id || "";
      setLastRequestId(requestId);
      setConfirmationOpen(true);
      setHistoryRefreshKey((prev) => prev + 1);
      enqueueSnackbar(
        requestId
          ? `${isMoq ? "MOQ" : "Holiday"} update submitted successfully (Request ID: ${requestId})`
          : `${isMoq ? "MOQ" : "Holiday"} update submitted successfully.`,
        { variant: "success" },
      );
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        `Failed to submit ${isMoq ? "MOQ" : "holiday"} update.`;
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      resetUploadState();
    }
  };

  const closeConfirmation = () => {
    setConfirmationOpen(false);
    setLastRequestId("");
  };

  const closeDumpModal = () => {
    setShowDumpModal(false);
    setDumpRequestId("");
  };

  const handleGetHolidayDump = async () => {
    if (!holidayFulfilmentModel) return;

    setDumpLoading(true);

    try {
      const response = await apiClient.post(
        "/__deku/api/v1/__jiomart/extract/database-dump",
        {
          type: "holidays",
          sub_type: "fm/lm",
        },
      );

      const reqId = response?.data?.req_id || "";
      setDumpRequestId(reqId);
      setShowDumpModal(true);
      enqueueSnackbar("Holiday dump request submitted successfully!", {
        variant: "success",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to request holiday dump.";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setDumpLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialTabRender.current) {
      isInitialTabRender.current = false;
      return;
    }

    setIsTabContentVisible(false);
    const timeoutId = setTimeout(() => {
      setIsTabContentVisible(true);
    }, 30);

    return () => clearTimeout(timeoutId);
  }, [activeTab]);

  const historyFetchConfig = useMemo(
    () => ({
      endpoint: "/__deku/api/v1/job/fetch",
      method: "post",
      buildPayload: (historyType) => ({
        type: "all",
        limit: historyType === "me" ? 5 : 10,
        offset: 0,
        cluster: "jiomart digital",
        ...(historyType === "me" && userEmail ? { user_email: userEmail } : {}),
      }),
      transformResponse: (response) =>
        normalizeJobHistory(response?.data?.data || []),
      onErrorMessage: "Failed to fetch history",
    }),
    [userEmail],
  );

  const historyColumns = useMemo(
    () => [
      {
        key: "jobTypeLabel",
        label: "Job Type",
      },
      {
        key: "status",
        label: "Status",
        type: "badge",
        badgeColors: {
          completed: "success",
          success: "success",
          failed: "error",
          error: "error",
          queued: "info",
          running: "info",
          pending: "warning",
        },
      },
      {
        key: "requestedBy",
        label: "Requested By",
      },
      {
        key: "createdAt",
        label: "Created At",
        accessor: (row) => formatHistoryTimestamp(row.createdAt),
      },
      {
        key: "fileUrl",
        label: "File",
        type: "download",
        downloadLabel: "File",
      },
      {
        key: "logUrl",
        label: "Logs",
        type: "download",
        downloadLabel: "Log",
      },
    ],
    [],
  );

  const renderUploadSection = (sectionKey) => {
    const isMoq = sectionKey === "moqRules";

    const handleSampleDownload = () => {
      if (isMoq) {
        const headers = [
          "S. No",
          "sku_group_id",
          "sku_code",
          "time_window_type",
          "time_window_unit",
          "time_window_value",
          "value",
        ];
        const rows = [
          ["1", "SKU_GROUP_001", "SKU123", "delivery", "days", "7", "10"],
        ];
        triggerCsvDownload("moq_rules_sample.csv", headers, rows);
        return;
      }

      const model = holidayFulfilmentModel || HOLIDAY_FULFILMENT_DEFAULT;
      const headers = ["holiday", model];
      const rows = [["2024-12-25", "data"]];
      triggerXlsxDownload("holiday_update_sample.xlsx", headers, rows);
    };

    return (
      <div className="space-y-5">
        {isMoq ? (
          <div className="flex justify-end">
            <div ref={moqMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setMoqActionsOpen((prev) => !prev)}
                className="] inline-flex h-10 w-4 cursor-pointer items-center justify-center text-lg font-semibold text-gray-700 transition-colors duration-200 hover:border-blue-500 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:border-gray-700 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                aria-haspopup="true"
                aria-expanded={moqActionsOpen}
                aria-label="Open MOQ actions"
              >
                ⋮
              </button>
              {moqActionsOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-md border border-gray-200 bg-white text-left shadow-lg dark:border-gray-700 dark:bg-[#111418]">
                  <button
                    type="button"
                    onClick={() => {
                      handleSampleDownload();
                      setMoqActionsOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-gray-200 dark:hover:bg-white/5"
                  >
                    <span>Download sample</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <div ref={holidayMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setHolidayActionsOpen((prev) => !prev)}
                className="inline-flex h-10 w-4 cursor-pointer items-center justify-center text-lg font-semibold text-gray-700 transition-colors duration-200 hover:border-blue-500 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:border-gray-700 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                aria-haspopup="true"
                aria-expanded={holidayActionsOpen}
                aria-label="Open Holiday actions"
              >
                ⋮
              </button>
              {holidayActionsOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-md border border-gray-200 bg-white text-left shadow-lg dark:border-gray-700 dark:bg-[#111418]">
                  <button
                    type="button"
                    onClick={() => {
                      handleSampleDownload();
                      setHolidayActionsOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-gray-200 dark:hover:bg-white/5"
                  >
                    <span>Download sample</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHolidayActionsOpen(false);
                      handleGetHolidayDump();
                    }}
                    disabled={dumpLoading}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-white/5"
                  >
                    <span>
                      {dumpLoading ? "Getting dump..." : "Get Holiday Dump"}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="vault-workspace-upload"
            className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center hover:border-blue-400 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-[#15171a]/60 dark:hover:border-blue-500"
          >
            <input
              id="vault-workspace-upload"
              ref={fileInputRef}
              type="file"
              accept={isMoq ? ".csv" : ".xlsx,.xls"}
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
              {uploadedFile
                ? "Replace uploaded file"
                : `Upload ${isMoq ? "CSV" : "XLSX"} file`}
            </span>
            <span className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {uploadedFile
                ? uploadedFile.name
                : `Click to browse or drag your ${isMoq ? "CSV" : "XLSX"} here`}
            </span>
            <span className="mt-3 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
              Supported format: {isMoq ? ".csv" : ".xlsx"}
            </span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex h-full flex-col gap-6 overflow-y-auto py-2">
        <div
          className={`space-y-6 transition-all duration-300 ease-in-out ${
            isTabContentVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-1 opacity-0"
          }`}
        >
          <div className="sticky -top-2 z-40 w-full bg-white/80 backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm dark:bg-[#0b0c0e]/80">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="overflow-hidden rounded-3xl border border-gray-300 dark:border-gray-700">
                  <div className="flex flex-col rounded sm:flex-row">
                    {resolvedTabs.map((tab, index) => {
                      const isActive = activeTab === tab.value;
                      const isLast = index === resolvedTabs.length - 1;
                      return (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => resetAllState(tab.value)}
                          aria-pressed={isActive}
                          className={`flex-1 cursor-pointer px-4 py-3 text-sm font-semibold tracking-wide uppercase transition-all duration-300 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 ${
                            isActive
                              ? "bg-black text-white shadow-inner"
                              : "bg-white text-gray-700 hover:bg-blue-50 dark:bg-[#15171a] dark:text-gray-200 dark:hover:bg-white/10"
                          } ${
                            !isLast
                              ? "border-b border-gray-300 sm:border-r sm:border-b-0 dark:border-gray-700"
                              : ""
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {activeTab === "moqRules" && renderUploadSection("moqRules")}
          {activeTab === "holidayUpdate" &&
            renderUploadSection("holidayUpdate")}
        </div>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Recent Requests
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              MOQ rules and holiday updates history (all tabs)
            </p>
          </div>
          <HistoryTable
            columns={historyColumns}
            fetchConfig={historyFetchConfig}
            refreshKey={historyRefreshKey}
            historyOptions={[
              { key: "all", label: "All History" },
              { key: "me", label: "My History" },
            ]}
            emptyLabel="No requests found yet."
            firstColumnWidthPercent={26}
          />
        </div>
      </div>

      <CustomModal
        open={previewOpen}
        onClose={handleClosePreview}
        size="lg"
        isDark={false}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-900">
              Preview uploaded File
            </h3>
            <p className="text-xs text-gray-500">
              {activeTab === "moqRules"
                ? "Review the CSV and submit when it looks good."
                : "Review the file and submit when it looks good."}
            </p>
          </div>

          {uploadedFile ? (
            activeTab === "holidayUpdate" ? (
              <XlsxPreviewTable
                file={uploadedFile}
                columnLabels={holidayPreviewColumns}
              />
            ) : (
              <CsvPreviewTable file={uploadedFile} />
            )
          ) : (
            <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">
              No file selected.
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClosePreview}
              className={BUTTON_SECONDARY}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!uploadedFile}
              className={BUTTON_ACCENT}
            >
              Submit file
            </button>
          </div>
        </div>
      </CustomModal>

      <CustomModal
        open={confirmationOpen}
        onClose={closeConfirmation}
        size="xs"
        isDark={false}
      >
        <div className="space-y-4 p-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900">Task created</h3>
          <p className="text-sm text-gray-600">
            Your submission has been queued successfully. You will receive an
            email once completed
          </p>
          {lastRequestId ? (
            <p className="text-xs text-gray-500">
              Request ID:{" "}
              <span className="font-mono text-sm font-semibold text-gray-900">
                {lastRequestId}
              </span>
            </p>
          ) : null}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={closeConfirmation}
              className={BUTTON_PRIMARY}
            >
              Close
            </button>
          </div>
        </div>
      </CustomModal>

      <CustomModal
        open={showDumpModal}
        onClose={closeDumpModal}
        size="xs"
        isDark={false}
      >
        <div className="space-y-4 p-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Holiday Dump Requested
          </h3>
          <p className="text-sm text-gray-600">
            Your holiday dump request has been submitted successfully. The dump
            will be sent to your email shortly.
          </p>
          {dumpRequestId ? (
            <p className="text-xs text-gray-500">
              Request ID:{" "}
              <span className="font-mono text-sm font-semibold text-gray-900">
                {dumpRequestId}
              </span>
            </p>
          ) : null}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={closeDumpModal}
              className={BUTTON_PRIMARY}
            >
              Close
            </button>
          </div>
        </div>
      </CustomModal>
    </>
  );
};

export default VaultWorkspace;
