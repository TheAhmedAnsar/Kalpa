import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  IconButton,
  Menu,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CustomModal from "./CustomModal";
import CsvPreviewTable from "./CsvPreviewTable";
import { enqueueSnackbar } from "notistack";

import {
  setPanel1Selection,
  completePanel1,
  setUploadedFile,
  verifyFile,
  completePanel2,
  setUpdateOption,
  setScheduleDateTime,
  goBackToPanel1,
  goBackToPanel2,
  resetUploadedFile,
  resetWorkflow,
} from "../store";

/* ---------- Listen to Tailwind's [data-theme] changes live ---------- */
function useTailwindDark() {
  const getIsDark = () =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark";

  const [isDark, setIsDark] = useState(getIsDark);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const target = document.documentElement;
    const obs = new MutationObserver(() => setIsDark(getIsDark()));
    obs.observe(target, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return isDark;
}

/* ---------- NEW: Constrained pickers (no free entry) ---------- */
const ConstrainedDateTimePicker = ({
  date,
  time,
  dateOptions,
  timeOptions,
  onDateChange,
  onTimeChange,
  inputLabelSx,
  selectSx,
  isDark,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormControl fullWidth size="small">
        <InputLabel id="date-select-label" sx={inputLabelSx} shrink>
          Date
        </InputLabel>
        <Select
          labelId="date-select-label"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          label="Date"
          sx={selectSx}
          MenuProps={{
            slotProps: {
              paper: {
                sx: {
                  bgcolor: isDark ? "#0f0f0f" : "#fff",
                  color: isDark ? "#e5e7eb" : "inherit",
                },
              },
            },
          }}
          displayEmpty
          renderValue={(val) =>
            val ? val : <span style={{ opacity: 0.7 }}>Date</span>
          }
        >
          {dateOptions.map((d) => (
            <MenuItem key={d} value={d} sx={{ fontSize: "0.875rem" }}>
              {d}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="time-select-label" sx={inputLabelSx} shrink>
          Time
        </InputLabel>
        <Select
          key={`time-${date}`}
          labelId="time-select-label"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          label="Time"
          sx={selectSx}
          MenuProps={{
            slotProps: {
              paper: {
                sx: {
                  bgcolor: isDark ? "#0f0f0f" : "#fff",
                  color: isDark ? "#e5e7eb" : "inherit",
                },
              },
            },
          }}
          displayEmpty
          renderValue={(val) =>
            val ? val : <span style={{ opacity: 0.7 }}>Time</span>
          }
        >
          {timeOptions.map((t) => (
            <MenuItem key={t} value={t} sx={{ fontSize: "0.875rem" }}>
              {t}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
};

// ---------- Helpers (timezone-safe) ----------
const pad2 = (n) => String(n).padStart(2, "0");

// Local (timezone-safe) YYYY-MM-DD
const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

// Build a local Date from YYYY-MM-DD and HH:mm strings
const buildLocalDateTime = (dateStr, timeStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh = 0, mm = 0] = (timeStr || "00:00").split(":").map(Number);
  const dt = new Date();
  dt.setFullYear(y, m - 1, d);
  dt.setHours(hh, mm, 0, 0);
  return dt;
};

const roundUpToNext30 = (date) => {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  const add = m === 0 ? 0 : 30 - (m % 30);
  d.setMinutes(m + add);
  return d;
};

const generateTimeSlots = (startMinutes = 0, endMinutes = 24 * 60) => {
  const out = [];
  for (let m = startMinutes; m < endMinutes; m += 30) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${pad2(hh)}:${pad2(mm)}`);
  }
  return out;
};

const CsvWorkflow = ({
  workflowId,
  options = [],
  sampleFileUrl = "#",
  onSubmit,
  descriptionsByOption = {},
  sampleHeadersByOption = {},
}) => {
  const dispatch = useDispatch();
  const workflow = useSelector((state) => state.workflow[workflowId]);
  const previousWorkflowRef = useRef(workflow);
  const isSubmitting = workflow?.isSubmitting ?? false;

  const selectOptions =
    options.length > 0
      ? options
      : [
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
        ];

  const isDark = useTailwindDark();

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [verifiedChecked, setVerifiedChecked] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [localFile, setLocalFile] = useState(null);

  /** ── Scheduling constraints ───────────────────────────────── */
  const ONLY_TODAY_AND_TOMORROW = true;

  const isSameYMD = (aStr, b) => aStr === fmtDate(b);

  const getTimeOptionsForDate = useCallback((dateStr) => {
    const now = new Date();
    const todayStr = fmtDate(now);
    if (isSameYMD(dateStr, now)) {
      const nextSlot = roundUpToNext30(now);
      if (!isSameYMD(todayStr, nextSlot)) return [];
      const start = nextSlot.getHours() * 60 + nextSlot.getMinutes();
      return generateTimeSlots(start, 24 * 60);
    }
    return generateTimeSlots(0, 24 * 60);
  }, []);

  const getDateOptions = useCallback(() => {
    const today = new Date();
    const todayStr = fmtDate(today);
    if (ONLY_TODAY_AND_TOMORROW) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const todaySlots = getTimeOptionsForDate(todayStr);
      if (todaySlots.length === 0) {
        return [fmtDate(tomorrow)];
      }
      return [todayStr, fmtDate(tomorrow)];
    }
    return [todayStr];
  }, [ONLY_TODAY_AND_TOMORROW, getTimeOptionsForDate]);

  const clampDateToAllowed = useCallback(
    (dateStr) => {
      const today = fmtDate(new Date());
      if (ONLY_TODAY_AND_TOMORROW) {
        const allowedDates = getDateOptions();
        if (!allowedDates.includes(dateStr)) return allowedDates[0];
        return dateStr;
      }
      return dateStr < today ? today : dateStr;
    },
    [ONLY_TODAY_AND_TOMORROW, getDateOptions],
  );

  const clampTimeToAllowed = useCallback(
    (dateStr, timeStr) => {
      const allowed = getTimeOptionsForDate(dateStr);
      if (allowed.includes(timeStr)) return timeStr;

      const toMinutes = (s) => {
        const [h, m] = (s || "00:00").split(":").map(Number);
        return h * 60 + m;
      };
      const sel = toMinutes(timeStr);
      const next = allowed.find((s) => toMinutes(s) >= sel);
      return next || allowed[0] || "00:00";
    },
    [getTimeOptionsForDate],
  );

  /** ── Scheduled date/time state (clamped defaults) ─────────── */
  const [scheduleDate, setScheduleDate] = useState(() => {
    const base = workflow.scheduleDateTime
      ? fmtDate(new Date(workflow.scheduleDateTime))
      : fmtDate(new Date());
    return clampDateToAllowed(base);
  });

  const [scheduleTime, setScheduleTime] = useState(() => {
    const initDateStr = workflow.scheduleDateTime
      ? fmtDate(new Date(workflow.scheduleDateTime))
      : fmtDate(new Date());
    const dateClamped = clampDateToAllowed(initDateStr);
    const allowed = getTimeOptionsForDate(dateClamped);
    const initialTime = workflow.scheduleDateTime
      ? new Date(workflow.scheduleDateTime).toTimeString().slice(0, 5)
      : "";
    return clampTimeToAllowed(dateClamped, initialTime || allowed[0]);
  });

  const resetLocalState = useCallback(() => {
    setMenuAnchor(null);
    setShowModal(false);
    setVerifiedChecked(false);
    setCsvData([]);
    setLocalFile(null);

    const baseDate = fmtDate(new Date());
    const clampedDate = clampDateToAllowed(baseDate);
    const allowedTimes = getTimeOptionsForDate(clampedDate);
    const defaultTime = clampTimeToAllowed(
      clampedDate,
      allowedTimes.length > 0 ? allowedTimes[0] : "",
    );

    setScheduleDate(clampedDate);
    setScheduleTime(defaultTime);
  }, [clampDateToAllowed, clampTimeToAllowed, getTimeOptionsForDate]);

  // Keep scheduleTime valid whenever scheduleDate changes
  useEffect(() => {
    const allowed = getTimeOptionsForDate(scheduleDate);
    if (!allowed.includes(scheduleTime)) {
      const t = clampTimeToAllowed(scheduleDate, scheduleTime);
      setScheduleTime(t);
      maybeSetScheduleDateTime(scheduleDate, t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleDate]);

  // Tick every 60s so time options stay current
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dateOptions = useMemo(() => getDateOptions(), [nowTick]);

  useEffect(() => {
    if (!dateOptions.includes(scheduleDate)) {
      const d = dateOptions[0];
      const t = clampTimeToAllowed(d, scheduleTime);
      setScheduleDate(d);
      setScheduleTime(t);
      maybeSetScheduleDateTime(d, t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateOptions]);

  const timeOptions = useMemo(
    () => getTimeOptionsForDate(scheduleDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleDate, nowTick],
  );

  useEffect(() => {
    const prev = previousWorkflowRef.current;
    const isInitial =
      workflow.panel1Selection === "" &&
      workflow.panel1Complete === false &&
      workflow.uploadedFile === null &&
      workflow.fileVerified === false &&
      workflow.panel2Complete === false &&
      workflow.updateOption === "" &&
      workflow.scheduleDateTime === null &&
      workflow.isSubmitting === false;

    const wasInitial =
      prev &&
      prev.panel1Selection === "" &&
      prev.panel1Complete === false &&
      prev.uploadedFile === null &&
      prev.fileVerified === false &&
      prev.panel2Complete === false &&
      prev.updateOption === "" &&
      prev.scheduleDateTime === null &&
      prev.isSubmitting === false;

    if (prev && !wasInitial && isInitial) {
      resetLocalState();
    }

    previousWorkflowRef.current = workflow;
  }, [resetLocalState, workflow]);

  // Reset local component state whenever the `workflowId` changes (user switched workflows)
  useEffect(() => {
    resetLocalState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  // Ensure Redux workflow slice for this id is reset when component unmounts or when id changes
  useEffect(() => {
    return () => {
      dispatch(resetWorkflow(workflowId));
    };
  }, [dispatch, workflowId]);

  // Memoized preview file
  const previewFile = useMemo(() => {
    if (!csvData || !csvData.length) return null;
    const csvString = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    return new File([blob], "preview.csv", { type: "text/csv" });
  }, [csvData]);

  // Current step: 1, 2, 3
  const currentStep = workflow.panel2Complete
    ? 3
    : workflow.panel1Complete
      ? 2
      : 1;
  const isFuture = (step) => step > currentStep;
  const isPrevious = (step) => step < currentStep;

  // Card classes
  const getCardClasses = (step) => {
    const base =
      "flex h-full min-h-0 flex-col rounded-xl border border-gray-300 bg-white p-6 shadow-md duration-300 ease-in-out w-xs dark:border-gray-700 dark:bg-black";
    const active = step === currentStep ? "ring-2 ring-blue-500" : "";
    const disabled = isFuture(step) ? "opacity-50 pointer-events-none" : "";
    const clickable = isPrevious(step) ? "cursor-pointer hover:shadow-lg" : "";
    return `${base} ${active} ${disabled} ${clickable} w-full`;
  };

  /* ----------------- Dark-friendly styles that react to isDark ----------------- */
  const menuPaperSx = useMemo(
    () => ({
      bgcolor: isDark ? "#0f0f0f" : "#fff",
      color: isDark ? "#e5e7eb" : "inherit",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`,
      boxShadow: isDark
        ? "0 10px 15px -3px rgba(0,0,0,.7), 0 4px 6px -4px rgba(0,0,0,.7)"
        : undefined,
      "& .MuiMenu-list": {
        py: 0.5,
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": { width: 8, height: 8 },
        "&::-webkit-scrollbar-thumb": {
          borderRadius: 8,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.35)"
            : "rgba(0,0,0,0.35)",
        },
      },
      "& .MuiMenuItem-root": {
        fontSize: "0.875rem",
        "&:hover": { bgcolor: isDark ? "#1f2937" : "action.hover" },
        "&.Mui-selected, &.Mui-selected:hover": {
          bgcolor: isDark ? "#374151" : "action.selected",
        },
      },
      "& .MuiDivider-root": {
        bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
      },
    }),
    [isDark],
  );

  const selectSx = useMemo(
    () => ({
      fontSize: "0.875rem",
      bgcolor: isDark ? "#0f172a" : "background.paper",
      color: isDark ? "#e5e7eb" : "inherit",
      height: 36,
      display: "flex",
      alignItems: "center",
      "& .MuiOutlinedInput-input": {
        paddingTop: 0,
        paddingBottom: 0,
        height: "100%",
        lineHeight: "36px",
        display: "flex",
        alignItems: "center",
        color: isDark ? "#e5e7eb" : "inherit",
      },
      "& .MuiSelect-select": {
        display: "flex",
        alignItems: "center",
      },
      "& .MuiSelect-icon": {
        top: "50%",
        transform: "translateY(-50%)",
      },
      "& .MuiSvgIcon-root": { color: isDark ? "#e5e7eb" : "inherit" },
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.23)",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
      },
    }),
    [isDark],
  );

  // Fix floating/shrunk label color in dark mode
  const inputLabelSx = useMemo(
    () => ({
      color: isDark ? "#cbd5e1" : "rgba(0,0,0,0.6)",
      "&.Mui-focused": { color: isDark ? "#93c5fd" : "primary.main" },
      "&.MuiInputLabel-shrink": {
        color: isDark ? "#cbd5e1" : "rgba(0,0,0,0.6)",
      },
    }),
    [isDark],
  );

  // ✅ Common MenuProps for Select (MUI v6)
  const commonMenuProps = useMemo(
    () => ({
      slotProps: {
        paper: { sx: menuPaperSx },
        list: { dense: true },
        transition: { keepMounted: false },
      },
    }),
    [menuPaperSx],
  );

  /* ---------- Step 1 ---------- */
  const resetStep1 = () => {
    handleResetFile();
    setScheduleTime("");
    dispatch(goBackToPanel1(workflowId));
    dispatch(goBackToPanel2(workflowId));
  };

  const handleSelectChange = (e) => {
    const value = e.target.value;
    const changed = value !== workflow.panel1Selection;

    dispatch(setPanel1Selection({ id: workflowId, value }));

    if (changed) {
      dispatch(resetUploadedFile(workflowId));
      dispatch(goBackToPanel2(workflowId));
      dispatch(setUpdateOption({ id: workflowId, value: "" }));
      dispatch(setScheduleDateTime({ id: workflowId, value: null }));
    }

    if (value) {
      dispatch(completePanel1(workflowId));
    }
  };

  /* ---------- Step 2 ---------- */
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalFile(file);
      dispatch(
        setUploadedFile({
          id: workflowId,
          file: { name: file.name, size: file.size },
        }),
      );
    }
  };

  const handleVerify = () => {
    if (!localFile) return;
    setVerifiedChecked(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const rows = text
        .trim()
        .split(/\r?\n/)
        .map((row) => row.split(","));
      setCsvData(rows);
      setShowModal(true);
    };
    reader.readAsText(localFile);
  };

  const handleVerified = () => {
    dispatch(verifyFile(workflowId));
    setShowModal(false);
    dispatch(completePanel2(workflowId));
  };

  const handleResetFile = () => {
    dispatch(resetUploadedFile(workflowId));
    setCsvData([]);
    setLocalFile(null);
  };

  /* ---------- Step 3 ---------- */
  const handleUpdateOptionChange = (e) => {
    const value = e.target.value;
    dispatch(setUpdateOption({ id: workflowId, value }));
    if (value === "scheduled") {
      const selectedForCurrent = buildLocalDateTime(scheduleDate, scheduleTime);
      const now = new Date();
      if (selectedForCurrent <= now) {
        enqueueSnackbar("Please select another timeframe", {
          variant: "error",
        });
      }
      maybeSetScheduleDateTime(scheduleDate, scheduleTime);
    } else {
      dispatch(setScheduleDateTime({ id: workflowId, value: null }));
    }
  };

  const maybeSetScheduleDateTime = (dateStr, timeStr) => {
    const dClamped = clampDateToAllowed(dateStr);
    const tClamped = clampTimeToAllowed(dClamped, timeStr);
    const selected = buildLocalDateTime(dClamped, tClamped);
    const now = new Date();
    if (selected > now) {
      dispatch(setScheduleDateTime({ id: workflowId, value: selected }));
    } else {
      dispatch(setScheduleDateTime({ id: workflowId, value: null }));
    }
  };

  // Helper to render a centered placeholder/label text inside the field
  const renderSelectValue = (value, options, placeholder = "Select Option") => {
    if (value === "" || value == null) {
      return <span style={{ opacity: 0.7 }}>{placeholder}</span>;
    }
    const opt = options.find((o) => o.value === value);
    return opt?.label ?? value;
  };

  /* ===== NEW: helpers for Panel 1 additions ===== */
  const selectedValue = workflow.panel1Selection;
  const selectedOption = selectOptions.find((o) => o.value === selectedValue);
  const selectedDescriptions = descriptionsByOption[selectedValue] || [];
  const selectedSampleHeaders = sampleHeadersByOption[selectedValue] || [];
  // Column labels for preview modal – prefer provided sample headers
  const previewColumnLabels =
    selectedSampleHeaders.length > 0 ? selectedSampleHeaders : csvData[0] || [];

  const downloadSampleCsv = () => {
    if (selectedSampleHeaders && selectedSampleHeaders.length > 0) {
      const csv = selectedSampleHeaders.join(",") + "\n";
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedOption?.value || "sample"}_sample.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMenuAnchor(null);
      return;
    }
    // fallback: use provided URL if headers weren't supplied
    if (sampleFileUrl && sampleFileUrl !== "#") {
      const a = document.createElement("a");
      a.href = sampleFileUrl;
      a.download = "sample.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setMenuAnchor(null);
    }
  };

  return (
    <div className="mx-auto grid h-full max-w-7xl grid-cols-1 gap-8 p-6 md:grid-cols-3">
      {/* ---------- Panel 1 ---------- */}
      <div
        className={getCardClasses(1)}
        onClick={() => {
          if (isPrevious(1)) {
            resetStep1();
          } else if (currentStep === 1) {
            dispatch(setPanel1Selection({ id: workflowId, value: "" }));
            handleResetFile();
          }
        }}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="min-w-0">
            <span className="text-lg font-semibold text-gray-800 dark:text-white">
              {selectedOption ? selectedOption.label : "Select Bulk Action"}
            </span>
          </div>
        </div>

        {/* prevent card click from firing when using the Select */}
        <div onClick={(e) => e.stopPropagation()}>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <Select
              labelId="panel1-select-label"
              value={workflow.panel1Selection}
              onChange={handleSelectChange}
              onOpen={() =>
                dispatch(setPanel1Selection({ id: workflowId, value: "" }))
              }
              sx={selectSx}
              MenuProps={commonMenuProps}
              displayEmpty
              renderValue={(val) =>
                renderSelectValue(val, selectOptions, "Select Option")
              }
            >
              <MenuItem value="" sx={{ fontSize: "0.875rem" }}>
                Select Option
              </MenuItem>
              {selectOptions.map((opt) => (
                <MenuItem
                  key={opt.value}
                  value={opt.value}
                  sx={{ fontSize: "0.875rem" }}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* NEW: render description bullets for the selected option */}
        <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 text-xs text-gray-700 dark:text-gray-300">
          {selectedDescriptions.length > 0 ? (
            <ul className="ml-4 list-disc space-y-2">
              {selectedDescriptions.map((pt, idx) => {
                if (typeof pt === "string") {
                  const isDash = pt.trim().startsWith("-");
                  const text = isDash ? pt.trim().substring(1).trim() : pt;
                  const formatted = text.replace(
                    /\*(.*?)\*/g,
                    "<strong>$1</strong>",
                  );

                  return (
                    <li key={idx} className={isDash ? "list-none" : ""}>
                      <span dangerouslySetInnerHTML={{ __html: formatted }} />
                    </li>
                  );
                }
                return <li key={idx}>{pt}</li>;
              })}
            </ul>
          ) : (
            <span className="opacity-70">
              Choose an option to view details.
            </span>
          )}

          {/* {selectedSampleHeaders.length > 0 && (
            <div className="rounded-md bg-gray-100 px-3 py-2 text-[11px] text-gray-700 shadow-sm dark:bg-white/5 dark:text-gray-200">
              <div className="mb-2 font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
                Expected Columns
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSampleHeaders.map((header) => (
                  <span
                    key={header}
                    className="rounded-full bg-white px-3 py-1 text-[11px] shadow-sm ring-1 ring-gray-200 dark:bg-[#1f1f1f] dark:ring-gray-700"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>
          )} */}

          {/* {selectedOption && csvData.length > 1 && (
            <div className="rounded-md bg-gray-50 px-3 py-2 text-[11px] text-gray-700 shadow-sm dark:bg-white/5 dark:text-gray-200">
              <div className="mb-2 font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
                Sample Preview
              </div>
              <div className="grid gap-1">
                {csvData.slice(1, 4).map((row, rowIdx) => (
                  <div
                    key={`preview-${rowIdx}`}
                    className="grid grid-cols-1 gap-1 text-[10px] sm:grid-cols-2"
                  >
                    {row.map((cell, cellIdx) => (
                      <div
                        key={`preview-${rowIdx}-${cellIdx}`}
                        className="truncate rounded bg-white px-2 py-1 shadow-sm ring-1 ring-gray-200 dark:bg-[#1f1f1f] dark:ring-gray-700"
                      >
                        {cell || "—"}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )} */}
        </div>
      </div>

      {/* ---------- Panel 2 ---------- */}
      <div
        className={getCardClasses(2)}
        onClick={() => {
          if (isPrevious(2)) {
            handleResetFile();
            dispatch(goBackToPanel2(workflowId));
          }
        }}
      >
        <div className="mb-2 flex justify-between">
          <span className="text-lg font-semibold text-gray-800 dark:text-white">
            Upload & Verify
          </span>

          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setMenuAnchor(e.currentTarget);
            }}
            size="small"
            sx={{ color: isDark ? "#e5e7eb" : "inherit" }}
          >
            <MoreVertIcon />
          </IconButton>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            slotProps={{
              paper: { sx: menuPaperSx },
              list: { dense: true },
              transition: { keepMounted: false },
            }}
          >
            <MenuItem
              onClick={() => {
                downloadSampleCsv();
              }}
            >
              Download Sample File
            </MenuItem>
          </Menu>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          {!workflow.uploadedFile ? (
            <label className="flex min-h-64 w-full cursor-pointer flex-col items-center justify-center rounded border border-dashed border-gray-400 bg-gray-50 p-12 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              <span className="text-base">Click to upload .csv</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          ) : (
            <div className="w-full overflow-hidden text-sm dark:text-gray-200">
              <div className="mx-auto w-full overflow-hidden text-center">
                <span
                  title={workflow.uploadedFile.name}
                  className="block truncate whitespace-nowrap"
                >
                  {workflow.uploadedFile.name}
                </span>
              </div>
              <p className="text-center text-xs text-gray-500">
                {(workflow.uploadedFile.size / 1024).toFixed(1)} kB
              </p>
            </div>
          )}
        </div>

        {workflow.uploadedFile && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (currentStep !== 2) return;
                handleResetFile();
              }}
              aria-label="Reset File"
              title={currentStep === 2 ? "Reset File" : "Available in Step 2"}
              disabled={currentStep !== 2}
            >
              <DeleteOutlineOutlinedIcon />
            </Button>

            <Button
              className="transition-transform hover:scale-105"
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                if (currentStep !== 2) return;
                handleVerify();
              }}
              disabled={currentStep !== 2}
            >
              Verify File Data
            </Button>
          </div>
        )}

        {/* Preview Modal */}
        <CustomModal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            setVerifiedChecked(false);
          }}
          size="lg"
          isDark={false}
        >
          <div className="flex h-[75vh] flex-col gap-4 p-4.5">
            {csvData.length > 0 && (
              <div className="flex-1 overflow-hidden rounded border shadow">
                <CsvPreviewTable
                  file={previewFile}
                  columnLabels={previewColumnLabels}
                />
              </div>
            )}

            <div className="mt-1 flex items-center justify-between">
              <FormControlLabel
                slotProps={{ typography: { sx: { color: "text.primary" } } }}
                control={
                  <Checkbox
                    checked={verifiedChecked}
                    onChange={(e) => setVerifiedChecked(e.target.checked)}
                  />
                }
                label="I have verified the data"
              />

              <Button
                variant="contained"
                onClick={handleVerified}
                disabled={!verifiedChecked}
              >
                Proceed
              </Button>
            </div>
          </div>
        </CustomModal>
      </div>

      {/* ---------- Panel 3 ---------- */}
      <div className={getCardClasses(3)}>
        <div className="mb-3 flex justify-between">
          <span className="text-lg font-semibold text-gray-800 dark:text-white">
            Update or Schedule
          </span>
        </div>

        <div className="flex flex-col gap-5">
          <FormControl fullWidth size="small">
            <Select
              labelId="update-action-label"
              value={workflow.updateOption}
              onChange={handleUpdateOptionChange}
              sx={selectSx}
              MenuProps={commonMenuProps}
              displayEmpty
              renderValue={(val) =>
                renderSelectValue(
                  val,
                  [
                    { value: "now", label: "Update Now" },
                    { value: "scheduled", label: "Schedule" },
                  ],
                  "Select Updation Time",
                )
              }
            >
              <MenuItem value="now" sx={{ fontSize: "0.875rem" }}>
                Update Now
              </MenuItem>
              <MenuItem value="scheduled" sx={{ fontSize: "0.875rem" }}>
                Schedule
              </MenuItem>
            </Select>
          </FormControl>

          {workflow.updateOption === "scheduled" && (
            <div className="mt-1">
              <ConstrainedDateTimePicker
                date={scheduleDate}
                time={scheduleTime}
                dateOptions={dateOptions}
                timeOptions={timeOptions}
                inputLabelSx={inputLabelSx}
                selectSx={selectSx}
                isDark={isDark}
                onDateChange={(newDate) => {
                  const dClamped = clampDateToAllowed(newDate);
                  const tClamped = clampTimeToAllowed(dClamped, scheduleTime);
                  setScheduleDate(dClamped);
                  setScheduleTime(tClamped);
                  const selectedDt = buildLocalDateTime(dClamped, tClamped);
                  const now = new Date();
                  if (selectedDt <= now) {
                    enqueueSnackbar("Please select another timeframe", {
                      variant: "error",
                    });
                  }
                  maybeSetScheduleDateTime(dClamped, tClamped);
                }}
                onTimeChange={(newTime) => {
                  const tClamped = clampTimeToAllowed(scheduleDate, newTime);
                  setScheduleTime(tClamped);
                  const selectedDt = buildLocalDateTime(scheduleDate, tClamped);
                  const now = new Date();
                  if (selectedDt <= now) {
                    enqueueSnackbar("Please select another timeframe", {
                      variant: "error",
                    });
                  }
                  maybeSetScheduleDateTime(scheduleDate, tClamped);
                }}
              />
            </div>
          )}

          <div className="mt-2">
            <Button
              className="transition-colors duration-300 ease-in-out"
              variant="outlined"
              disabled={
                isSubmitting ||
                !(
                  workflow.updateOption &&
                  (workflow.updateOption === "now" || workflow.scheduleDateTime)
                )
              }
              onClick={() => {
                if (!onSubmit || isSubmitting) return;
                if (
                  workflow.updateOption === "scheduled" &&
                  workflow.scheduleDateTime
                ) {
                  const scheduled = new Date(workflow.scheduleDateTime);
                  const now = new Date();
                  if (scheduled <= now) {
                    enqueueSnackbar("Please select another timeframe", {
                      variant: "error",
                    });
                    return;
                  }
                }
                onSubmit({
                  file: localFile,
                  job_type: workflow.panel1Selection,
                  execution_type: workflow.updateOption,
                  schedule_at: workflow.scheduleDateTime
                    ? new Date(workflow.scheduleDateTime).toISOString()
                    : null,
                });
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <CircularProgress size={16} thickness={5} />
                </span>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CsvWorkflow;
