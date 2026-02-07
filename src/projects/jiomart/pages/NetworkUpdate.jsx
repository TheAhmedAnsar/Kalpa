import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Typography, Button } from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useDropzone } from "react-dropzone";
import { enqueueSnackbar } from "notistack";
import { format } from "date-fns";
import PageLayout from "../../../components/PageLayout";
import CustomModal from "../../../components/CustomModal";
import CustomDropdown from "../../../components/CustomDropdown";
import { VERTICAL_OPTIONS } from "../../../constants/verticals";
import apiClient from "../../../api/client";
import CsvPreviewTable from "../../../components/CsvPreviewTable";
import HistoryTable from "../../../components/HistoryTable";

const NetworkUpdate = () => {
  // State
  const [isQCMode, setIsQCMode] = useState(false);
  const [vertical, setVertical] = useState(null);
  const [file, setFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [missingStores, setMissingStores] = useState([]);
  const [missingStoresOpen, setMissingStoresOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyType, setHistoryType] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File Upload
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (
        selectedFile.type !== "text/csv" &&
        !selectedFile.name.endsWith(".csv")
      ) {
        enqueueSnackbar("Please upload a CSV file", { variant: "warning" });
        return;
      }
      setFile(selectedFile);
      setPreviewOpen(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
    disabled: !vertical,
  });

  const selectMode = (mode) => {
    const nextIsQC = mode === "qc";
    setIsQCMode(nextIsQC);
    // Reset selections when switching modes
    setVertical(null);
    setFile(null);
  };

  // Filter verticals based on mode
  const filteredVerticals = isQCMode
    ? VERTICAL_OPTIONS.filter(
        (v) => v.value === "FASHION" || v.value === "ELECTRONICS",
      )
    : VERTICAL_OPTIONS;

  // Download sample CSV
  const handleDownloadSample = () => {
    const headers = isQCMode
      ? [
          "pincode",
          "dist_min",
          "dist_max",
          "min_promise",
          "max_promise",
          "store",
        ]
      : ["pin", "position", "store_code", "region_code"];
    const csvContent = headers.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      isQCMode ? "qc_network_sample.csv" : "network_sample.csv",
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Job
  const handleSubmit = async () => {
    if (!file || !vertical) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("vertical", vertical.value);
    formData.append("skip", "false");

    try {
      const endpoint = isQCMode
        ? "/__deku/api/v1/__jiomart/create-job/qc-config-update"
        : "/__deku/api/v1/__jiomart/create-job/network-update";

      const response = await apiClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data?.success === false) {
        const apiMessage =
          response.data?.error ||
          response.data?.message ||
          "Failed to create job";
        enqueueSnackbar(apiMessage, { variant: "error" });
        return;
      }

      if (response.data?.success) {
        enqueueSnackbar("Network update job created successfully", {
          variant: "success",
        });
        setPreviewOpen(false);
        setFile(null);
        setHistoryRefreshKey((prev) => prev + 1); // Refresh history
      } else if (response.data?.missing_stores) {
        setMissingStores(response.data.missing_stores);
        setMissingStoresOpen(true);
        setPreviewOpen(false); // Close preview to show error
      } else {
        throw new Error(response.data?.message || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Job creation failed:", error);
      enqueueSnackbar(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create job",
        { variant: "error" },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const historyColumns = useMemo(
    () => [
      {
        key: "id",
        label: "Job ID",
        cellClassName: "font-mono text-xs text-gray-600 dark:text-gray-400",
      },
      {
        key: "user",
        label: "Updated By",
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell text-gray-700 dark:text-gray-200",
      },
      {
        key: "vertical",
        label: "Vertical",
        cellClassName: "text-gray-700 dark:text-gray-200",
      },
      {
        key: "created_at",
        label: "Created At",
        headerClassName: "hidden md:table-cell",
        cellClassName: "hidden md:table-cell text-gray-700 dark:text-gray-200",
        render: (value) =>
          value ? format(new Date(value), "MMM d, yyyy HH:mm") : "-",
      },
      {
        key: "status",
        label: "Status",
        type: "badge",
        badgeColors: {
          completed: "success",
          failed: "error",
        },
      },
      {
        key: "log_address",
        label: "Logs",
        type: "download",
        headerClassName: "text-right",
        cellClassName: "text-right",
        downloadTitle: "Download Logs",
      },
    ],
    [],
  );

  const fetchHistoryRows = useCallback(
    async (type = historyType) => {
      setHistoryLoading(true);
      try {
        const response = await apiClient.post(
          "/__deku/api/v1/__jiomart/fetch/network-update-jobs",
          { type },
        );
        const jobs = response?.data?.jobs || [];
        const sortedJobs = jobs
          .map((job) => job)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setHistoryRows(sortedJobs);
      } catch (error) {
        enqueueSnackbar(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to fetch job history",
          { variant: "error" },
        );
        setHistoryRows([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    [enqueueSnackbar, historyType],
  );

  useEffect(() => {
    fetchHistoryRows(historyType);
  }, [fetchHistoryRows, historyType, historyRefreshKey]);

  return (
    <PageLayout
      title="Network Update"
      contentClassName="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6"
    >
      {/* Top Section: Upload & Configuration */}
      <div className="grid w-full grid-cols-2 overflow-hidden rounded-full border border-gray-300 bg-gray-100 shadow-sm ring-1 ring-black/10 dark:border-gray-700 dark:bg-[#0f1115] dark:ring-gray-800">
        <button
          type="button"
          onClick={() => selectMode("network")}
          className={`w-full cursor-pointer px-4 py-3 text-center text-sm font-semibold tracking-wide uppercase transition ${
            !isQCMode
              ? "bg-black text-white shadow-sm ring-1 ring-gray-700 dark:bg-black dark:text-white"
              : "text-gray-700 hover:bg-white/40 dark:text-gray-300 dark:hover:bg-gray-900/40"
          }`}
        >
          Network
        </button>
        <button
          type="button"
          onClick={() => selectMode("qc")}
          className={`w-full cursor-pointer px-4 py-3 text-center text-sm font-semibold tracking-wide uppercase transition ${
            isQCMode
              ? "bg-black text-white shadow-sm ring-1 ring-gray-700 dark:bg-black dark:text-white"
              : "text-gray-700 hover:bg-white/40 dark:text-gray-300 dark:hover:bg-gray-900/40"
          }`}
        >
          QC Config
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-700 dark:bg-black">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-full sm:w-64">
                <CustomDropdown
                  options={filteredVerticals}
                  value={vertical}
                  onChange={(newValue) => {
                    setVertical(newValue);
                    if (!newValue) setFile(null);
                  }}
                  placeholder={
                    isQCMode ? "Select QC vertical" : "Select Vertical"
                  }
                />
              </div>
            </div>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadSample}
              className="whitespace-nowrap"
              size="small"
            >
              Download Sample
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            {...getRootProps()}
            className={`relative mt-4 flex min-h-[18vh] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all sm:min-h-[22vh] ${
              !vertical
                ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800"
                : isDragActive
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/20"
                  : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500 dark:hover:bg-gray-700"
            }`}
          >
            <input {...getInputProps()} />

            {file ? (
              <div className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/30">
                  <DescriptionOutlinedIcon
                    className="text-indigo-600 dark:text-indigo-400"
                    fontSize="large"
                  />
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {file.name}
                  </div>
                  <div
                    variant="caption"
                    className="text-gray-500 dark:text-gray-400"
                  >
                    {(file.size / 1024).toFixed(2)} KB
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Tap to replace file
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <CloudUploadOutlinedIcon
                  className="text-gray-400"
                  fontSize="large"
                />
                <div className="font-medium text-gray-600 dark:text-gray-300">
                  {vertical
                    ? "Drag & drop CSV file here, or tap to select"
                    : "Select a vertical first to upload file"}
                </div>
                <div variant="caption" className="text-gray-400">
                  Supported format: .csv
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Section */}
        <HistoryTable
          columns={historyColumns}
          rowsOverride={historyRows}
          loadingOverride={historyLoading}
          activeHistoryType={historyType}
          onRefresh={(type) => {
            if (type && type !== historyType) {
              setHistoryType(type);
              return;
            }
            fetchHistoryRows(type || historyType);
          }}
          historyOptions={[
            { key: "all", label: "All History" },
            { key: "me", label: "My History" },
          ]}
          refreshKey={historyRefreshKey}
        />
      </div>

      {/* Preview Modal */}
      <CustomModal
        open={previewOpen}
        onClose={() => !isSubmitting && setPreviewOpen(false)}
        size="xl"
        isDark={false}
      >
        <div className="flex h-[80vh] flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="font-lg font-bold text-black">
              {isQCMode ? "Verify QC Network File" : "Verify Network File"}
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-4">
            <CsvPreviewTable
              file={file}
              columnLabels={
                isQCMode
                  ? [
                      "pincode",
                      "dist_min",
                      "dist_max",
                      "min_promise",
                      "max_promise",
                      "store",
                    ]
                  : ["pincode", "position", "store_code", "region_code"]
              }
              hideFirstRow={false}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <Button
              onClick={() => {
                setPreviewOpen(false);
                setFile(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Process & Upload"}
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* Missing Stores Modal */}
      <CustomModal
        open={missingStoresOpen}
        onClose={() => setMissingStoresOpen(false)}
        size="sm"
      >
        <div className="flex flex-col p-6">
          <div className="mb-4 flex items-center gap-3 text-amber-600 dark:text-amber-500">
            <WarningAmberRoundedIcon fontSize="large" />
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              Missing Stores Found
            </div>
          </div>

          <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            The following stores in your uploaded file were not found in the
            system. Please onboard them from Add Store
          </div>

          <div className="max-h-[400px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap gap-2">
              {missingStores.map((store, index) => (
                <span
                  key={index}
                  className="inline-block rounded-md border border-red-300 bg-red-50 px-2 py-1 font-mono text-xs text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                >
                  {store}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CustomModal>
    </PageLayout>
  );
};

export default NetworkUpdate;
