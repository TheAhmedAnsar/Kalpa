import React, { useEffect, useMemo, useState, useCallback } from "react";
import Papa from "papaparse";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  TableContainer,
  Box,
  Skeleton,
} from "@mui/material";

const PREVIEW_LIMIT = 5000;
const SNO_COL_WIDTH = 84;
const COL_MIN_WIDTH = 160;

// heights so we can pin both rows cleanly
const TITLE_ROW_HEIGHT = 44; // px
const FILTER_ROW_HEIGHT = 44; // px

// Virtual scrolling configuration
const ROW_HEIGHT = 40; // Approximate height of each row
const BUFFER_SIZE = 10; // Number of rows to render outside visible area

const CsvPreviewTable = ({ file, columnLabels = [], hideFirstRow = true }) => {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [parseError, setParseError] = useState("");
  const [loading, setLoading] = useState(false);

  // Virtual scrolling state
  const [scrollTop, setScrollTop] = useState(0);

  const normalizedColumnLabels = useMemo(
    () =>
      (columnLabels ?? []).map((label) =>
        label == null ? "" : String(label).trim(),
      ),
    [columnLabels],
  );

  const normalizedLabelsKey = useMemo(
    () => JSON.stringify(normalizedColumnLabels),
    [normalizedColumnLabels],
  );

  const providedLabelCount = normalizedColumnLabels.length;
  const hasProvidedLabels = providedLabelCount > 0;

  useEffect(() => {
    if (!file) return;

    // reset
    setHeaders([]);
    setRows([]);
    setFilters({});
    setParseError("");
    setLoading(true);

    const reader = new FileReader();

    reader.onload = (ev) => {
      const csvText = ev.target.result ?? "";

      const onComplete = (result) => {
        try {
          const rawRows = Array.isArray(result.data) ? result.data : [];
          const trimmedRows = rawRows.map((row) =>
            Array.isArray(row)
              ? row.map((cell) => (cell == null ? "" : String(cell).trim()))
              : [],
          );

          let providedLabels = [];
          if (normalizedLabelsKey) {
            try {
              const parsed = JSON.parse(normalizedLabelsKey);
              providedLabels = Array.isArray(parsed) ? parsed : [];
            } catch {
              providedLabels = [];
            }
          }

          let workingHeaders = [];
          let dataRows = trimmedRows;

          const maxRowLength = trimmedRows.reduce(
            (max, row) => Math.max(max, Array.isArray(row) ? row.length : 0),
            0,
          );

          if (providedLabels.length > 0) {
            workingHeaders = [...providedLabels];
            if (trimmedRows.length > 0) {
              const firstRow = trimmedRows[0];
              const matchesProvided =
                firstRow.length === providedLabels.length &&
                firstRow.every((cell, idx) => {
                  const provided = providedLabels[idx];
                  return (
                    typeof provided === "string" &&
                    cell.toLowerCase() === provided.toLowerCase()
                  );
                });
              dataRows =
                matchesProvided && hideFirstRow
                  ? trimmedRows.slice(1)
                  : trimmedRows;
            }
          } else if (trimmedRows.length > 0) {
            if (hideFirstRow) {
              workingHeaders = [...trimmedRows[0]];
              dataRows = trimmedRows.slice(1);
            } else {
              // don't treat the first row as header; create generic headers based on max row length
              const columnCountGuess =
                maxRowLength || (trimmedRows[0] ? trimmedRows[0].length : 0);
              workingHeaders = Array.from(
                { length: columnCountGuess },
                (_, i) => `Column ${i + 1}`,
              );
              dataRows = trimmedRows;
            }
          }

          let columnCount = Math.max(workingHeaders.length, maxRowLength);
          if (columnCount === 0 && trimmedRows.length > 0) {
            columnCount = trimmedRows[0].length;
          }
          if (columnCount === 0 && providedLabels.length > 0) {
            columnCount = providedLabels.length;
          }

          if (columnCount > 0) {
            workingHeaders = Array.from({ length: columnCount }, (_, idx) => {
              const existing = workingHeaders[idx];
              const normalized =
                existing == null ? "" : String(existing).trim();
              return normalized !== "" ? normalized : `Column ${idx + 1}`;
            });
          }

          const normalized = dataRows.slice(0, PREVIEW_LIMIT).map((row) => {
            const arr = Array.isArray(row) ? row : [];
            const out = {};
            for (let i = 0; i < columnCount; i++) {
              const key = workingHeaders[i] ?? `Column ${i + 1}`;
              const cell = arr[i];
              out[key] = cell == null ? "" : String(cell).trim();
            }
            return out;
          });

          setHeaders(workingHeaders);
          setRows(normalized);
          const init = {};
          workingHeaders.forEach((h) => (init[h] = ""));
          setFilters(init);

          // slight delay so skeleton doesn't flicker for super-fast parses
          setTimeout(() => setLoading(false), 120);
        } catch (e) {
          console.error("Post-parse normalize failed:", e);
          setParseError("Failed to process CSV after parsing.");
          setLoading(false);
        }
      };

      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        worker: true,
        complete: onComplete,
        error: (e2) => {
          console.error("CSV parse failed:", e2);
          setParseError(
            e2?.message || "Failed to parse CSV. Please check the file.",
          );
          setLoading(false);
        },
      });
    };

    reader.onerror = () => {
      setParseError("Failed to read file.");
      setLoading(false);
    };

    reader.readAsText(file);

    return () => {
      if (typeof reader.abort === "function") {
        try {
          reader.abort();
        } catch {
          /* ignore abort errors */
        }
      }
    };
  }, [file, normalizedLabelsKey, hideFirstRow]);

  const filteredRows = useMemo(() => {
    if (!headers.length) return rows;
    return rows.filter((row) =>
      headers.every((h) => {
        const v = (row?.[h] ?? "").toString().toLowerCase();
        const q = (filters[h] ?? "").toLowerCase();
        return v.includes(q);
      }),
    );
  }, [rows, headers, filters]);

  const setFilter = useCallback(
    (h, v) => setFilters((s) => ({ ...s, [h]: v })),
    [],
  );

  // Virtual scrolling calculations
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_SIZE,
  );
  const endIndex = Math.min(
    filteredRows.length,
    startIndex + 25 + BUFFER_SIZE * 2,
  );
  const visibleRows = filteredRows.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;
  const totalHeight = filteredRows.length * ROW_HEIGHT;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // dynamic min table width so it can scroll horizontally
  const minTableWidth = useMemo(
    () =>
      SNO_COL_WIDTH +
      (headers.length || Math.max(1, providedLabelCount || 6)) * COL_MIN_WIDTH,
    [headers.length, providedLabelCount],
  );

  // Placeholder column count while loading (before we know headers)
  const placeholderCols = useMemo(
    () => Math.max(1, providedLabelCount || 6),
    [providedLabelCount],
  );

  const displayLabels = hasProvidedLabels ? normalizedColumnLabels : headers;

  if (!file) return null;

  // SKELETON VIEW
  if (loading) {
    return (
      <Box
        sx={{
          height: "100%",
          width: "100%",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            minWidth: SNO_COL_WIDTH + placeholderCols * COL_MIN_WIDTH,
            tableLayout: "auto",
            flex: 1,
            "& th, & td": { py: 1.25 },
            "& thead th:not(:first-of-type), & tbody td:not(:first-of-type)": {
              minWidth: COL_MIN_WIDTH,
            },
            "& thead tr:nth-of-type(1) th": {
              position: "sticky",
              top: 0,
              zIndex: 3,
              bgcolor: "background.paper",
              height: TITLE_ROW_HEIGHT,
            },
            "& thead tr:nth-of-type(2) th": {
              position: "sticky",
              top: TITLE_ROW_HEIGHT,
              zIndex: 2,
              bgcolor: "background.paper",
              height: FILTER_ROW_HEIGHT,
            },
          }}
        >
          <TableHead>
            {/* Row 1: Titles (skeleton) */}
            <TableRow>
              <TableCell sx={{ width: SNO_COL_WIDTH }}>
                <Skeleton width={48} height={20} />
              </TableCell>
              {Array.from({ length: placeholderCols }).map((_, i) => (
                <TableCell key={`sk-title-${i}`}>
                  <Skeleton width="70%" height={20} />
                </TableCell>
              ))}
            </TableRow>

            {/* Row 2: Filters */}
            <TableRow>
              <TableCell sx={{ width: SNO_COL_WIDTH }} />
              {Array.from({ length: placeholderCols }).map((_, i) => (
                <TableCell key={`sk-filter-${i}`}>
                  <Skeleton variant="text" height={18} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {Array.from({ length: 15 }).map((_, r) => (
              <TableRow key={`sk-row-${r}`}>
                <TableCell sx={{ width: SNO_COL_WIDTH }}>
                  <Skeleton width={36} height={18} />
                </TableCell>
                {Array.from({ length: placeholderCols }).map((__, c) => (
                  <TableCell key={`sk-cell-${r}-${c}`}>
                    <Skeleton height={18} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  }

  // REAL TABLE VIEW with Virtual Scrolling
  return (
    <TableContainer
      onScroll={handleScroll}
      sx={{
        maxHeight: "65vh",
        overflowY: "auto",
        overflowX: "auto",
        position: "relative",
        bgcolor: "background.paper",
      }}
    >
      <Table
        size="small"
        stickyHeader
        sx={{
          minWidth: minTableWidth,
          tableLayout: "auto",
          "& th, & td": {
            py: 1.25,
            borderColor: "divider",
          },
          "& tbody td": {
            wordBreak: "break-word",
            color: "text.primary",
          },
          "& thead th:not(:first-of-type), & tbody td:not(:first-of-type)": {
            minWidth: COL_MIN_WIDTH,
          },
          "& thead tr:nth-of-type(1) th": {
            position: "sticky",
            top: 0,
            zIndex: 3,
            bgcolor: "background.paper",
            height: TITLE_ROW_HEIGHT,
            borderBottom: 2,
            borderColor: "divider",
            color: "text.primary",
          },
          "& thead tr:nth-of-type(2) th": {
            position: "sticky",
            top: TITLE_ROW_HEIGHT,
            zIndex: 2,
            bgcolor: "background.paper",
            height: FILTER_ROW_HEIGHT,
            borderBottom: 1,
            borderColor: "divider",
          },
          "& tbody tr:hover": {
            bgcolor: "action.hover",
          },
        }}
      >
        <TableHead>
          {/* Row 1: Titles */}
          <TableRow>
            <TableCell sx={{ width: SNO_COL_WIDTH, whiteSpace: "nowrap" }}>
              <strong>S. No.</strong>
            </TableCell>
            {headers.map((h, idx) => {
              const label = displayLabels[idx] || h;
              return (
                <TableCell
                  key={`title-${h}`}
                  sx={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontWeight: 700,
                  }}
                  title={label}
                >
                  {label}
                </TableCell>
              );
            })}
          </TableRow>

          {/* Row 2: Filters */}
          <TableRow>
            <TableCell sx={{ width: SNO_COL_WIDTH }} />
            {headers.map((h) => (
              <TableCell key={`filter-${h}`}>
                <TextField
                  value={filters[h] ?? ""}
                  onChange={(e) => setFilter(h, e.target.value)}
                  variant="standard"
                  placeholder="Filter..."
                  size="small"
                  fullWidth
                  InputProps={{
                    sx: {
                      fontSize: "0.8rem",
                      lineHeight: 1.2,
                      py: 0.25,
                      color: "text.primary",
                    },
                  }}
                />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {parseError && (
            <TableRow>
              <TableCell colSpan={headers.length + 1}>
                <Box sx={{ py: 2, color: "error.main" }}>{parseError}</Box>
              </TableCell>
            </TableRow>
          )}

          {!parseError && (
            <>
              {/* Spacer for virtual scrolling offset */}
              {offsetY > 0 && (
                <TableRow>
                  <TableCell
                    colSpan={headers.length + 1}
                    sx={{
                      height: offsetY,
                      padding: 0,
                      border: 0,
                    }}
                  />
                </TableRow>
              )}

              {/* Render only visible rows */}
              {visibleRows.map((row, i) => {
                const actualIndex = startIndex + i;
                return (
                  <TableRow key={actualIndex} sx={{ height: ROW_HEIGHT }}>
                    <TableCell sx={{ width: SNO_COL_WIDTH }}>
                      {actualIndex + 1}
                    </TableCell>
                    {headers.map((h) => (
                      <TableCell key={`${actualIndex}-${h}`}>
                        {row?.[h] != null ? String(row[h]) : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}

              {/* Bottom spacer for virtual scrolling */}
              {endIndex < filteredRows.length && (
                <TableRow>
                  <TableCell
                    colSpan={headers.length + 1}
                    sx={{
                      height: totalHeight - endIndex * ROW_HEIGHT,
                      padding: 0,
                      border: 0,
                    }}
                  />
                </TableRow>
              )}
            </>
          )}

          {!parseError && filteredRows.length === 0 && headers.length > 0 && (
            <TableRow>
              <TableCell colSpan={headers.length + 1}>
                <Box sx={{ py: 2, color: "text.secondary" }}>
                  No rows match the current filters.
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default React.memo(CsvPreviewTable);
