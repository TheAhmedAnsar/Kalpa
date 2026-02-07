import React, { useState } from "react";
import CustomModal from "../../../../components/CustomModal";
import { enqueueSnackbar } from "notistack";

const TaskCreatedModal = ({ open, onClose, requestId, primaryActionLabel }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!requestId) return;
    try {
      await navigator.clipboard.writeText(requestId);
      setCopied(true);
      enqueueSnackbar("Request ID copied", { variant: "success" });
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      enqueueSnackbar("Failed to copy ID", { variant: "error" });
    }
  };

  return (
    <CustomModal open={open} onClose={onClose} size="sm" isDark={false}>
      <div className="space-y-4 p-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900">Task created</h3>
        <p className="text-sm text-gray-600">
          Your submission has been queued successfully.
        </p>
        {requestId ? (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>Request ID:</span>
            <span className="font-mono text-sm font-semibold text-gray-900">
              {requestId}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-600 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-200"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}
      </div>
    </CustomModal>
  );
};

export default TaskCreatedModal;
