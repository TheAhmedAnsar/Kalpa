import React, { useState } from "react";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Tooltip from "@mui/material/Tooltip";
import { enqueueSnackbar } from "notistack";

const FyndHistoryActions = ({ id, fileAddress, onDownload, downloading }) => {
  const [copied, setCopied] = useState(false);
  const hasFile = Boolean(fileAddress);

  const handleDownload = () => {
    if (!hasFile || downloading || !onDownload) return;
    onDownload();
  };

  const handleCopy = async () => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      enqueueSnackbar("Request ID copied", { variant: "success" });
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      enqueueSnackbar("Failed to copy ID", { variant: "error" });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Tooltip title={hasFile ? "Download dump file" : "File not available"}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!hasFile || downloading}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
          aria-label="Download dump file"
        >
          {downloading ? (
            <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <DownloadOutlinedIcon fontSize="small" />
          )}
        </button>
      </Tooltip>
      <Tooltip title={copied ? "Copied!" : id || "Request ID"}>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
          aria-label="Copy request identifier"
        >
          <ContentCopyIcon fontSize="small" />
        </button>
      </Tooltip>
    </div>
  );
};

export default FyndHistoryActions;
