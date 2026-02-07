import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import IOSToggle from "./IOSToggle";
import apiClient from "../api/client";
import { useRef } from "react";

const BADGE_TONES = {
  success:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  neutral: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const defaultHistoryOptions = [
  { key: "all", label: "All History" },
  { key: "me", label: "My History" },
];

/**
 * Reusable history table with built-in fetch/toggle/refresh controls.
 * Columns accept `type` of "text" (default), "badge", or "download".
 */
const HistoryTable = ({
  columns = [],
  fetchConfig,
  historyOptions = defaultHistoryOptions,
  refreshKey = 0,
  emptyLabel = "No history found",
  firstColumnWidthClass = "break-words whitespace-normal",
  firstColumnWidthPercent = 28,
  showInfoButton = false,
  rowsOverride,
  loadingOverride,
  onRefresh,
  activeHistoryType,
}) => {
  const [historyType, setHistoryType] = useState(
    historyOptions[0]?.key || "all",
  );
  const [rows, setRows] = useState(rowsOverride ?? []);
  const [loading, setLoading] = useState(false);
  const prevHistoryTypeRef = useRef(historyType);
  const prevRefreshKeyRef = useRef(refreshKey);
  const controlledRows = rowsOverride !== undefined;

  const {
    endpoint,
    method = "post",
    buildPayload,
    transformResponse,
    onErrorMessage = "Failed to fetch history",
  } = fetchConfig || {};

  const fetchRows = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    try {
      const payload =
        typeof buildPayload === "function"
          ? buildPayload(historyType)
          : undefined;
      const clientMethod = method.toLowerCase();

      const response =
        clientMethod === "get" || clientMethod === "delete"
          ? await apiClient[clientMethod](endpoint, {
              params: payload,
            })
          : await apiClient[clientMethod](endpoint, payload);

      const normalizedRows =
        typeof transformResponse === "function"
          ? transformResponse(response, historyType)
          : response?.data?.jobs || response?.data?.data || [];

      setRows(Array.isArray(normalizedRows) ? normalizedRows : []);
    } catch (error) {
      console.error(onErrorMessage, error);
      // keep UI quiet; caller can handle toast externally if needed
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    endpoint,
    method,
    buildPayload,
    transformResponse,
    historyType,
    onErrorMessage,
  ]);

  useEffect(() => {
    if (rowsOverride !== undefined) {
      setRows(rowsOverride);
    }
    if (loadingOverride !== undefined) {
      setLoading(Boolean(loadingOverride));
    }
  }, [rowsOverride, loadingOverride]);

  useEffect(() => {
    if (
      activeHistoryType &&
      historyOptions.some((opt) => opt.key === activeHistoryType) &&
      activeHistoryType !== historyType
    ) {
      setHistoryType(activeHistoryType);
    }
  }, [activeHistoryType, historyOptions, historyType]);

  useEffect(() => {
    const typeChanged = prevHistoryTypeRef.current !== historyType;
    const keyChanged = prevRefreshKeyRef.current !== refreshKey;

    if (!typeChanged && !keyChanged) return;

    prevHistoryTypeRef.current = historyType;
    prevRefreshKeyRef.current = refreshKey;

    // In controlled mode (rowsOverride provided), avoid automatic refresh loops.
    if (controlledRows) return;

    if (typeof onRefresh === "function") {
      onRefresh(historyType);
      return;
    }

    fetchRows();
  }, [historyType, refreshKey, controlledRows, onRefresh, fetchRows]);

  const effectiveLoading =
    loadingOverride !== undefined ? loadingOverride : loading;

  const badgeClass = useCallback((value, badgeColors = {}) => {
    const tone = badgeColors[value] || "neutral";
    return BADGE_TONES[tone] || BADGE_TONES.neutral;
  }, []);

  const columnWidths = useMemo(() => {
    const totalColumns = columns.length || 1;
    const utilityColumns = showInfoButton ? 1 : 0;
    const totalDataColumns = totalColumns + utilityColumns;

    const compactPercent = 8; // squeeze icon columns
    const first = Math.min(Math.max(firstColumnWidthPercent, 0), 100);
    const remaining = Math.max(
      0,
      100 - first - (showInfoButton ? compactPercent : 0),
    );

    const other =
      totalDataColumns > 1 ? remaining / (totalDataColumns - 1) : remaining;
    return {
      first: `${first}%`,
      other: `${other}%`,
      compact: `${compactPercent}%`,
    };
  }, [columns.length, firstColumnWidthPercent, showInfoButton]);

  const renderCell = useCallback(
    (row, column) => {
      const value = column.accessor ? column.accessor(row) : row?.[column.key];

      if (column.render) {
        return column.render(value, row);
      }

      switch (column.type) {
        case "badge": {
          if (!value && value !== 0) return "—";
          return (
            <span
              className={`inline-block rounded-md px-2 py-1 text-xs font-semibold capitalize ${badgeClass(value, column.badgeColors)}`}
            >
              {value}
            </span>
          );
        }
        case "download": {
          if (!value) return "—";
          return (
            <Tooltip title={column.downloadTitle || "Download"}>
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex cursor-pointer items-center justify-center text-gray-500 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
              >
                {column.downloadLabel ? (
                  <span className="text-xs font-semibold">
                    {column.downloadLabel}
                  </span>
                ) : (
                  <DownloadIcon fontSize="small" />
                )}
              </a>
            </Tooltip>
          );
        }
        case "info": {
          if (!value) return "—";
          return (
            <Tooltip title={value?.tooltip || value}>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-indigo-400"
              >
                ℹ️
              </button>
            </Tooltip>
          );
        }
        default:
          return value ?? "—";
      }
    },
    [badgeClass],
  );

  const handleToggle = () => {
    if (historyOptions.length < 2) return;
    const nextType =
      historyType === historyOptions[0].key
        ? historyOptions[1].key
        : historyOptions[0].key;
    setHistoryType(nextType);
    if (controlledRows && typeof onRefresh === "function") {
      onRefresh(nextType);
    }
  };

  const handleRefreshClick = () => {
    if (typeof onRefresh === "function") {
      onRefresh(historyType);
      return;
    }
    fetchRows();
  };

  return (
    <div className="dark:bg-primary-dark relative flex max-h-[30vh] flex-1 flex-col overflow-hidden rounded-lg border border-black/5 bg-white shadow-inner sm:max-h-[36vh] dark:border-white/10">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-3 py-1 dark:border-gray-800 dark:bg-black">
        <Tooltip title="Refresh history">
          <IconButton
            onClick={handleRefreshClick}
            disabled={effectiveLoading}
            size="small"
            className="!hover:text-gray-800 !dark:text-gray-200 !dark:hover:text-white !text-gray-600"
            sx={{
              animation: effectiveLoading ? "spin 1s linear infinite" : "none",
              "@keyframes spin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
              },
            }}
          >
            <AutorenewOutlinedIcon fontSize="medium" />
          </IconButton>
        </Tooltip>
        {historyOptions.length >= 2 && (
          <div className="flex items-center gap-3">
            <span
              className={`text-xs ${historyType === historyOptions[0].key ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500"}`}
            >
              {historyOptions[0].label}
            </span>
            <IOSToggle
              checked={historyType === historyOptions[1].key}
              onChange={handleToggle}
            />
            <span
              className={`text-xs ${historyType === historyOptions[1].key ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500"}`}
            >
              {historyOptions[1].label}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-2 sm:px-0">
        <table className="w-full min-w-[680px] table-fixed border-collapse text-left text-xs sm:text-sm">
          <thead className="sticky top-0 z-10 bg-gray-100 text-xs font-semibold tracking-wide text-gray-600 uppercase shadow-sm dark:bg-black dark:text-gray-300">
            <tr>
              {columns.map((column, idx) => {
                const isFirst = idx === 0;
                const isCompact =
                  column.type === "download" ||
                  column.type === "info" ||
                  column.compact;
                const width = isFirst
                  ? columnWidths.first
                  : isCompact
                    ? columnWidths.compact
                    : columnWidths.other;
                return (
                  <th
                    key={column.key}
                    className={`${column.headerClassName || ""} ${isFirst ? firstColumnWidthClass : ""} px-3 py-2 align-middle sm:px-6 sm:py-3`}
                    style={{ width }}
                  >
                    {column.label}
                  </th>
                );
              })}
              {showInfoButton && (
                <th
                  className="px-3 py-2 text-right align-middle sm:px-6 sm:py-3"
                  style={{ width: columnWidths.compact }}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {effectiveLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr
                  key={`history-skeleton-${index}`}
                  className="animate-pulse border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-transparent"
                >
                  {columns.map((column) => (
                    <td
                      key={`${column.key}-${index}`}
                      className={`${column.cellClassName || ""} px-3 py-2 align-middle sm:px-6 sm:py-3`}
                      style={{
                        width:
                          column.type === "download" ||
                          column.type === "info" ||
                          column.compact
                            ? columnWidths.compact
                            : columnWidths.other,
                      }}
                    >
                      <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                    </td>
                  ))}
                  {showInfoButton && (
                    <td
                      className="px-3 py-2 text-right align-middle sm:px-6 sm:py-3"
                      style={{ width: columnWidths.compact }}
                    >
                      <div className="h-6 w-8 rounded bg-gray-200 dark:bg-gray-800" />
                    </td>
                  )}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showInfoButton ? 1 : 0)}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="bg-white transition-colors hover:bg-indigo-50/70 dark:bg-transparent dark:hover:bg-white/5"
                >
                  {columns.map((column, idx) => {
                    const isFirst = idx === 0;
                    const isCompact =
                      column.type === "download" ||
                      column.type === "info" ||
                      column.compact;
                    const width = isFirst
                      ? columnWidths.first
                      : isCompact
                        ? columnWidths.compact
                        : columnWidths.other;
                    return (
                      <td
                        key={`${column.key}-${row.id || rowIndex}`}
                        className={`${column.cellClassName || ""} ${isFirst ? firstColumnWidthClass : ""} px-3 py-3 align-middle sm:px-6`}
                        style={{ width }}
                      >
                        {renderCell(row, column)}
                      </td>
                    );
                  })}
                  {showInfoButton && (
                    <td
                      className="px-3 py-3 text-right align-middle sm:px-6"
                      style={{ width: columnWidths.compact }}
                    >
                      <Tooltip title="More info">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-indigo-400"
                        >
                          ℹ️
                        </button>
                      </Tooltip>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryTable;
