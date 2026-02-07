import React, { useEffect, useRef, useState } from "react";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import * as XLSX from "xlsx";
import apiClient from "../../../api/client";

const DASHBOARD_DUMP_ENDPOINT = "/__deku/api/v1/__tms/download/dashboard-dump";

/**
 * Simple XLSX download button for exporting tabular data.
 * Expects columns with { key, label } and data as array of objects.
 */
const TmsDownloadButton = ({
  columns = [],
  data = [],
  filename = "export.xlsx",
  company = "",
  type = "",
}) => {
  const [open, setOpen] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleCurrentDownload = () => {
    if (!Array.isArray(data) || data.length === 0) return;

    const headerMap = columns
      .filter((c) => c?.key)
      .map((c) => ({ key: c.key, label: c.label || c.key }));

    const rows = data.map((row) => {
      const entry = {};
      headerMap.forEach(({ key, label }) => {
        entry[label] =
          row?.[key] == null
            ? ""
            : typeof row[key] === "object"
              ? JSON.stringify(row[key])
              : row[key];
      });
      return entry;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, filename);
  };

  const getFilenameFromDisposition = (disposition) => {
    if (!disposition) return null;
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
      return decodeURIComponent(utfMatch[1]);
    }
    const asciiMatch = disposition.match(/filename="?([^"]+)"?/i);
    return asciiMatch?.[1] || null;
  };

  const handleFullDownload = async () => {
    if (!company || !type) return;
    setIsPreparing(true);
    try {
      const payload = {
        company,
        type,
      };
      const response = await apiClient.post(DASHBOARD_DUMP_ENDPOINT, payload, {
        responseType: "blob",
      });
      const blob = response?.data;
      const url = window.URL.createObjectURL(blob);
      const disposition = response?.headers?.["content-disposition"];
      const resolvedName =
        getFilenameFromDisposition(disposition) ||
        `${company}-${type}-dashboard-dump.csv.gz`;
      const link = document.createElement("a");
      link.href = url;
      link.download = resolvedName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setIsPreparing(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="b inline-flex w-34 cursor-pointer items-center justify-between gap-1 rounded-full px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 hover:text-purple-800 focus:ring-2 focus:ring-purple-300 focus:outline-none dark:border-purple-300/60 dark:bg-[#1f1a2e] dark:text-purple-200 dark:hover:border-purple-200 dark:hover:bg-[#2a2140] dark:hover:text-purple-100 dark:focus:ring-purple-500"
      >
        <span className="flex items-center gap-1">
          <DownloadOutlinedIcon fontSize="small" />
          <span>Download</span>
        </span>
        <KeyboardArrowDownIcon fontSize="small" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-50 rounded-md border border-gray-200 bg-white p-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#1f1a2e]">
          <button
            type="button"
            onClick={handleCurrentDownload}
            title="Downloads the rows currently visible in the table."
            className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-[#2a2140]"
          >
            Download current data
          </button>
          <button
            type="button"
            onClick={handleFullDownload}
            title="Downloads the full dataset from the server as a gzipped CSV file."
            className="mt-1 w-full cursor-pointer rounded-md px-3 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-[#2a2140]"
          >
            Download full data
          </button>
        </div>
      )}
      {isPreparing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex items-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-lg dark:bg-[#1f1a2e] dark:text-gray-200">
            <span className="relative inline-flex h-8 w-8 items-center justify-center">
              <span className="absolute inline-flex h-8 w-8 rounded-full" />
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
            </span>
            <span>Preparing data for download...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TmsDownloadButton;
