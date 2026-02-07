import React from "react";
import CustomModal from "../../../components/CustomModal";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { Link } from "react-router-dom";

const BulkActionModal = ({ open, onClose, taskId }) => {
  return (
    <CustomModal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center gap-7 p-9 text-center">
        {/* Big DoneAll icon with halo */}
        <div className="relative inline-flex items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/30" />
          <div className="relative z-10 rounded-full bg-blue-50 p-4 ring-2 ring-blue-100">
            <DoneAllIcon className="text-blue-600" sx={{ fontSize: 60 }} />
          </div>
        </div>

        {/* Hard-coded Heading */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Task created successfully
        </h3>

        {/* Bottom confirmation format */}
        <div className="mt-3 flex flex-col gap-5 text-sm text-gray-700 dark:text-white">
          <p>A New task has been created</p>
          <p className="font-mono font-semibold text-blue-500">
            {taskId}
          </p>
          <p>
            To view task status{" "}
            <Link
              to={"/task-status"}
              className="text-blue-600 underline hover:text-blue-800"
            >
              click here
            </Link>
          </p>
        </div>
      </div>
    </CustomModal>
  );
};

export default BulkActionModal;
