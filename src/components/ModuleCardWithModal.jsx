// ModuleCardWithModal.jsx
import React, { useState } from "react";
import CustomModal from "./CustomModal";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const ModuleCardWithModal = ({ icon, title, description, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex h-60 cursor-pointer flex-col justify-between gap-1 rounded-lg border border-gray-200 p-6 shadow-md transition duration-200 hover:shadow-xl dark:border-gray-600 dark:shadow-gray-800">
        <div>
          <div className="mb-4 flex items-center justify-start">{icon}</div>
          <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-gray-50">
            {title}
          </h3>
          <p className="text-xs text-wrap text-gray-500 dark:text-gray-100">
            {description}
          </p>
        </div>

        <div
          className="self-end justify-self-end rounded-md border border-gray-200 p-1 transition-colors duration-200 ease-in-out hover:text-blue-600"
          onClick={() => setOpen(true)}
        >
          <ChevronRightIcon />
        </div>
      </div>

      <CustomModal open={open} onClose={() => setOpen(false)}>
        <h2 className="mb-4 text-xl font-semibold">{title}</h2>
        {children}
      </CustomModal>
    </>
  );
};

export default ModuleCardWithModal;
