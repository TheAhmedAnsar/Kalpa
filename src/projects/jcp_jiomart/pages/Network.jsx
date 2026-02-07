import React, { useMemo, useRef, useState } from "react";
import {
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { enqueueSnackbar } from "notistack";
import PageLayout from "../../../components/PageLayout";
import CustomModal from "../../../components/CustomModal";
import CsvPreviewTable from "../../../components/CsvPreviewTable";
import XlsxPreviewTable from "../../../components/XlsxPreviewTable";
import apiClient from "../../../api/client";

const SAMPLE_HEADERS = {
  network: ["pin", "position", "store_code", "region_code"],
  dz: [
    "Delivery Zone Name",
    "Delivery Zone Code",
    "Country",
    "State",
    "City",
    "Sector",
    "Pincode",
    "Selling Location Code",
    "Department",
    "Status",
  ],
  pz: ["Price Zone Name", "Type", "State", "City", "Pincode", "Store Code"],
  serviceability: [
    "State",
    "City",
    "Pincode",
    "First Mile (TRUE/FALSE)",
    "Last Mile (TRUE/FALSE)",
    "Route Code",
    "COD Limit",
    "Prepaid Limit",
    "Doorstep Return (TRUE/FALSE)",
    "Doorstep QC (TRUE/FALSE)",
    "Forward Pickup CutOff (11:30/17:00)",
    "Reverse Pickup CutOff (11:30/17:00)",
    "Installation (TRUE/FALSE)",
    "Hand to Hand Exchange (TRUE/FALSE)",
    "Holiday Date (2024-01-26 OR 2024/01/26)",
    "Holiday Name (Republic Day)",
    "Holiday Type (NATIONAL HOLIDAY)",
    "Command (UPDATE/UPSERT)",
  ],
};

const buildSampleCsv = (type) =>
  `${(SAMPLE_HEADERS[type] ?? ["col1", "col2"]).join(",")}\n`;

const isValidUploadFile = (file) => {
  if (!file) return false;
  if (file.type === "text/csv") return true;
  const name = file.name?.toLowerCase() || "";
  return (
    name.endsWith(".csv") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  );
};

const getFilenameFromHeader = (disposition) => {
  if (!disposition) return "";
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
  if (!match || !match[1]) return "";
  return match[1].replace(/['"]/g, "");
};

const pickSignedUrl = (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object") return "";
  return (
    payload.url ||
    payload.signed_url ||
    payload.signedUrl ||
    payload.download_url ||
    payload.file_url ||
    ""
  );
};

const UploadCard = ({
  title,
  file,
  disabled,
  helper,
  onFileSelected,
}) => {
  const inputRef = useRef(null);

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleChange = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (selected) {
      onFileSelected(selected);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group relative flex h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 text-center transition ${
        disabled
          ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
          : "cursor-pointer border-slate-200 bg-white text-gray-800 hover:border-slate-400 hover:bg-slate-50"
      }`}
      disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
          disabled
            ? "border-gray-200 bg-gray-100"
            : "border-slate-200 bg-white shadow-sm"
        }`}
      >
        <CloudUploadOutlinedIcon fontSize="small" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide">
          {title}
        </p>
        <p className="text-xs text-gray-500">{helper}</p>
        {file ? (
          <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <DescriptionOutlinedIcon sx={{ fontSize: 14 }} />
            {file.name}
          </p>
        ) : null}
      </div>
    </button>
  );
};

const Network = () => {
  const [networkFile, setNetworkFile] = useState(null);
  const [dzFile, setDzFile] = useState(null);
  const [pzFile, setPzFile] = useState(null);
  const [serviceNetworkFile, setServiceNetworkFile] = useState(null);
  const [serviceExportFile, setServiceExportFile] = useState(null);
  const [verified, setVerified] = useState({
    network: false,
    dz: false,
    pz: false,
    serviceNetwork: false,
    serviceExport: false,
  });
  const [activeModal, setActiveModal] = useState(null);
  const [verifyChecked, setVerifyChecked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const openMenu = Boolean(menuAnchor);

  const modalFile = useMemo(() => {
    if (activeModal === "network") return networkFile;
    if (activeModal === "dz") return dzFile;
    if (activeModal === "pz") return pzFile;
    if (activeModal === "serviceNetwork") return serviceNetworkFile;
    if (activeModal === "serviceExport") return serviceExportFile;
    return null;
  }, [activeModal, networkFile, dzFile, pzFile, serviceNetworkFile, serviceExportFile]);
  const isXlsxPreview =
    modalFile?.name?.toLowerCase().endsWith(".xlsx") ||
    modalFile?.name?.toLowerCase().endsWith(".xls");

  const handleFileSelect = (type, file) => {
    if (!isValidUploadFile(file)) {
      enqueueSnackbar("Please upload a valid CSV or XLSX file.", {
        variant: "warning",
      });
      return;
    }
    if (type === "network") {
      setNetworkFile(file);
      setDzFile(null);
      setPzFile(null);
      setVerified((prev) => ({
        ...prev,
        network: false,
        dz: false,
        pz: false,
      }));
    }
    if (type === "dz") {
      setDzFile(file);
      setPzFile(null);
      setVerified((prev) => ({ ...prev, dz: false, pz: false }));
    }
    if (type === "pz") {
      setPzFile(file);
      setVerified((prev) => ({ ...prev, pz: false }));
    }
    if (type === "serviceNetwork") {
      setServiceNetworkFile(file);
      setServiceExportFile(null);
      setVerified((prev) => ({
        ...prev,
        serviceNetwork: false,
        serviceExport: false,
      }));
    }
    if (type === "serviceExport") {
      setServiceExportFile(file);
      setVerified((prev) => ({ ...prev, serviceExport: false }));
    }
    setVerifyChecked(false);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setVerifyChecked(false);
  };

  const handleProceed = () => {
    if (!activeModal) return;
    setVerified((prev) => ({ ...prev, [activeModal]: true }));
    closeModal();
  };

  const handleUpload = async () => {
    if (activeModal === "serviceExport") {
      if (!serviceNetworkFile || !serviceExportFile) {
        enqueueSnackbar("Please upload both serviceability CSV files.", {
          variant: "warning",
        });
        return;
      }
    } else {
      if (!networkFile || !dzFile || !pzFile) {
        enqueueSnackbar("Please upload all three CSV files.", {
          variant: "warning",
        });
        return;
      }
    }
    setUploading(true);
    try {
      if (activeModal === "serviceExport") {
        const formData = new FormData();
        formData.append("network_file", serviceNetworkFile);
        formData.append("serviceability_file", serviceExportFile);
        const response = await apiClient.post(
          "/__deku/api/v1/__jcp/prepare-servicibility-file",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        const signedUrl = pickSignedUrl(response?.data?.data ?? response?.data);
        if (!signedUrl) {
          throw new Error("Missing download URL in response.");
        }
        const link = document.createElement("a");
        link.href = signedUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = "serviceability-output.csv";
        link.click();
        setVerified((prev) => ({ ...prev, serviceExport: true }));
        enqueueSnackbar("Serviceability file generated successfully.", {
          variant: "success",
        });
        closeModal();
      } else {
        const formData = new FormData();
        formData.append("network_file", networkFile);
        formData.append("dz_export_file", dzFile);
        formData.append("pz_export_file", pzFile);
        const response = await apiClient.post(
          "/__deku/api/v1/__jcp/prepare-dz-pz-file",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            responseType: "blob",
          },
        );
        const filename = getFilenameFromHeader(
          response?.headers?.["content-disposition"],
        );
        const blob = new Blob([response.data], {
          type: response?.data?.type || "application/zip",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || "dz-pz-output.zip";
        link.click();
        window.URL.revokeObjectURL(url);
        setVerified((prev) => ({ ...prev, pz: true }));
        enqueueSnackbar("File generated successfully.", { variant: "success" });
        closeModal();
      }
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to generate file.",
        { variant: "error" },
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSampleDownload = (type) => {
    const csv = buildSampleCsv(type);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${type}-sample.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    setMenuAnchor(null);
  };

  return (
    <PageLayout
      title="Network"
      contentClassName="flex flex-1 flex-col overflow-hidden"
    >
      <section className="flex-1 overflow-y-auto p-4">
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Prepare DZ-PZ Files</h2>
              </div>
              <div>
                <Tooltip title="Download samples" arrow>
                  <button
                    type="button"
                    onClick={(event) => setMenuAnchor(event.currentTarget)}
                    className="rounded-full p-2 text-gray-600 transition hover:bg-slate-50"
                    aria-label="Open sample downloads"
                  >
                    <MoreVertIcon fontSize="small" />
                  </button>
                </Tooltip>
                <Menu
                  anchorEl={menuAnchor}
                  open={openMenu}
                  onClose={() => setMenuAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem
                    onClick={() => handleSampleDownload("network")}
                    className="text-xs"
                  >
                    <DownloadOutlinedIcon sx={{ fontSize: 16, mr: 1 }} />
                    Download Sample Network File
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleSampleDownload("dz")}
                    className="text-xs"
                  >
                    <DownloadOutlinedIcon sx={{ fontSize: 16, mr: 1 }} />
                    Download Sample DZ File
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleSampleDownload("pz")}
                    className="text-xs"
                  >
                    <DownloadOutlinedIcon sx={{ fontSize: 16, mr: 1 }} />
                    Download Sample PZ File
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleSampleDownload("serviceability")}
                    className="text-xs"
                  >
                    <DownloadOutlinedIcon sx={{ fontSize: 16, mr: 1 }} />
                    Download Sample Serviceability File
                  </MenuItem>
                </Menu>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
      <UploadCard
        title="Upload Network File"
        helper="CSV or XLSX format"
        file={networkFile}
        disabled={false}
        onFileSelected={(file) => handleFileSelect("network", file)}
      />
      <UploadCard
        title="Upload DZ File"
                helper="Verify Network first"
                file={dzFile}
                disabled={!verified.network}
        onFileSelected={(file) => handleFileSelect("dz", file)}
      />
      <UploadCard
        title="Upload PZ File"
                helper="Verify DZ first"
                file={pzFile}
                disabled={!verified.dz}
                onFileSelected={(file) => handleFileSelect("pz", file)}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Prepare Serviceability File
                </h3>
                <p className="text-sm text-gray-500">
                  Upload the network and serviceability export CSV files.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
      <UploadCard
        title="Upload Network File"
        helper="CSV or XLSX format"
        file={serviceNetworkFile}
        disabled={false}
        onFileSelected={(file) => handleFileSelect("serviceNetwork", file)}
      />
      <UploadCard
        title="Upload Serviceability Export"
                helper="Verify Network first"
                file={serviceExportFile}
                disabled={!verified.serviceNetwork}
                onFileSelected={(file) => handleFileSelect("serviceExport", file)}
              />
            </div>
          </div>
        </div>
      </section>

      <CustomModal
        open={Boolean(activeModal)}
        onClose={closeModal}
        size="xl"
        isDark={false}
      >
        <div className="space-y-4 p-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {activeModal === "network" && "Verify Network File"}
              {activeModal === "dz" && "Verify DZ File"}
              {activeModal === "pz" && "Verify PZ File"}
              {activeModal === "serviceNetwork" && "Verify Network File"}
              {activeModal === "serviceExport" && "Verify Serviceability File"}
            </h3>
            <p className="text-sm text-gray-500">
              Confirm the CSV content before proceeding.
            </p>
          </div>

          {modalFile && isXlsxPreview ? (
            <XlsxPreviewTable file={modalFile} />
          ) : modalFile ? (
            <CsvPreviewTable file={modalFile} />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
            <FormControlLabel
              control={
                <Checkbox
                  checked={verifyChecked}
                  onChange={(event) => setVerifyChecked(event.target.checked)}
                />
              }
              label="I have verified the file contents."
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
              >
                Cancel
              </button>
              {activeModal === "pz" || activeModal === "serviceExport" ? (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!verifyChecked || uploading}
                  className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProceed}
                  disabled={!verifyChecked}
                  className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Proceed
                </button>
              )}
            </div>
          </div>
        </div>
      </CustomModal>
    </PageLayout>
  );
};

export default Network;
