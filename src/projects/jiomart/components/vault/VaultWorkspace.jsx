import React, { useEffect, useMemo, useRef, useState } from "react";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Tooltip from "@mui/material/Tooltip";
import CustomModal from "../../../../components/CustomModal";
import CsvPreviewTable from "../../../../components/CsvPreviewTable";
import { VERTICAL_OPTIONS } from "../../../../constants/verticals";
import VerifyPromisePanel from "./VerifyPromisePanel";
import apiClient from "../../../../api/client";
import { useSnackbar } from "notistack";
import CustomDropdown from "../../../../components/CustomDropdown";
import IOSToggle from "../../../../components/IOSToggle";
import HistoryTable from "../../../../components/HistoryTable";
import FyndHistoryActions from "./FyndHistoryActions";
import TaskCreatedModal from "./TaskCreatedModal";

const TABS = [
  { value: "verifyPromise", label: "Verify Promise" },
  { value: "fyndDump", label: "Fynd Dump" },
  { value: "moqRules", label: "MOQ Rules" },
  { value: "holidayUpdate", label: "Holiday Update" },
];

const TAB_LOOKUP = new Map(TABS.map((tab) => [tab.value, tab]));

const FYND_FLOW_OPTIONS = [
  { value: "network", label: "Network dump" },
  { value: "rvsl", label: "RVSL" },
  { value: "serviceability", label: "1P" },
  { value: "store", label: "Store" },
];

const RVSL_OPTIONS = [
  { value: "store", label: "Store" },
  { value: "pincode", label: "Pincode" },
];

const SERVICEABILITY = [
  { value: "store", label: "Store" },
  { value: "pincode", label: "Pincode" },
];

const STORE_FLOW_OPTIONS = [
  { value: "1p", label: "1P Groceries" },
  { value: "3p", label: "3P" },
  { value: "fnl/rfc", label: "1P FnL/RFC" },
];

const HOLIDAY_FULFILMENT_OPTIONS = ["FM", "LM"];

const BUTTON_PRIMARY =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_SECONDARY =
  "inline-flex h-10 items-center cursor-pointer justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 hover:border-blue-500 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#15171a] dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-300";

const BUTTON_ACCENT =
  "inline-flex h-10 items-cente cursor-pointer justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

const FYND_DUMP_HISTORY_ENDPOINT =
  "/__deku/api/v1/__jiomart/fetch/dump-requests";

const HISTORY_SECTIONS = [
  {
    key: "fyndDump",
    title: "Fynd dump",
    endpoint: FYND_DUMP_HISTORY_ENDPOINT,
  },
  {
    key: "moqRules",
    title: "MOQ rules",
    endpoint: "/__deku/api/v1/vault/moq-rules/history",
  },
  {
    key: "verifyPromise",
    title: "Verify promise",
  },
];

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

const VaultWorkspace = ({ onOpenDeliveryPartners, enabledTabs }) => {
  const resolvedTabs = useMemo(() => {
    if (!enabledTabs || enabledTabs.length === 0) {
      return TABS;
    }
    return enabledTabs.map((value) => TAB_LOOKUP.get(value)).filter(Boolean);
  }, [enabledTabs]);

  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(
    () => resolvedTabs[0]?.value ?? TABS[0].value,
  );
  const [selectedFlow, setSelectedFlow] = useState("");
  const [selectedNetworkVertical, setSelectedNetworkVertical] = useState("");
  const [selectedRvslOption, setSelectedRvslOption] = useState("");
  const [selectedOnePOption, setSelectedOnePOption] = useState("");
  const [selectedStoreOption, setSelectedStoreOption] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [moqVertical, setMoqVertical] = useState("");
  const [holidayFulfilmentModel, setHolidayFulfilmentModel] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [dumpTaskLoading, setDumpTaskLoading] = useState(false);
  const [dumpTaskError, setDumpTaskError] = useState("");
  const [lastRequestId, setLastRequestId] = useState("");
  const [downloadStates, setDownloadStates] = useState({});
  const [downloadError, setDownloadError] = useState("");
  const [activeDumpFlow, setActiveDumpFlow] = useState("");
  const [fyndHistoryFilter, setFyndHistoryFilter] = useState("all");
  const fileInputRef = useRef(null);
  const [isTabContentVisible, setIsTabContentVisible] = useState(true);
  const isInitialTabRender = useRef(true);
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

  const fetchHistory = async (sectionKey, overrideFilter) => {
    const section = HISTORY_SECTION_MAP.get(sectionKey);
    if (!section?.endpoint) return;

    const normalizedFilter =
      sectionKey === "fyndDump"
        ? (overrideFilter || fyndHistoryFilter || "all").toLowerCase()
        : "";

    const filterType =
      normalizedFilter === "me" || normalizedFilter === "all"
        ? normalizedFilter
        : "all";

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
      const response =
        sectionKey === "fyndDump"
          ? await apiClient.post(section.endpoint, { type: filterType })
          : await apiClient.get(section.endpoint);
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

      if (sectionKey === "fyndDump") {
        setDownloadStates({});
        setDownloadError("");
      }
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

      if (sectionKey === "fyndDump") {
        setDownloadStates({});
        setDownloadError("");
      }
    }
  };

  const renderHistoryPanel = (sectionKey) => {
    const section = HISTORY_SECTION_MAP.get(sectionKey);
    if (!section || !section.endpoint) return null;
    const state = historyState[sectionKey] ?? { ...DEFAULT_HISTORY_STATE };
    const isFyndHistory = sectionKey === "fyndDump";

    const columns = isFyndHistory
      ? [
          { key: "requestedBy", label: "Requested By" },
          { key: "dumpType", label: "Dump Type" },
          {
            key: "createdAt",
            label: "Created At",
            render: (value) => formatHistoryTimestamp(value),
          },
          {
            key: "fileAddress",
            label: "Download",
            compact: true,
            render: (_, row) => {
              const entryId = ensureHistoryString(row?.id);
              const downloading = Boolean(downloadStates?.[entryId]);
              const hasFileAddress =
                Boolean(row?.fileAddress) || Boolean(row?.file_address);
              const disabled = !hasFileAddress || downloading;

              return (
                <button
                  type="button"
                  onClick={
                    disabled ? undefined : () => handleHistoryDownload(row)
                  }
                  disabled={disabled}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                  aria-label="Download dump file"
                >
                  {downloading ? (
                    <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <DownloadOutlinedIcon fontSize="small" />
                  )}
                </button>
              );
            },
          },
          {
            key: "id",
            label: "Info",
            compact: true,
            render: (value) => (
              <Tooltip title={value || "Request ID"}>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
                  aria-label="View request identifier"
                >
                  <InfoOutlinedIcon fontSize="small" />
                </button>
              </Tooltip>
            ),
          },
        ]
      : [
          { key: "fileName", label: "File name" },
          { key: "user", label: "Uploaded by" },
          {
            key: "timestamp",
            label: "Uploaded at",
            render: (value) => formatHistoryTimestamp(value),
          },
        ];

    return (
      <div className="space-y-2">
        <HistoryTable
          columns={columns}
          rowsOverride={state.entries}
          loadingOverride={state.loading}
          historyOptions={
            isFyndHistory
              ? [
                  { key: "all", label: "All requests" },
                  { key: "me", label: "My requests" },
                ]
              : []
          }
          firstColumnWidthPercent={isFyndHistory ? 34 : 40}
          onRefresh={(type) => {
            if (isFyndHistory && type) {
              setFyndHistoryFilter(type);
              fetchHistory(sectionKey, type);
            } else {
              fetchHistory(sectionKey, undefined);
            }
          }}
          activeHistoryType={isFyndHistory ? fyndHistoryFilter : undefined}
          refreshKey={`${sectionKey}-${fyndHistoryFilter}`}
          emptyLabel="No history available yet."
        />
        {isFyndHistory && downloadError ? (
          <div className="border-t border-gray-200 px-4 py-2 text-xs text-amber-600 dark:border-gray-700 dark:text-amber-300">
            {downloadError}
          </div>
        ) : null}
        {state.error ? (
          <div className="border-t border-gray-200 px-4 py-2 text-xs text-red-600 dark:border-gray-700 dark:text-red-300">
            {state.error}
          </div>
        ) : null}
      </div>
    );
  };

  const verticalLabelMap = useMemo(() => {
    const map = new Map();
    VERTICAL_OPTIONS.forEach((option) => {
      map.set(option.value, option.label);
    });
    return map;
  }, []);

  const resetUploadState = () => {
    setUploadedFile(null);
    setHasVerified(false);
    setMoqVertical("");
    setHolidayFulfilmentModel("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetAllState = (nextTab) => {
    if (nextTab) setActiveTab(nextTab);
    setSelectedFlow("");
    setSelectedNetworkVertical("");
    setSelectedRvslOption("");
    setSelectedOnePOption("");
    setSelectedStoreOption("");
    resetUploadState();
  };

  useEffect(() => {
    if (!resolvedTabs.length) return;
    const tabExists = resolvedTabs.some((tab) => tab.value === activeTab);
    if (!tabExists) {
      const fallbackTab = resolvedTabs[0]?.value;
      if (fallbackTab) {
        resetAllState(fallbackTab);
      }
    }
  }, [resolvedTabs, activeTab]);

  const normalizeDumpSubType = (value) => {
    if (value && typeof value === "object") {
      if ("value" in value)
        return ensureHistoryString(value.value).toUpperCase();
      if ("label" in value)
        return ensureHistoryString(value.label).toUpperCase();
    }
    return ensureHistoryString(value).toUpperCase();
  };

  const getDumpTaskPayload = () => {
    if (selectedFlow === "network") {
      if (!selectedNetworkVertical) return null;
      return {
        type: "network",
        sub_type: normalizeDumpSubType(selectedNetworkVertical),
      };
    }

    if (selectedFlow === "rvsl") {
      if (!selectedRvslOption) return null;
      return {
        type: "rvsl",
        sub_type: normalizeDumpSubType(selectedRvslOption),
      };
    }

    if (selectedFlow === "serviceability") {
      if (!selectedOnePOption) return null;
      return {
        type: "serviceability",
        sub_type: normalizeDumpSubType(selectedOnePOption),
      };
    }

    if (selectedFlow === "store") {
      if (!selectedStoreOption) return null;
      return {
        type: "store",
        sub_type: normalizeDumpSubType(selectedStoreOption),
      };
    }

    return null;
  };

  const handleCreateDumpTask = async () => {
    const payload = getDumpTaskPayload();
    if (!payload) return;

    setActiveDumpFlow(selectedFlow);
    setDumpTaskLoading(true);
    setDumpTaskError("");

    try {
      const response = await apiClient.post(
        "/__deku/api/v1/__jiomart/extract/database-dump",
        payload,
      );

      const requestId = ensureHistoryString(response?.data?.req_id);
      setLastRequestId(requestId);
      setConfirmationOpen(true);
      enqueueSnackbar(
        requestId
          ? `Dump task created successfully (Request ID: ${requestId})`
          : "Dump task created successfully.",
        { variant: "success" },
      );
      fetchHistory("fyndDump", fyndHistoryFilter);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create dump task.";
      setDumpTaskError(message);
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setActiveDumpFlow("");
      setDumpTaskLoading(false);
    }
  };

  const handleHistoryDownload = async (entry) => {
    const entryId = ensureHistoryString(entry?.id);
    const fileAddress = ensureHistoryString(
      entry?.fileAddress || entry?.file_address,
    );

    if (!fileAddress) {
      setDownloadError("File address not available.");
      return;
    }

    setDownloadError("");
    setDownloadStates((prev) => ({ ...prev, [entryId]: true }));

    try {
      const anchor = document.createElement("a");
      anchor.href = fileAddress;
      anchor.target = "_blank";
      anchor.download = fileAddress.split("/").pop() || `dump-${entryId}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to download file.";
      setDownloadError(message);
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setDownloadStates((prev) => {
        const next = { ...prev };
        delete next[entryId];
        return next;
      });
    }
  };

  useEffect(() => {
    const section = HISTORY_SECTION_MAP.get(activeTab);
    if (!section?.endpoint || activeTab === "fyndDump") return;
    if (!activeHistoryState?.hasFetched && !activeHistoryState?.loading) {
      fetchHistory(activeTab);
    }
  }, [activeTab, activeHistoryState?.hasFetched, activeHistoryState?.loading]);

  useEffect(() => {
    if (activeTab !== "fyndDump") return;
    fetchHistory("fyndDump", fyndHistoryFilter);
  }, [activeTab, fyndHistoryFilter]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setHasVerified(false);
  };

  const handleVerify = () => {
    if (!uploadedFile) return;
    setPreviewOpen(true);
  };

  const handleVerified = () => {
    setHasVerified(true);
    setPreviewOpen(false);
  };

  const handleSubmit = () => {
    setConfirmationOpen(true);
    resetUploadState();
  };

  const closeConfirmation = () => {
    setConfirmationOpen(false);
    setLastRequestId("");
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

  useEffect(() => {
    if (selectedFlow !== "network") {
      setSelectedNetworkVertical("");
    }
    if (selectedFlow !== "rvsl") {
      setSelectedRvslOption("");
    }
    if (selectedFlow !== "serviceability") {
      setSelectedOnePOption("");
    }
    if (selectedFlow !== "store") {
      setSelectedStoreOption("");
    }
    if (selectedFlow !== "holidayUpdate") {
      setHolidayFulfilmentModel("");
    }
    setHasVerified(false);
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [selectedFlow]);

  const handleSampleDownload = () => {
    let headers = [];
    if (activeTab === "moqRules") {
      headers = ["store_code", "product_id", "moq", "inventory"];
    } else if (activeTab === "holidayUpdate") {
      headers = ["store_code", "holiday_date", "fulfilment_model"];
    }
    triggerCsvDownload(
      `${activeTab}-sample.csv`,
      headers,
      headers.length ? [headers.map(() => "")] : [],
    );
  };

  const renderFyndFlowContent = () => {
    const showSelectedLabel = Boolean(selectedFlow);
    const labelText =
      selectedFlow === "network"
        ? "Select a vertical"
        : selectedFlow === "rvsl"
          ? "Select RVSL sub-type"
          : selectedFlow === "serviceability"
            ? "Select 1P sub-type"
            : "Select store type";

    const flowOptions = (() => {
      switch (selectedFlow) {
        case "network":
          return [
            { value: "fashin", label: "Fashion" },
            { value: "groc", label: "Groceries" },
            { value: "elec", label: "Electronics" },
          ];
        case "rvsl":
          return RVSL_OPTIONS;
        case "serviceability":
          return SERVICEABILITY;
        case "store":
          return STORE_FLOW_OPTIONS;
        default:
          return [];
      }
    })();

    const activeValue =
      selectedFlow === "network"
        ? selectedNetworkVertical
        : selectedFlow === "rvsl"
          ? selectedRvslOption
          : selectedFlow === "serviceability"
            ? selectedOnePOption
            : selectedStoreOption;

    const onSelect = (value) => {
      if (selectedFlow === "network") setSelectedNetworkVertical(value);
      if (selectedFlow === "rvsl") setSelectedRvslOption(value);
      if (selectedFlow === "serviceability") setSelectedOnePOption(value);
      if (selectedFlow === "store") setSelectedStoreOption(value);
    };

    return (
      <div className="flex items-end justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-[#0d0f13]">
        {showSelectedLabel ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {labelText}
            </p>
            {selectedFlow === "network" ? (
              <div className="w-full sm:w-72">
                <CustomDropdown
                  value={selectedNetworkVertical}
                  onChange={(value) => {
                    const nextValue =
                      (value && typeof value === "object"
                        ? value.value
                        : value) || "";
                    setSelectedNetworkVertical(nextValue);
                    setHasVerified(false);
                  }}
                  options={VERTICAL_OPTIONS}
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {flowOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSelect(option.value)}
                    className={`inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                      activeValue === option.value
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                        : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-[#15171a] dark:text-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateDumpTask}
            disabled={!selectedFlow || !activeValue || dumpTaskLoading}
            className={`${BUTTON_PRIMARY} gap-2`}
          >
            {dumpTaskLoading && activeDumpFlow === selectedFlow ? (
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            {dumpTaskLoading && activeDumpFlow === selectedFlow
              ? "Creating..."
              : "Create dump task"}
          </button>

          {dumpTaskError ? (
            <span className="text-sm text-red-600 dark:text-red-400">
              {dumpTaskError}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const getUploadSectionConfig = (sectionKey) => {
    if (sectionKey === "moqRules") {
      return {
        title: "MOQ rules upload",
        description: "Upload a CSV file containing MOQ rules.",
        showVertical: true,
      };
    }
    if (sectionKey === "holidayUpdate") {
      return {
        title: "Holiday update upload",
        description: "Upload a CSV file containing holiday updates.",
        showHoliday: true,
      };
    }
    return null;
  };

  const renderUploadSection = (sectionKey) => {
    const config = getUploadSectionConfig(sectionKey);
    if (!config) return null;
    const section = HISTORY_SECTION_MAP.get(sectionKey);
    const sectionTitle = section?.title || "Upload";
    const activeHistoryState = historyState[sectionKey] ?? {
      ...DEFAULT_HISTORY_STATE,
    };

    const sampleSelectionMissing =
      (sectionKey === "moqRules" && !moqVertical) ||
      (sectionKey === "holidayUpdate" && !holidayFulfilmentModel);
    const verifyDisabled = !uploadedFile || hasVerified;

    const handleDownload = async () => {
      const payload = new FormData();
      payload.append("file", uploadedFile);
      if (sectionKey === "moqRules") {
        payload.append("vertical", moqVertical);
      } else if (sectionKey === "holidayUpdate") {
        payload.append("fulfilment_model", holidayFulfilmentModel);
      }

      try {
        await apiClient.post(
          sectionKey === "moqRules"
            ? "/__deku/api/v1/vault/moq-rules/upload"
            : "/__deku/api/v1/__jiomart/holiday-upload",
          payload,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        enqueueSnackbar(`${sectionTitle} submitted successfully`, {
          variant: "success",
        });
        fetchHistory(sectionKey);
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          `Failed to submit ${sectionTitle.toLowerCase()}.`;
        enqueueSnackbar(message, { variant: "error" });
      }
    };

    return (
      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-[#0d0f13]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <InfoOutlinedIcon className="text-blue-500" fontSize="small" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {sectionTitle}
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {config.description}
          </p>
        </div>

        <div className="space-y-4">
          {config.showVertical ? (
            <CustomDropdown
              label="Select vertical"
              value={moqVertical}
              onChange={(value) => {
                setMoqVertical(value);
                setHasVerified(false);
              }}
              options={VERTICAL_OPTIONS}
            />
          ) : null}

          {config.showHoliday ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Select the fulfilment model
              </p>
              <div className="flex flex-wrap gap-3">
                {HOLIDAY_FULFILMENT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setHolidayFulfilmentModel(option);
                      setHasVerified(false);
                    }}
                    className={`inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                      holidayFulfilmentModel === option
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                        : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-[#15171a] dark:text-gray-200"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSampleDownload}
                  disabled={sampleSelectionMissing}
                  className={BUTTON_SECONDARY}
                >
                  Download sample
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Download sample
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSampleDownload}
                  className={BUTTON_SECONDARY}
                >
                  Download sample
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800 dark:text-gray-100">
              Upload CSV file
            </label>
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="text-sm text-gray-600 focus:outline-none dark:text-gray-300"
              />
              {uploadedFile ? (
                <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-200">
                  Selected: {uploadedFile.name}
                </div>
              ) : null}
            </div>
            {sectionKey === "moqRules" && moqVertical ? (
              <p className="text-xs text-gray-500">
                Selected vertical: {verticalLabelMap.get(moqVertical) || "-"}
              </p>
            ) : null}
            {sectionKey === "holidayUpdate" && holidayFulfilmentModel ? (
              <p className="text-xs text-gray-500">
                Selected fulfilment model: {holidayFulfilmentModel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifyDisabled}
            className={BUTTON_PRIMARY}
          >
            Verify file
          </button>
          {hasVerified && (
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              File verified. You can submit now.
            </span>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasVerified}
            className={BUTTON_ACCENT}
          >
            Submit
          </button>
        </div>

        {renderHistoryPanel(sectionKey)}
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
              <div className="flex w-full justify-end lg:w-auto">
                <button
                  type="button"
                  onClick={onOpenDeliveryPartners}
                  disabled={!onOpenDeliveryPartners}
                  className={`${BUTTON_SECONDARY} w-full gap-2 sm:w-auto`}
                >
                  <LocalShippingOutlinedIcon fontSize="small" />
                  Delivery Partners
                </button>
              </div>
            </div>
          </div>

          {activeTab === "fyndDump" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  Select Flow
                </p>
                <div className="flex flex-wrap gap-3">
                  {FYND_FLOW_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedFlow(option.value)}
                      className={`inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                        selectedFlow === option.value
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                          : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-[#15171a] dark:text-gray-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {renderFyndFlowContent()}

              {renderHistoryPanel("fyndDump")}
            </div>
          )}

          {activeTab === "moqRules" && renderUploadSection("moqRules")}
          {activeTab === "holidayUpdate" &&
            renderUploadSection("holidayUpdate")}
          {activeTab === "verifyPromise" && (
            <VerifyPromisePanel
              onOpenDeliveryPartners={onOpenDeliveryPartners}
            />
          )}
        </div>
      </div>

      <CustomModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size="lg"
        isDark={false}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-900">
              Preview uploaded CSV
            </h3>
            <p className="text-xs text-gray-500">
              Review the contents below and confirm once you have verified the
              details.
            </p>
          </div>

          {uploadedFile ? (
            <CsvPreviewTable file={uploadedFile} />
          ) : (
            <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">
              No file selected.
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className={BUTTON_SECONDARY}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleVerified}
              disabled={!uploadedFile}
              className={BUTTON_ACCENT}
            >
              I have verified the file, proceed
            </button>
          </div>
        </div>
      </CustomModal>

      <TaskCreatedModal
        open={confirmationOpen}
        onClose={closeConfirmation}
        requestId={lastRequestId}
        primaryActionLabel="Close"
      />
    </>
  );
};

export default VaultWorkspace;
