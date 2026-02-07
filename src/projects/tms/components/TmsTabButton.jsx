import React from "react";

const TmsTabButton = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition ${
      active
        ? "bg-purple-100 text-gray-900 dark:bg-white/10 dark:text-white"
        : "text-gray-600 dark:text-gray-300 dark:hover:border-gray-500"
    }`}
  >
    {label}
  </button>
);

export default TmsTabButton;
