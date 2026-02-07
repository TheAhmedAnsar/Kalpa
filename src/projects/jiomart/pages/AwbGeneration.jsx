import React, { useCallback, useEffect, useMemo, useState } from "react";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import { useSnackbar } from "notistack";
import PageLayout from "../../../components/PageLayout";
import HistoryTable from "../../../components/HistoryTable";
import apiClient from "../../../api/client";
import CustomDropdown from "../../../components/CustomDropdown";
import CustomModal from "../../../components/CustomModal";

const SAMPLE_HISTORY = [
  {
    id: "JOB-1009",
    created_by: "ops_bot",
    created_at: "2024-02-04T10:25:00Z",
    type: "forward",
    job_id: "BULK-2001",
    status: "completed",
    log_address: "/logs/job-1009.csv",
  },
  {
    id: "JOB-1008",
    created_by: "user_ajay",
    created_at: "2024-02-03T07:55:00Z",
    type: "alternate-lsp",
    job_id: "BULK-1998",
    status: "failed",
    log_address: "/logs/job-1008.csv",
  },
];

const SAMPLE_HEADERS = {
  forward: ["Forward Shipment Id"],
  reverse: ["Return Shipment Id"],
  "reverse-nqc": ["Return Shipment Id"],
  "alternate-lsp": ["Shipment Id", "Alternate LSP"],
};

const AWBGeneration = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [selectedTemplate, setSelectedTemplate] = useState("forward");
  const [uploadFile, setUploadFile] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobId, setJobId] = useState("");

  const templateOptions = useMemo(
    () => [
      { label: "Forward Shipment", value: "forward" },
      { label: "Return Shipment", value: "reverse" },
      { label: "Alternate LSPs", value: "alternate-lsp" },
      { label: "Assign RVP to Non-QC", value: "reverse-nqc" },
    ],
    [],
  );

  const selectedTemplateOption = templateOptions.find(
    (option) => option.value === selectedTemplate,
  );

  const historyColumns = useMemo(
    () => [
      { key: "id", label: "Job Id" },
      { key: "requested_by", label: "Created By" },
      { key: "created_at", label: "Created At" },
      { key: "type", label: "Type" },
      {
        key: "status",
        label: "Status",
        type: "badge",
        badgeColors: { completed: "success", failed: "error", running: "info" },
      },
      {
        key: "log_address",
        label: "Log",
        type: "download",
        headerClassName: "text-right",
        cellClassName: "text-right",
        downloadTitle: "Download Logs",
      },
    ],
    [],
  );

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await apiClient.post(
        "/__deku/api/v1/__jiomart/fetch/awb-jobs",
        { type: "all" },
      );
      const jobs = response?.data?.jobs || response?.data || [];
      const sortedJobs = [...jobs.data].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      setHistoryRows(sortedJobs);
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch AWB generation history",
        { variant: "error" },
      );
      setHistoryRows(SAMPLE_HISTORY);
    } finally {
      setHistoryLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, historyRefreshKey]);

  const handleTemplateDownload = () => {
    const headers = SAMPLE_HEADERS[selectedTemplate];
    if (!headers) return;

    let csvContent = `${headers.join(",")}\n`;
    if (selectedTemplate == 'alternate-lsp'){
      csvContent += '17679353228101741105J,shadowfax_jio\n17679350568561570665J,xpressbees_jio\n17679351520271512503J,delhivery_jio\n17679260747021372494J,Delhivery_H&B'
    }else{
      csvContent += '17679353228101741105J\n17679350568561570665J'
    }
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTemplate}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (file) => {
    if (!file || !selectedTemplate) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", selectedTemplate);

    try {
      const response = await apiClient.post(
        "/__deku/api/v1/__jiomart/create-job/awb-generation",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const newJobId =
        response?.data?.job_id ||
        response?.data?.jobId ||
        response?.data?.id ||
        "";

      if (newJobId) {
        setJobId(newJobId);
        setJobModalOpen(true);
        enqueueSnackbar("AWB generation job created", { variant: "success" });
        setUploadFile(null);
        setHistoryRefreshKey((prev) => prev + 1);
        fetchHistory();
      } else {
        enqueueSnackbar("Job created but no job id returned", {
          variant: "warning",
        });
      }
    } catch (error) {
      console.error("AWB generation upload failed:", error);
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to create AWB generation job",
        { variant: "error" },
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    handleUpload(file);
  };

  return (
    <PageLayout
      title="AWB Generation"
      contentClassName="flex w-full max-w-full flex-1 flex-col gap-3"
    >
      {!tipDismissed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-blue-900 shadow-sm dark:border-blue-700/60 dark:bg-blue-900/40 dark:text-blue-50">
          <div className="inline-flex items-center gap-3 text-xs italic">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600/90 text-white">
              i
            </span>
            <span>
              The platform supports 1500 shipments at once for AWB generation;
              please split the shipments into multiple files if the count is
              more than 1500.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setTipDismissed(true);
            }}
            className="cursor-pointer rounded-md border border-blue-500/60 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-400 dark:text-blue-100 dark:hover:bg-blue-800/60"
          >
            Ok! Got it
          </button>
        </div>
      ) : null}
      <div className="pshadow-sm flex h-1/2 w-full flex-col gap-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#0f1115]">
        <div className="flex h-full w-full flex-col gap-6 px-4 sm:px-6 md:flex-row md:flex-wrap md:px-6 md:py-6">
          <div className="h-full w-full flex-1 rounded-2xl border border-dashed border-blue-300 bg-white p-6 shadow-sm dark:border-blue-900/60 dark:bg-[#0f1115]">
            <ol className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
              <li>
                Keep the header in the file and each row of the CSV will
                represent a shipment Id.
              </li>
              <li>
                In case of alternate LSP assignment, provide the alternate LSP
                in column 2 next to the shipment Id.
              </li>
              <li>
                For 3P shipments, valid delivery partners for assignment:
                <ul className="mt-1 ml-4 list-disc space-y-1 text-xs">
                  <li>delhivery_jio</li>
                  <li>xpressbees_jio</li>
                  <li>shadowfax_jio</li>
                  <li>Delhivery_H&B</li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="flex w-full flex-1 flex-col gap-4 rounded-2xl border border-dashed border-blue-300 bg-white p-6 shadow-sm dark:border-blue-900/60 dark:bg-[#0f1115]">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Select Action Type
            </h3>
            <CustomDropdown
              options={templateOptions}
              value={selectedTemplateOption}
              onChange={(option) =>
                setSelectedTemplate(option?.value || option || "")
              }
              searchable={false}
              placeholder="Select Template"
              buttonClassName="border-blue-200 bg-blue-50/60 font-medium text-gray-800 shadow-sm transition focus:border-blue-600 focus:ring-blue-600 dark:border-blue-900/60 dark:bg-[#0c0d11] dark:text-gray-100"
            />
            <button
              type="button"
              onClick={handleTemplateDownload}
              className="mt-auto inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-400 dark:text-blue-100 dark:hover:bg-blue-900/40"
            >
              <DownloadOutlinedIcon fontSize="small" />
              Download Sample File
            </button>
          </div>

          <div className="flex w-full flex-1 items-center justify-center rounded-2xl border border-dashed border-blue-300 bg-white p-6 text-center shadow-sm dark:border-blue-900/60 dark:bg-[#0f1115]">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-900/40 dark:text-blue-100">
                <CloudUploadOutlinedIcon />
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Drag and Drop a CSV file here
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500">
                {uploading ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </label>
              {uploadFile ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Selected: {uploadFile.name}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <HistoryTable
        columns={historyColumns}
        rowsOverride={historyRows}
        loadingOverride={historyLoading}
        onRefresh={fetchHistory}
        historyOptions={[{ key: "all", label: "All" }]}
        refreshKey={historyRefreshKey}
        firstColumnWidthPercent={20}
        showRefresh={false}
      />
      <CustomModal
      open={jobModalOpen}
      onClose={() => setJobModalOpen(false)}
      size="sm"
    >
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          AWB Job Created
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          The AWB generation job was created successfully.
        </p>
        <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm dark:bg-white/5">
          <div className="text-xs text-gray-500">Job ID</div>
          <div className="mt-1 font-mono text-sm text-gray-800 dark:text-gray-100">
            {jobId || "-"}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setJobModalOpen(false)}
            className="cursor-pointer rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </div>
    </CustomModal>
    </PageLayout>
  );
};

export default AWBGeneration;
