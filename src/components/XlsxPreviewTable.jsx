import { useEffect, useMemo, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Box,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";

const PREVIEW_LIMIT = 5000;
const SNO_COL_WIDTH = 84;
const COL_MIN_WIDTH = 160;
const TITLE_ROW_HEIGHT = 44;
const FILTER_ROW_HEIGHT = 44;
const ROW_HEIGHT = 40;
const BUFFER_SIZE = 10;
const EXCEL_EPOCH_CUTOFF = 25569; // 1970-01-01 in Excel serial

const normalizeLabels = (labels) => {
  if (!Array.isArray(labels)) return [];
  return labels.map((label, idx) => {
    const normalized = label == null ? "" : String(label).trim();
    return normalized || `Column ${idx + 1}`;
  });
};

const excelSerialToDateString = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < EXCEL_EPOCH_CUTOFF || value > 2958465) return null; // cap at year ~9999

  const parsed = XLSX.SSF?.parse_date_code?.(value);
  if (!parsed || !parsed.y || !parsed.m || !parsed.d) return null;

  const seconds = parsed.S || 0;
  const wholeSeconds = Math.floor(seconds);
  const milliseconds = Math.round((seconds - wholeSeconds) * 1000);
  const date = new Date(
    Date.UTC(
      parsed.y,
      (parsed.m || 1) - 1,
      parsed.d || 1,
      parsed.H || 0,
      parsed.M || 0,
      wholeSeconds,
      milliseconds,
    ),
  );

  const hasTime =
    (parsed.H || 0) !== 0 ||
    (parsed.M || 0) !== 0 ||
    (parsed.S || 0) !== 0 ||
    milliseconds !== 0;

  const pad = (num) => String(num).padStart(2, "0");
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());

  if (!hasTime) return `${y}-${m}-${d}`;

  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}-${m}-${d} ${h}:${min}:${s} UTC`;
};

const normalizeCellValue = (cell) => {
  if (cell == null) return "";
  if (typeof cell === "number" && Number.isFinite(cell)) {
    const dateString = excelSerialToDateString(cell);
    return dateString ?? String(cell);
  }
  return String(cell).trim();
};

const XlsxPreviewTable = ({ file, columnLabels = [], skipFirstRow = true }) => {
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [filters, setFilters] = useState({});
  const [parseError, setParseError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  const normalizedColumnLabels = useMemo(
    () => normalizeLabels(columnLabels),
    [columnLabels],
  );

  const providedLabelCount = normalizedColumnLabels.length;
  const hasProvidedLabels = providedLabelCount > 0;

  useEffect(() => {
    if (!file) return undefined;

    setLoading(true);
    setParseError("");
    setRows([]);
    setHeaders([]);
    setFilters({});

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (!result) throw new Error("File read produced no data.");

        const workbook = XLSX.read(result, { type: "array" });
        const sheetName = workbook.SheetNames?.[0];
        if (!sheetName)
          throw new Error("No sheets found in the uploaded file.");

        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          blankrows: false,
        });

        let workingHeaders = [];
        let dataRows = rawRows;

        if (normalizedColumnLabels.length) {
          workingHeaders = [...normalizedColumnLabels];

          if (rawRows.length > 0) {
            const [firstRow] = rawRows;
            const matchesProvided =
              Array.isArray(firstRow) &&
              firstRow.length === workingHeaders.length &&
              workingHeaders.every((label, idx) => {
                const cellValue =
                  firstRow[idx] == null ? "" : String(firstRow[idx]).trim();
                return cellValue.toLowerCase() === label.toLowerCase();
              });
            dataRows = matchesProvided ? rawRows.slice(1) : rawRows;
          }
        } else if (rawRows.length) {
          workingHeaders = normalizeLabels(
            rawRows[0]?.map((cell, idx) => {
              const normalized = cell == null ? "" : String(cell).trim();
              return normalized || `Column ${idx + 1}`;
            }),
          );
          dataRows = rawRows.slice(1);
        }

        if (workingHeaders.length === 0) {
          const maxColumns = rawRows.reduce((max, row) => {
            if (!Array.isArray(row)) return max;
            return Math.max(max, row.length);
          }, 0);
          workingHeaders = Array.from(
            { length: maxColumns },
            (_, idx) => `Column ${idx + 1}`,
          );
        }

        const workingDataRows = skipFirstRow ? dataRows.slice(1) : dataRows;

        const normalizedRows = workingDataRows
          .slice(0, PREVIEW_LIMIT)
          .map((row) => {
            const rowArray = Array.isArray(row) ? row : [];
            const resultRow = {};
            workingHeaders.forEach((header, idx) => {
              const cell = rowArray[idx];
              resultRow[header] = normalizeCellValue(cell);
            });
            return resultRow;
          });

        const initialFilters = {};
        workingHeaders.forEach((header) => {
          initialFilters[header] = "";
        });

        setHeaders(workingHeaders);
        setRows(normalizedRows);
        setFilters(initialFilters);
        setTimeout(() => setLoading(false), 120);
      } catch (error) {
        console.error("Failed to parse XLSX file:", error);
        setParseError(
          error?.message || "Failed to parse XLSX file. Please check the file.",
        );
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setParseError("Unable to read the file.");
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);

    return () => {
      try {
        reader.abort();
      } catch {
        /* ignore abort errors */
      }
    };
  }, [file, normalizedColumnLabels, skipFirstRow]);

  const filteredRows = useMemo(() => {
    if (!headers.length) return rows;
    return rows.filter((row) =>
      headers.every((header) => {
        const value = (row?.[header] ?? "").toString().toLowerCase();
        const query = (filters[header] ?? "").toLowerCase();
        return value.includes(query);
      }),
    );
  }, [rows, headers, filters]);

  const handleScroll = useCallback((event) => {
    setScrollTop(event.target.scrollTop);
  }, []);

  const setFilter = useCallback(
    (header, value) =>
      setFilters((prev) => ({
        ...prev,
        [header]: value,
      })),
    [],
  );

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

  const minTableWidth = useMemo(
    () =>
      SNO_COL_WIDTH +
      (headers.length || Math.max(1, providedLabelCount || 6)) * COL_MIN_WIDTH,
    [headers.length, providedLabelCount],
  );

  const placeholderCols = useMemo(
    () => Math.max(1, providedLabelCount || 6),
    [providedLabelCount],
  );

  const displayLabels = hasProvidedLabels ? normalizedColumnLabels : headers;

  if (!file) return null;

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
            <TableRow>
              <TableCell sx={{ width: SNO_COL_WIDTH }}>
                <Skeleton width={48} height={20} />
              </TableCell>
              {Array.from({ length: placeholderCols }).map((_, index) => (
                <TableCell key={`sk-title-${index}`}>
                  <Skeleton width="70%" height={20} />
                </TableCell>
              ))}
            </TableRow>

            <TableRow>
              <TableCell sx={{ width: SNO_COL_WIDTH }} />
              {Array.from({ length: placeholderCols }).map((_, index) => (
                <TableCell key={`sk-filter-${index}`}>
                  <Skeleton variant="text" height={18} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {Array.from({ length: 15 }).map((_, rowIndex) => (
              <TableRow key={`sk-row-${rowIndex}`}>
                <TableCell sx={{ width: SNO_COL_WIDTH }}>
                  <Skeleton width={36} height={18} />
                </TableCell>
                {Array.from({ length: placeholderCols }).map((_, colIndex) => (
                  <TableCell key={`sk-cell-${rowIndex}-${colIndex}`}>
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
          <TableRow>
            <TableCell sx={{ width: SNO_COL_WIDTH, whiteSpace: "nowrap" }}>
              <strong>S. No.</strong>
            </TableCell>
            {headers.map((header, index) => {
              const label = displayLabels[index] || header;
              return (
                <TableCell
                  key={`title-${header}`}
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

          <TableRow>
            <TableCell sx={{ width: SNO_COL_WIDTH }} />
            {headers.map((header) => (
              <TableCell key={`filter-${header}`}>
                <TextField
                  value={filters[header] ?? ""}
                  onChange={(event) => setFilter(header, event.target.value)}
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

              {visibleRows.map((row, idx) => {
                const actualIndex = startIndex + idx;
                return (
                  <TableRow key={actualIndex} sx={{ height: ROW_HEIGHT }}>
                    <TableCell sx={{ width: SNO_COL_WIDTH }}>
                      {actualIndex + 1}
                    </TableCell>
                    {headers.map((header) => (
                      <TableCell key={`${actualIndex}-${header}`}>
                        {row?.[header] ?? ""}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}

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

export default XlsxPreviewTable;
