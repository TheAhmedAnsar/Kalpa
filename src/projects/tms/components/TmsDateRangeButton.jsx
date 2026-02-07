import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-date-range";
import { format, isValid, parseISO } from "date-fns";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const formatLabel = (startDate, endDate) => {
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`;
  }
  if (startDate) {
    return `${startDate} - ...`;
  }
  if (endDate) {
    return `... - ${endDate}`;
  }
  return "Select Dates";
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

const TmsDateRangeButton = ({
  startDate,
  endDate,
  onApply,
  onClear,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(startDate || "");
  const [draftEnd, setDraftEnd] = useState(endDate || "");
  const [selection, setSelection] = useState({
    startDate: toDate(startDate) || new Date(),
    endDate: toDate(endDate) || new Date(),
    key: "selection",
  });
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setDraftStart(startDate || "");
    setDraftEnd(endDate || "");
    setSelection({
      startDate: toDate(startDate) || new Date(),
      endDate: toDate(endDate) || new Date(),
      key: "selection",
    });
  }, [open, startDate, endDate]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event) => {
      if (!popoverRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleApply = () => {
    onApply?.({
      startDate: draftStart || "",
      endDate: draftEnd || "",
    });
    setOpen(false);
  };

  const handleClear = () => {
    setDraftStart("");
    setDraftEnd("");
    setSelection({
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    });
    onClear?.();
    setOpen(false);
  };

  const handleRangeChange = (ranges) => {
    const next = ranges?.selection;
    if (!next?.startDate || !next?.endDate) return;
    setSelection(next);
    setDraftStart(format(next.startDate, "yyyy-MM-dd"));
    setDraftEnd(format(next.endDate, "yyyy-MM-dd"));
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-w-[14rem] items-center gap-2 rounded-full border border-transparent bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:ring-2 focus:ring-purple-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#201b2e] dark:text-gray-200 dark:hover:bg-[#2b2340] dark:focus:ring-purple-500"
      >
        <CalendarMonthOutlinedIcon fontSize="small" />
        <span>{formatLabel(startDate, endDate)}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-100 mt-2 flex w-[23rem] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-white/10">
          <DateRange
            ranges={[selection]}
            onChange={handleRangeChange}
            moveRangeOnFirstSelection={false}
            rangeColors={["#7c3aed"]}
          />
          <div className="mt-3 flex items-center justify-end gap-2 self-end">
            <button
              type="button"
              onClick={handleClear}
              className="cursor-pointer rounded-full px-3 py-1 text-xs font-semibold text-gray-500 transition hover:text-gray-700"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="cursor-pointer rounded-full bg-[#7c3aed] px-3 py-1 text-xs font-semibold text-white transition hover:bg-purple-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TmsDateRangeButton;
