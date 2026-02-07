import React, { useCallback, useMemo, useState } from "react";
import PageLayout from "../../../components/PageLayout";
import CustomDropdown from "../../../components/CustomDropdown";
import HistoryTable from "../../../components/HistoryTable";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

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

const UpdateUserType = () => {
  console.log("UpdateUserType component loaded");
  const [fileType, setFileType] = useState(FILE_TYPE_OPTIONS[0]);
  const [partnerIds, setPartnerIds] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [historyRows, setHistoryRows] = useState(SAMPLE_JOBS);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

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
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) setUploadFile(file);
  };
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  const handleSampleDownload = () => {
    const csv =
      "UserID,NewTypeID\nUSER123,TYPE_A\nUSER456,TYPE_B";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "user-type-update-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout
      title="User Type ID Update"
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
            <li>Each row in the CSV represents a unique User ID.</li>
            <li>Ensure the User Type matches the system registry.</li>
            <li>
              Required fields: <code className="font-mono text-xs">UserID</code>
              , <code className="font-mono text-xs">NewTypeID</code>.
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
          <button
            type="button"
            onClick={handleSampleDownload}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            <DownloadOutlinedIcon fontSize="small" />
            Download the sample file
          </button>
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
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {uploadFile.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-px w-full bg-gray-300 dark:bg-gray-600" />
        <div className="relative h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      {/* Get User Info */}
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
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-600 bg-white px-6 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <SearchOutlinedIcon fontSize="small" />
              Search Data
            </button>
          </div>
        </div>
      </div>

      {/* Recent Updates */}
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

      {/* Footer */}
      <div className="flex flex-col items-center justify-center gap-1 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <span>POWERED BY</span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200">
          <BoltIcon sx={{ fontSize: 18 }} className="text-blue-600" />
          EnterpriseHub
        </span>
      </div>
    </PageLayout>
  );
};

export default UpdateUserType;
