import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IconButton, LinearProgress, Skeleton } from "@mui/material";

import {
  NavigateBefore,
  NavigateNext,
  FilterAltOutlined,
} from "@mui/icons-material";

/**
 * Lightweight paginated table inspired by TaskStatus.
 * Props:
 * - columns: [{ key, label, icon?, render?: (row) => ReactNode }]
 * - rows: data array
 * - rowsPerPageOptions: selectable page sizes
 * - defaultRowsPerPage: initial page size
 * - pageSize: controlled page size override
 * - onPageSizeChange: callback when user changes rows per page
 * - page: controlled page index (optional)
 * - onPageChange: callback when page changes
 * - isLoading: toggles skeleton rows
 * - emptyMessage: message when no data
 * - bodyHeight: scroll container height (css value, e.g. "calc(100vh - 260px)")
 */
const TmsTable = ({
  columns = [],
  rows = [],
  rowsPerPageOptions = [100, 300, 500, 1000],
  defaultRowsPerPage = 100,
  pageSize,
  onPageSizeChange,
  page: controlledPage,
  onPageChange,
  isLoading = false,
  emptyMessage = "No records found.",
  getRowId = (row, idx) => row?.id ?? idx,
  bodyHeight = "55vh",
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(
    pageSize ?? defaultRowsPerPage,
  );
  const [activeFilterKey, setActiveFilterKey] = useState(null);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [filters, setFilters] = useState({});
  const filterOverlayRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const mainContainerRef = useRef(null);

  useEffect(() => {
    if (pageSize != null && pageSize !== rowsPerPage) {
      setRowsPerPage(pageSize);
      setCurrentPage(0);
    }
  }, [pageSize, rowsPerPage]);

  const normalizeValue = useCallback((raw) => {
    if (raw == null) return "";
    if (typeof raw === "boolean") {
      return raw ? "Yes" : "No";
    }
    if (typeof raw === "string" || typeof raw === "number") {
      return String(raw);
    }
    if (typeof raw === "object") {
      if ("value" in raw) return String(raw.value);
      if ("label" in raw) return String(raw.label);
    }
    return "";
  }, []);

  const filteredRows = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(
      ([, value]) => value && String(value).trim() !== "",
    );
    if (!activeFilters.length) return rows;
    return rows.filter((row) =>
      activeFilters.every(([key, value]) => {
        const normalized = normalizeValue(row?.[key]);
        return normalized.toLowerCase().includes(String(value).toLowerCase());
      }),
    );
  }, [filters, normalizeValue, rows]);

  const columnUniqueValues = useMemo(() => {
    const map = {};
    columns.forEach((col) => {
      if (!col.isFilter) return;
      const values = new Set();
      rows.forEach((row) => {
        const normalized = normalizeValue(row?.[col.key]);
        if (!normalized) return;
        values.add(normalized);
      });
      map[col.key] = Array.from(values).sort((a, b) =>
        String(a).localeCompare(String(b)),
      );
    });
    return map;
  }, [columns, normalizeValue, rows]);

  const isControlled = controlledPage != null;
  const currentPage = isControlled ? controlledPage : page;
  const setCurrentPage = (nextPage) => {
    if (onPageChange) {
      onPageChange(nextPage);
    }
    if (!isControlled) {
      setPage(nextPage);
    }
  };

  const start = currentPage * rowsPerPage;
  const paginatedRows = filteredRows;

  const hasNextPage = paginatedRows.length === rowsPerPage;
  const totalPages = useMemo(() => {
    const base = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
    return hasNextPage
      ? Math.max(base, currentPage + 2)
      : Math.max(base, currentPage + 1);
  }, [filteredRows.length, rowsPerPage, hasNextPage, currentPage]);

  useEffect(() => {
    if (!isControlled) {
      setPage((prev) => Math.min(prev, totalPages - 1));
    }
  }, [isControlled, totalPages]);

  const onRowsPerPageChange = (option) => {
    const raw =
      option && typeof option === "object" && "target" in option
        ? option.target.value
        : (option?.value ?? option);
    const value = parseInt(raw, 10);
    if (!Number.isNaN(value)) {
      if (onPageSizeChange) {
        onPageSizeChange(value);
      } else {
        setRowsPerPage(value);
        setCurrentPage(0);
      }
    }
  };

  const toggleFilterForColumn = (key, event) => {
    if (!key) return;
    if (activeFilterKey === key) {
      setActiveFilterKey(null);
      setFilterAnchor(null);
      return;
    }
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const containerRect = mainContainerRef.current?.getBoundingClientRect?.();
    if (rect && containerRect) {
      setFilterAnchor({
        top: rect.bottom - containerRect.top + 6,
        left: rect.left - containerRect.left,
        width: rect.width + 60,
      });
    } else if (rect) {
      setFilterAnchor({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width + 60,
      });
    }
    setActiveFilterKey(key);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(0);
  };

  const filterOverlay =
    activeFilterKey && filterAnchor
      ? (() => {
          const options = columnUniqueValues[activeFilterKey] || [];
          return (
            <div
              ref={filterOverlayRef}
              className="absolute z-50 rounded-md border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#0f0f0f]"
              style={{
                top: filterAnchor.top,
                left: filterAnchor.left,
                minWidth: Math.min(filterAnchor.width, 220),
                maxWidth: 220,
              }}
            >
              <div className="max-h-56 overflow-y-auto p-2 text-xs text-gray-800 dark:text-gray-100">
                <button
                  type="button"
                  className="w-full cursor-pointer rounded px-2 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-white/10"
                  onClick={() => {
                    handleFilterChange(activeFilterKey, "");
                    setActiveFilterKey(null);
                    setFilterAnchor(null);
                  }}
                >
                  Show all
                </button>
                {options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className="w-full cursor-pointer rounded px-2 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-white/10"
                    onClick={() => {
                      handleFilterChange(activeFilterKey, opt);
                      setActiveFilterKey(null);
                      setFilterAnchor(null);
                    }}
                  >
                    {opt}
                  </button>
                ))}
                {!options.length && (
                  <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                    No values
                  </div>
                )}
              </div>
            </div>
          );
        })()
      : null;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!filterAnchor) return;
      if (filterOverlayRef.current?.contains(e.target)) return;
      setActiveFilterKey(null);
      setFilterAnchor(null);
    };
    const handleResize = () => {
      setActiveFilterKey(null);
      setFilterAnchor(null);
    };
    if (activeFilterKey) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", handleResize);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, [activeFilterKey, filterAnchor]);

  return (
    <div
      ref={mainContainerRef}
      className="relative flex h-full w-full flex-col"
    >
      {filterOverlay}
      <div className="w-full overflow-hidden rounded-md text-gray-900 shadow ring-purple-100 dark:text-gray-100">
        {isLoading && (
          <LinearProgress
            color="inherit"
            sx={{
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#7e22ce",
              },
              backgroundColor: "rgba(126, 34, 206, 0.2)",
            }}
          />
        )}

        <div
          ref={tableWrapperRef}
          className="relative overflow-x-auto overflow-y-auto"
          style={{ height: bodyHeight, maxHeight: bodyHeight }}
        >
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead className="dark:bg-primary-dark sticky top-0 z-10 bg-gray-100">
              <tr>
                {columns.map((col) => {
                  const hasFilter = Boolean(filters[col.key]);
                  const isActive = activeFilterKey === col.key;
                  const filterable = Boolean(col.isFilter);
                  return (
                    <th
                      key={col.key}
                      className="border-b border-gray-200 px-4 py-2.5 text-left font-semibold whitespace-nowrap dark:border-white/10 dark:text-white/90"
                    >
                      <div className="flex items-center gap-2">
                        {col.icon ? (
                          <span className="text-gray-500 dark:text-gray-300">
                            {col.icon}
                          </span>
                        ) : null}
                        <span>{col.label}</span>
                        {filterable && (
                          <IconButton
                            size="small"
                            onClick={(e) => toggleFilterForColumn(col.key, e)}
                            className="ml-auto !p-0.5 text-gray-500 hover:text-gray-800 dark:text-gray-300"
                          >
                            <FilterAltOutlined
                              fontSize="inherit"
                              className={`${
                                hasFilter
                                  ? "text-purple-600 dark:text-purple-400"
                                  : ""
                              } ${isActive ? "opacity-100" : "opacity-80"} ml-auto !p-0.5 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white`}
                            />
                          </IconButton>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <>
                  {Array.from({ length: rowsPerPage }).map((_, i) => (
                    <tr
                      key={`sk-${i}`}
                      className={
                        i % 2 === 0
                          ? "dark:bg-secondary-dark/70 bg-gray-50"
                          : "dark:bg-secondary-dark bg-white"
                      }
                    >
                      {columns.map((col, j) => (
                        <td
                          key={`sk-${i}-${col.key}-${j}`}
                          className="border-b border-gray-200 px-4 py-2.5 dark:border-white/10"
                        >
                          <Skeleton variant="text" height={24} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : (
                <>
                  {paginatedRows.map((row, idx) => {
                    const zebra =
                      (start + idx) % 2 === 0
                        ? "bg-gray-50 dark:bg-secondary-dark/70"
                        : "bg-white dark:bg-secondary-dark";

                    return (
                      <tr key={getRowId(row, idx)} className={zebra}>
                        {columns.map((col) => (
                          <td
                            key={`${getRowId(row, idx)}-${col.key}`}
                            className="border-b border-gray-200 px-4 py-2.5 text-xs dark:border-white/10"
                          >
                            {col.render
                              ? col.render(row)
                              : (row[col.key] ?? "-")}
                          </td>
                        ))}
                      </tr>
                    );
                  })}

                  {!paginatedRows.length && (
                    <tr>
                      <td
                        colSpan={columns.length || 1}
                        className="px-4 py-10 text-center text-gray-600 dark:text-gray-300"
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-gray-200 px-3 py-2 text-xs dark:border-white/10">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <label htmlFor="rows-per-page" className="text-xs font-semibold">
            Rows per page
          </label>
          <select
            id="rows-per-page"
            value={rowsPerPage}
            onChange={onRowsPerPageChange}
            className="h-8 min-w-[64px] rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-[#1f1f1f] dark:text-white"
          >
            {rowsPerPageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
          <span className="text-xs sm:text-xs">
            {filteredRows.length > 0
              ? `${start + 1}–${Math.min(
                  start + rowsPerPage,
                  start + paginatedRows.length,
                )}`
              : "0 of 0"}
          </span>

          <div className="flex items-center gap-2">
            <IconButton
              aria-label="Previous page"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              size="small"
              color="inherit"
              className="border border-gray-300 disabled:opacity-50 dark:border-white/10"
            >
              <NavigateBefore fontSize="small" />
            </IconButton>
            <div className="min-w-14 text-center text-gray-600 dark:text-gray-300">
              {currentPage + 1} / {totalPages}
            </div>
            <IconButton
              aria-label="Next page"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!hasNextPage}
              size="small"
              color="inherit"
              className="border border-gray-300 disabled:opacity-50 dark:border-white/10"
            >
              <NavigateNext fontSize="small" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TmsTable;
