import React from "react";
import TaskAlt from "@mui/icons-material/TaskAlt";
import CustomModal from "../CustomModal";

const ConfimationModal = ({
  title = "Thanks for signing up!",
  message = "We’ve received your whitelisting request. You’ll be notified by email when your Panel access is granted.",
  open,
  onClose,
}) => {
  return (
    <CustomModal open={open} onClose={onClose} size={"xs"} isDark={false}>
      <div className="flex flex-col items-center gap-7 p-9 text-center text-gray-900">
        {/* Big tick icon */}
        <div className="relative inline-flex items-center justify-center">
          {/* pulsing halo */}
          <span className="absolute inset-0 animate-ping rounded-full bg-green-500/30" />

          {/* solid circle + icon */}
          <div className="relative z-10 rounded-full bg-green-50 p-4 ring-2 ring-green-100">
            <TaskAlt className="text-green-600" sx={{ fontSize: 56 }} />
          </div>
        </div>

        {/* Heading */}
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>

        {/* Message */}
        <p className="max-w-sm text-sm text-gray-600">{message}</p>
      </div>
    </CustomModal>
  );
};

export default ConfimationModal;
