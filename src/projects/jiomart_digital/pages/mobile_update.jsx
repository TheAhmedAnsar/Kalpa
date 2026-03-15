import React, { useCallback, useMemo, useState } from "react";
import PageLayout from "../../../components/PageLayout";
import CustomDropdown from "../../../components/CustomDropdown";
import HistoryTable from "../../../components/HistoryTable";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import { IconButton, Tooltip } from "@mui/material";

const SAMPLE_JOBS = [
  {
    id: "8a780ce2-0fcc-44a1-b2fa-1234567890ab",
    created_by: "admin.user@enterprise.com",
    created_at: "2024-02-03T09:29:37Z",
    type: "Batch Update",
    status: "completed",
    log_address: "#",
  },
  {
    id: "d341614a-61f8-4720-9fb7-abcdef123456",
    created_by: "admin.user@enterprise.com",
    created_at: "2024-02-03T09:23:57Z",
    type: "Verification",
    status: "completed",
    log_address: "#",
  },
  {
    id: "258ff9d8-81ff-45d9-af1f-9876543210fe",
    created_by: "system.auto@enterprise.com",
    created_at: "2024-02-03T09:13:19Z",
    type: "Archive Sync",
    status: "processing",
    log_address: "#",
  },
];

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 8);
  return `${date} | ${time}`;
};

const ACTION_OPTIONS = [
  { label: "Update Mobile Number", value: "update-mobile" },
];

const DB_ENV_OPTIONS = [
  { label: "Deadlock", value: "Deadlock" },
  { label: "Marketing", value: "marketing" },
];

const MobileUpdate = () => {
  const [tipDismissed, setTipDismissed] = useState(false);
  const [actionType, setActionType] = useState(ACTION_OPTIONS[0]);
  const [dbEnv, setDbEnv] = useState(DB_ENV_OPTIONS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [historyRows, setHistoryRows] = useState(SAMPLE_JOBS);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [pageInfo] = useState({ showing: 3, total: 128 });

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
        accessor: (row) =>
          row.id ? `${String(row.id).slice(0, 8)}...` : "—",
      },
      { key: "created_by", label: "CREATED BY" },
      {
        key: "created_at",
        label: "DATE & TIME",
        accessor: (row) => formatDateTime(row.created_at),
      },
      { key: "type", label: "TYPE" },
      {
        key: "status",
        label: "STATUS",
        type: "badge",
        badgeColors: {
          completed: "success",
          processing: "info",
        },
      },
      {
        key: "log_address",
        label: "ACTION",
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
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".csv")) setUploadFile(file);
  };
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  const handleSampleDownload = () => {
    const csv =
      "partner_id,mobile_number,carrier\n12345,9876543210,Jio_Telecom\n67890,9123456789,Airtel_Digital";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mobile-update-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout
      title="Mobile Data Management Portal"
      contentClassName="flex flex-1 flex-col gap-6 overflow-auto"
    >
      {/* Info banner */}
      {!tipDismissed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100">
          <div className="inline-flex items-center gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              i
            </span>
            <span>
              The platform supports up to 1500 mobile number updates at once;
              please split larger files into multiple batches.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTipDismissed(true)}
            className="shrink-0 cursor-pointer rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            Ok! Got it
          </button>
        </div>
      )}

      {/* Update Mobile Number */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          Update Mobile Number
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Instructions */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Instructions
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• Keep headers: partner_id, mobile_number, and carrier.</li>
              <li>• CSV files only. Each row represents one user profile.</li>

            </ul>
          </div>

          {/* Action type + sample download */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Select Action Type
            </h3>
            <CustomDropdown
              options={ACTION_OPTIONS}
              value={actionType}
              onChange={(opt) => setActionType(opt || ACTION_OPTIONS[0])}
              searchable={false}
              placeholder="Select"
              buttonClassName="border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
            />
            <button
              type="button"
              onClick={handleSampleDownload}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <DownloadOutlinedIcon fontSize="small" />
              Download Sample File
            </button>
          </div>

          {/* Upload zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                : "border-blue-200 bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20"
            }`}
          >
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400">
              <CloudUploadOutlinedIcon sx={{ fontSize: 32 }} />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Drag and Drop a CSV file here
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Maximum file size 5MB
            </p>
            <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30">
              Browse Files
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
            {uploadFile && (
              <div className="mt-2 flex w-full flex-col items-center text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Selected: {uploadFile.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Get Mobile Info */}
      <div>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Get Mobile Info
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Query individual user records and carrier data
            </p>
          </div>
          <Tooltip title="Refresh">
            <IconButton
              onClick={() => {
                setHistoryRefreshKey((k) => k + 1);
              }}
              disabled={historyLoading}
              size="small"
              className="!text-gray-600 dark:!text-gray-300"
            >
              <AutorenewOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Select DB Environment
            </label>
            <CustomDropdown
              options={DB_ENV_OPTIONS}
              value={dbEnv}
              onChange={(opt) => setDbEnv(opt || DB_ENV_OPTIONS[0])}
              searchable={false}
              placeholder="Select"
              buttonClassName="w-full border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Search Query
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter partner_id or mobile_number..."
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <SearchOutlinedIcon
                className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fontSize="small"
              />
            </div>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            Run Query
          </button>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Recent Jobs
        </p>
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
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {pageInfo.showing} of {pageInfo.total} recent activities
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-md border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
              >
                Previous
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-md border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500 dark:text-gray-400">
        <BoltIcon sx={{ fontSize: 18 }} className="text-amber-500" />
        <span>Powered by DataOps Engine v2.4</span>
      </div>
    </PageLayout>
  );
};

export default MobileUpdate;
