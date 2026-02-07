// DateTimePickerTailwind.jsx
import React from "react";

const DateTimePickerTailwind = ({ date, time, onDateChange, onTimeChange }) => {
  return (
    <div className="w-full max-w-sm rounded-md border border-gray-300 bg-white p-4 shadow-md dark:bg-gray-900">
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Date
        </label>
        <input
          type="date"
          className="w-full rounded border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Time
        </label>
        <input
          type="time"
          className="w-full rounded border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
        />
      </div>
    </div>
  );
};

export default DateTimePickerTailwind;
