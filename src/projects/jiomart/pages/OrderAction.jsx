import React, { useState, useRef, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import HistoryTable from "../../../components/HistoryTable";
import apiClient from "../../../api/client";
import PageLayout from "../../../components/PageLayout";
import { useSnackbar } from "notistack";
import TaskCreatedModal from "../components/vault/TaskCreatedModal";

const SAMPLE_FILE_LINKS = {
  shipment: "", // TODO: Add Shipment Status sample file link here
  rca: "/samples/RCA-Sample-sheet.csv",
  posting: "", // TODO: Add Posting Retry sample file link here
};

const HISTORY_ENDPOINTS = {
  shipment: "/__deku/api/v1/__jiomart/fetch/shipment-status-jobs",
  rca: "/__deku/api/v1/__jiomart/fetch/arong-jobs",
  posting: "/api/v1/posting-retry/history", // TODO: Update with actual API
};

const ActionCard = ({
  type,
  title,
  description,
  isActive,
  onSelect,
  onDownloadSample,
  onPrimaryAction,
  selectedFile,
  onFileSelect,
  isSubmitting = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMenuDownload = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    onDownloadSample(type);
  };

  const handleFileUploadClick = (e) => {
    e.stopPropagation();
    if (isActive && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    e.stopPropagation();
    const file = e.target.files[0];
    if (file) {
      onFileSelect(type, file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isActive) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isActive) setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isActive) {
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelect(type, file);
      }
    }
  };

  return (
    <div
      className={`flex cursor-pointer flex-col rounded-2xl border border-dashed p-6 shadow-sm transition-all duration-200 dark:bg-[#0c0d11] ${
        isActive
          ? type === "rca"
            ? "border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/20 dark:border-purple-500 dark:ring-purple-500/20"
            : "border-sky-400 ring-2 ring-sky-400/20 bg-sky-50/30 dark:border-sky-500 dark:ring-sky-500/20"
          : "border-blue-300 bg-white hover:border-blue-400 dark:border-blue-700"
      }`}
      onClick={() => onSelect(type)}
    >
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <MoreVertIcon fontSize="small" />
          </button>
          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 top-8 z-10 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-[#1a1c23]"
            >
              <button
                onClick={handleMenuDownload}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5"
              >
                <DownloadOutlinedIcon sx={{ fontSize: 16 }} />
                Download Sample File
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col justify-end gap-4">
        {/* File Upload Section */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".csv"
        />
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileUploadClick}
          className={`flex h-32 w-full items-center justify-center rounded-xl border border-dashed text-sm font-medium transition-colors ${
            isActive
              ? isDragging
                ? type === "rca"
                  ? "cursor-copy border-purple-400 bg-purple-100 dark:bg-purple-900/30"
                  : "cursor-copy border-sky-400 bg-sky-100 dark:bg-sky-900/30"
                : type === "rca"
                  ? "cursor-pointer border-purple-300 bg-purple-50/40 text-purple-600 hover:bg-purple-100/40 dark:border-purple-500/50 dark:bg-purple-900/10 dark:text-purple-300"
                  : "cursor-pointer border-sky-300 bg-sky-50/40 text-sky-600 hover:bg-sky-100/40 dark:border-sky-500/50 dark:bg-sky-900/10 dark:text-sky-300"
              : "cursor-not-allowed border-gray-300 bg-gray-50 opacity-50 text-gray-400 dark:border-gray-800 dark:bg-[#0f1115]"
          }`}
        >
          {selectedFile ? (
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <span className="font-semibold">{selectedFile.name}</span>
              <span className="text-xs opacity-75">Click or Drag to replace</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <span>
                {isActive
                  ? "Click or Drag to Upload File"
                  : "Select card to enable upload"}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={!isActive || isSubmitting}
          onClick={(e) => {
            e.stopPropagation();
            if (isActive) {
              onPrimaryAction(type);
            }
          }}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition ${
            isActive
              ? type === "rca"
                ? "cursor-pointer border-purple-500 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-100 dark:hover:bg-purple-900/40"
                : "cursor-pointer border-sky-500 text-sky-600 hover:bg-sky-50 dark:border-sky-400 dark:text-sky-100 dark:hover:bg-sky-900/40"
              : "cursor-not-allowed border-gray-300 text-gray-400 opacity-60 dark:border-gray-700 dark:text-gray-500"
          }`}
        >
          <DownloadOutlinedIcon fontSize="small" />
          {type === "shipment" &&
            (isSubmitting ? "Submitting..." : "Fetch Shipment Status")}
          {type === "rca" && (isSubmitting ? "Submitting..." : "Get RCA")}
          {type === "posting" && "Upload File"}
        </button>
      </div>
    </div>
  );
};

const OrderAction = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [historyType, setHistoryType] = useState("shipment");
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submittingType, setSubmittingType] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobModalOpen, setJobModalOpen] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState({
    shipment: null,
    rca: null,
    posting: null,
  });

  const historyColumns = [
    { key: "job_id", label: "Job ID", accessor: (row) => row?.id ?? "—" },
    {
      key: "created_by",
      label: "Created By",
      accessor: (row) => row?.requested_by ?? "—",
    },
    { key: "created_at", label: "Created At" },
    {
      key: "status",
      label: "Status",
      type: "badge",
      badgeColors: { completed: "success", failed: "error", running: "info", pending: "warning" },
    },
    {
      key: "log_address",
      label: "Log",
      type: "download",
      downloadLabel: "",
    },
  ];

  const fetchHistory = async () => {
    setHistoryLoading(true);
    const endpoint = HISTORY_ENDPOINTS[historyType];
    if (!endpoint) {
      setHistoryLoading(false);
      return;
    }

    try {
      if (historyType === "posting") {
        setHistoryRows([]);
        return;
      }
      if (historyType === "shipment") {
        const response = await apiClient.get(
          "/__deku/api/v1/__jiomart/fetch/shipment-status-jobs",
        );
        const rows = response?.data?.data ?? response?.data ?? [];
        setHistoryRows(Array.isArray(rows) ? rows : []);
      } else if (historyType === "rca") {
        const response = await apiClient.get(
          "/__deku/api/v1/__jiomart/fetch/arong-jobs",
        );
        const rows = response?.data?.data ?? response?.data ?? [];
        setHistoryRows(Array.isArray(rows) ? rows : []);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setHistoryRows(
          Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            job_id: `JOB-${historyType.toUpperCase()}-00${i + 1}`,
            created_by: "system",
            created_at: new Date(Date.now() - 86400000 * i).toISOString(),
            type: historyType,
            status: i === 0 ? "running" : "completed",
            log_url: "#",
          })),
        );
      }
    } catch (error) {
      console.error("Failed to fetch history", error);
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (historyType === "posting") {
      setHistoryType("shipment");
      return;
    }
    fetchHistory();
  }, [historyType, refreshKey]);

  const handleTemplateDownload = (type) => {
    const link = SAMPLE_FILE_LINKS[type];
    if (link) {
      window.open(link, "_blank");
    } else {
      console.warn(`No sample file link configured for: ${type}`);
      alert(`Please configure the sample file link for ${type}`);
    }
  };

  const handleFileSelect = (type, file) => {
    if (!file || !file.name?.toLowerCase().endsWith(".csv")) {
      enqueueSnackbar("Please upload a valid CSV file.", {
        variant: "warning",
      });
      return;
    }
    setSelectedFiles((prev) => ({
      ...prev,
      [type]: file,
    }));
  };

  const handlePrimaryAction = async (type) => {
    if (type !== "shipment" && type !== "rca") return;
    const file = selectedFiles[type];
    if (!file) {
      enqueueSnackbar("Please upload a CSV file first.", {
        variant: "warning",
      });
      return;
    }
    setSubmittingType(type);
    const formData = new FormData();
    formData.append("file", file);
    const endpoint =
      type === "shipment"
        ? "/__deku/api/v1/__jiomart/create-job/shipment-status"
        : "/__deku/api/v1/__jiomart/create-job/arong-rca";
    try {
      const response = await apiClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response?.data?.success === false) {
        const apiMessage =
          response?.data?.message ||
          response?.data?.error ||
          "Failed to create job.";
        throw new Error(apiMessage);
      }
      const requestId = response?.data?.job_id ?? "";
      setJobId(requestId);
      setJobModalOpen(true);
      setSelectedFiles((prev) => ({
        ...prev,
        [type]: null,
      }));
      enqueueSnackbar("Job created successfully.", { variant: "success" });
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create job.",
        { variant: "error" },
      );
    } finally {
      setSubmittingType("");
    }
  };

  return (
    <PageLayout
      title={"Bulk Action"}
      contentClassName="flex flex-1 flex-col overflow-hidden"
    >
      <section className="mt-0 flex-1 overflow-y-auto p-1">
        <div className="mt-2 grid gap-6 lg:grid-cols-3">
          <ActionCard
            type="shipment"
            title="Shipment Status"
            description="Track the delivery status of your shipments in real-time."
            isActive={historyType === "shipment"}
            onSelect={setHistoryType}
            onDownloadSample={handleTemplateDownload}
            onPrimaryAction={handlePrimaryAction}
            selectedFile={selectedFiles.shipment}
            onFileSelect={handleFileSelect}
            isSubmitting={submittingType === "shipment"}
          />
          <ActionCard
            type="rca"
            title="Arong Orders"
            description="Perform Root Cause Analysis for cases requiring investigation."
            isActive={historyType === "rca"}
            onSelect={setHistoryType}
            onDownloadSample={handleTemplateDownload}
            onPrimaryAction={handlePrimaryAction}
            selectedFile={selectedFiles.rca}
            onFileSelect={handleFileSelect}
            isSubmitting={submittingType === "rca"}
          />
          <div className="pointer-events-none opacity-50">
            <ActionCard
              type="posting"
              title="Retry Postings"
              description="Retry posting mechanisms for failed transactions."
              isActive={false}
              onSelect={() => {}}
              onDownloadSample={handleTemplateDownload}
              onPrimaryAction={handlePrimaryAction}
              selectedFile={selectedFiles.posting}
              onFileSelect={handleFileSelect}
              isSubmitting={false}
            />
          </div>
        </div>

        <div className="mt-8 pb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {historyType === "shipment" && "Shipment Status History"}
              {historyType === "rca" && "RCA History"}
              {historyType === "posting" && "Retry Posting History"}
            </h2>
          </div>

          {historyType === "posting" ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-inner dark:border-gray-800 dark:bg-[#0c0d11] dark:text-gray-400">
              Retry Postings is temporarily disabled.
            </div>
          ) : (
            <HistoryTable
              columns={historyColumns}
              rowsOverride={historyRows}
              loadingOverride={historyLoading}
              onRefresh={() => setRefreshKey((p) => p + 1)}
              historyOptions={[]}
              activeHistoryType={historyType}
              showInfoButton={false}
            />
          )}
        </div>
      </section>

      <TaskCreatedModal
        open={jobModalOpen}
        onClose={() => setJobModalOpen(false)}
        requestId={jobId}
        primaryActionLabel="Close"
      />
    </PageLayout>
  );
};

export default OrderAction;
