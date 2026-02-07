import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Button,
  Modal,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  LinearProgress,
  Skeleton,
} from "@mui/material";
import {
  SaveAlt as DownloadIcon,
  NavigateBefore,
  NavigateNext,
  MoreVert as MoreIcon,
  NoteAdd as NoteAddIcon,
  FileDownload as FileDownloadIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useSelector } from "react-redux";
import apiClient from "../../../api/client";
import { selectUser } from "../../../store/user";
import PageLayout from "../../../components/PageLayout";
import SearchBar from "../../../components/SearchBar";

const API = {
  upsertComment: (jobId, comment) =>
    apiClient.post("/__deku/api/v1/job/comment", {
      job_id: jobId,
      comment,
    }),
  fetchMyTasks: async (userEmail) => {
    console.info(
      "[TaskStatus] fetchMyTasks placeholder called for:",
      userEmail,
    );
    return Promise.resolve({ data: [] });
  },
  deleteTask: (jobId) =>
    apiClient.post("/__deku/api/v1/job/delete", { job_id: jobId }),
};

const ROWS_PER_PAGE = 10;

const IST_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Asia/Kolkata",
  hour12: false,
});

const formatToIST = (value) => {
  if (!value || value === "-") return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return IST_FORMATTER.format(date);
};

const formatTimestamp = (value) => {
  if (!value || value === "-") return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  // Format in UTC without timezone conversion: "Dec 4, 2025, 9:31 AM"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
};

const STATUS_MAP = {
  completed: "Success",
  failed: "Failed",
  pending: "Scheduled",
  running: "Running",
  cancelled: "Cancelled",
};

const normalizeTaskRecord = (task) => {
  if (!task) return null;
  const createdByCandidate =
    task.created_by ??
    task.created_by_email ??
    task.user_email ??
    task.email ??
    null;

  return {
    id: task.id,
    createdAt: formatToIST(task.created_at),
    type: task.job_type?.type || "",
    created_by: createdByCandidate ? String(createdByCandidate) : "-",
    completed_at: task.completed_at ? formatToIST(task.completed_at) : null,
    status: STATUS_MAP[task.status] || task.status,
    scheduled_at: task.scheduled_at && formatTimestamp(task.scheduled_at),
    comment: task.comment || "",
    log_trace: task.log_trace || {},
  };
};

const normalizeTaskList = (raw) => {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(normalizeTaskRecord).filter(Boolean);
};

/* =========================================================
   CustomSelect — compact, headless
   ========================================================= */
function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  label = "Type",
  widthClass = "w-28",
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(
    Math.max(
      0,
      options.findIndex((o) => o.value === value),
    ),
  );
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) || options[0],
    [options, value],
  );

  useEffect(() => {
    const handleDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleDoc);
    return () => document.removeEventListener("mousedown", handleDoc);
  }, []);

  useEffect(() => {
    if (open) {
      const idx = Math.max(
        0,
        options.findIndex((o) => o.value === value),
      );
      setActiveIndex(idx);
      requestAnimationFrame(() => {
        const item = listRef.current?.querySelector(`[data-idx="${idx}"]`);
        item?.scrollIntoView({ block: "nearest" });
      });
    }
  }, [open, options, value]);

  const onKeyDown = (e) => {
    if (
      !open &&
      (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) {
        onChange?.(opt.value);
        setOpen(false);
        btnRef.current?.focus();
      }
    }
  };

  return (
    <div ref={rootRef} className={`relative ${widthClass} ${className}`}>
      <div className="mb-1 pl-1 text-xs font-medium text-gray-600 dark:text-gray-300">
        {label}
      </div>

      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-md border border-transparent bg-white pr-8 pl-3 text-left text-sm text-gray-800 outline-1 outline-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-[#1f1f1f] dark:text-white"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected?.label ?? ""}
        <svg
          className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 text-gray-400 dark:text-gray-300"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#1f1f1f]"
          onKeyDown={onKeyDown}
        >
          {options.map((opt, idx) => {
            const isActive = idx === activeIndex;
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                data-idx={idx}
                role="option"
                aria-selected={isSelected}
                className={`flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-white"
                    : "text-gray-800 dark:text-gray-200"
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                  btnRef.current?.focus();
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <span className="text-blue-600 dark:text-white">●</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Page Component
   ========================================================= */
const TaskStatus = () => {
  const { enqueueSnackbar } = useSnackbar();
  const user = useSelector(selectUser);
  const userEmail = user?.user_email;
  const [tasks, setTasks] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  // Status filter (All / Success / Failed / Scheduled / Running)
  const [statusFilter, setStatusFilter] = useState("all");
  const [showMyTasks, setShowMyTasks] = useState(false);

  const [menuAnchors, setMenuAnchors] = useState({}); // {taskId: anchorEl}
  const [commentModal, setCommentModal] = useState({
    open: false,
    taskId: null,
    text: "",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cancelModal, setCancelModal] = useState({
    open: false,
    task: null,
  });

  const fetchMyTasksFromApi = useCallback(async () => {
    if (!userEmail) return;
    try {
      const response = await API.fetchMyTasks(userEmail);
      console.info("[TaskStatus] Placeholder my tasks response:", response);
    } catch (error) {
      console.warn("[TaskStatus] fetchMyTasks placeholder failed:", error);
    }
  }, [userEmail]);

  const fetchTasks = useCallback(async () => {
    const typeParam =
      statusFilter === "all"
        ? "all"
        : statusFilter === "pending"
          ? "pending"
          : statusFilter === "completed"
            ? "completed"
            : statusFilter === "failed"
              ? "failed"
              : statusFilter === "running"
                ? "running"
                : statusFilter === "cancelled"
                  ? "cancelled"
                  : "all";
    setIsLoading(true);
    setErrorMsg("");

    try {
      const reqBody = {
        type: typeParam,
        limit: ROWS_PER_PAGE,
        offset: page,
      };
      if (showMyTasks && userEmail) {
        reqBody.user_email = userEmail;
      }
      console.log({ reqBody });
      const res = await apiClient.post(`__deku/api/v1/job/fetch`, reqBody);
      const data = res.data?.data ?? res.data;
      setTasks(normalizeTaskList(data));
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      const message = err.message || "Failed to fetch jobs";
      setErrorMsg(message);
      enqueueSnackbar(message, {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [enqueueSnackbar, page, showMyTasks, statusFilter, userEmail]);

  const searchTaskById = useCallback(async () => {
    const query = debouncedSearch.trim();
    if (!query) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await apiClient.post(`/__deku/api/v1/job/search`, {
        job_id: query,
      });
      const data = res.data?.data ?? res.data;
      setTasks(normalizeTaskList(data));
    } catch (err) {
      console.error("Failed to search jobs:", err);
      const status = err?.response?.status;
      if (status === 404) {
        setTasks([]);
        enqueueSnackbar("No task found with the provided ID", {
          variant: "warning",
        });
      } else {
        const message = err.message || "Failed to search tasks";
        setTasks([]);
        setErrorMsg(message);
        enqueueSnackbar(message, {
          variant: "error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, enqueueSnackbar]);

  const refreshTasks = useCallback(async () => {
    if (debouncedSearch.trim()) {
      await searchTaskById();
    } else {
      await fetchTasks();
    }
  }, [debouncedSearch, fetchTasks, searchTaskById]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchValue);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchValue]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  useEffect(() => {
    setPage(0);
    if (showMyTasks) {
      fetchMyTasksFromApi();
    }
  }, [showMyTasks, fetchMyTasksFromApi]);

  const filteredTasks = useMemo(() => {
    let list = tasks;

    if (showMyTasks && userEmail) {
      const normalizedEmail = userEmail.toLowerCase();
      list = list.filter((task) => {
        if (typeof task.created_by !== "string") return false;
        return task.created_by.toLowerCase() === normalizedEmail;
      });
    }

    return list;
  }, [showMyTasks, tasks, userEmail]);

  const pageCount = page + (filteredTasks.length === ROWS_PER_PAGE ? 2 : 1);
  const start = page * ROWS_PER_PAGE;
  const paged = filteredTasks;

  const handleOpenMenu = (taskId, anchorEl) => {
    setMenuAnchors((prev) => ({ ...prev, [taskId]: anchorEl }));
  };
  const handleCloseMenu = (taskId) =>
    setMenuAnchors((prev) => ({ ...prev, [taskId]: null }));

  const handleDownload = (format, task) => {
    const address =
      format === "csv"
        ? task.log_trace?.csv_address
        : task.log_trace?.json_address;

    if (!address) {
      enqueueSnackbar("No file available to download", { variant: "warning" });
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = address;
      link.target = "_blank";
      link.setAttribute("download", `${task.id}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      enqueueSnackbar("Download started", { variant: "info" });
    } catch (e) {
      console.error(e);
      enqueueSnackbar("Failed to open download link", { variant: "error" });
    }
  };

  const handleCancelTask = async () => {
    if (!cancelModal.task) return;

    try {
      await API.deleteTask(cancelModal.task.id);
      // Update task status to Cancelled
      setTasks((prev) =>
        prev.map((t) =>
          t.id === cancelModal.task.id ? { ...t, status: "Cancelled" } : t,
        ),
      );
      enqueueSnackbar("Task cancelled successfully", { variant: "success" });
      setCancelModal({ open: false, task: null });
    } catch (e) {
      console.error(e);
      enqueueSnackbar(e.message || "Failed to cancel task", {
        variant: "error",
      });
    }
  };

  const openCommentModal = (task) => {
    setErrorMsg("");
    setCommentModal({ open: true, taskId: task.id, text: task.comment || "" });
  };

  const statusPillClass = (status) => {
    const base =
      "inline-flex w-20 items-center justify-center rounded px-3 py-1.5 text-xs font-medium ring-1";
    switch (status) {
      case "Success":
        return `${base} bg-green-500/10 text-green-700 ring-green-500/30 dark:text-green-400`;
      case "Failed":
        return `${base} bg-red-500/10 text-red-700 ring-red-500/30 dark:text-red-400`;
      case "Scheduled": // ⬅️ yellow
        return `${base} bg-amber-400/10 text-amber-700 ring-amber-500/30 dark:text-amber-400`;
      case "Running":
        return `${base} bg-sky-400/10 text-sky-700 ring-sky-500/30 dark:text-sky-300`;
      default:
        return `${base} bg-gray-400/10 text-gray-700 ring-gray-400/30 dark:text-gray-300`;
    }
  };

  const getTimingMessage = (task) => {
    if (!task) return "Timing information not available.";

    if (task.status === "Running") {
      return "Timing information will be available once the task finishes.";
    }

    if (task.status === "Scheduled") {
      return task.scheduled_at
        ? `Scheduled for ${task.scheduled_at}`
        : "Scheduled time not available yet.";
    }

    if (task.status === "Success" || task.status === "Failed") {
      if (task.completed_at) {
        return `Completed at ${task.completed_at}`;
      }
      if (task.scheduled_at) {
        return `Scheduled for ${task.scheduled_at}`;
      }
      return "Completion time not available.";
    }

    if (task.completed_at) {
      return `Completed at ${task.completed_at}`;
    }
    if (task.scheduled_at) {
      return `Scheduled for ${task.scheduled_at}`;
    }

    return "Timing information not available.";
  };

  const TaskToggleButton = ({ active, onToggle }) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onToggle(!active)}
      className={`h-10 w-20 cursor-pointer rounded-md px-2 text-xs font-medium transition duration-300 ease-in-out sm:w-22 ${
        active
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      }`}
      title={!active ? "Showing My Tasks" : "Showing All Tasks"}
    >
      {!active ? "My Tasks" : "All Tasks"}
    </button>
  );

  // Skeleton rows for loading state
  const TableSkeletonRows = () => (
    <>
      {Array.from({ length: ROWS_PER_PAGE }).map((_, i) => (
        <tr
          key={`sk-${i}`}
          className={
            i % 2 === 0
              ? "dark:bg-secondary-dark/70 bg-gray-50"
              : "dark:bg-secondary-dark bg-white"
          }
        >
          {Array.from({ length: 7 }).map((__, j) => (
            <td
              key={`sk-${i}-${j}`}
              className="border-b border-gray-200 px-4 py-3 dark:border-white/10"
            >
              <Skeleton variant="text" height={30} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  return (
    <PageLayout
      title="Task Status"
      headerContent={
        errorMsg && (
          <div className="rounded-md bg-red-50 px-3 py-1 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30">
            {errorMsg}
          </div>
        )
      }
      contentClassName="flex flex-1 flex-col"
    >
      <div className="mb-4">
        <div className="flex flex-wrap items-end gap-2 rounded-md sm:gap-3">
          {/* Search input */}
          <div className="w-full sm:w-64 lg:w-1/3">
            <SearchBar
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by Task ID"
              aria-label="Search by Task ID"
              size="sm"
            />
          </div>

          <div className="ml-auto flex items-end gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <TaskToggleButton
                active={showMyTasks}
                onToggle={(val) => {
                  setShowMyTasks(val);
                  setIsLoading(true);
                }}
              />
            </div>

            {/* Rightmost: Status filter */}
            <CustomSelect
              label="Status"
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setIsLoading(true);
              }}
              widthClass="w-32 sm:w-36 lg:w-40"
              options={[
                { value: "all", label: "All" },
                { value: "completed", label: "Success" },
                { value: "failed", label: "Failed" },
                { value: "pending", label: "Scheduled" },
              ]}
            />
          </div>
        </div>
      </div>

      <Box className="flex-1 overflow-hidden text-sm">
        <div className="dark:bg-secondary-dark w-full overflow-hidden rounded-lg bg-white text-gray-900 shadow ring-1 ring-black/5 dark:text-gray-100 dark:ring-white/10">
          {isLoading && <LinearProgress />}

          <div className="relative max-h-[65vh] overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="dark:bg-primary-dark sticky top-0 z-10 bg-gray-100">
                <tr>
                  {[
                    "Task ID",
                    "Created At",
                    "Type",
                    "Created By",
                    "Status",
                    "Comment",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="border-b border-gray-200 px-4 py-3 text-left font-semibold whitespace-nowrap dark:border-white/10 dark:text-white/90"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <TableSkeletonRows />
                ) : (
                  <>
                    {paged.map((task, idx) => {
                      const zebra =
                        (start + idx) % 2 === 0
                          ? "bg-gray-50 dark:bg-secondary-dark/70"
                          : "bg-white dark:bg-secondary-dark";
                      const anchorEl = menuAnchors[task.id] || null;

                      const isScheduled = task.status === "Scheduled";
                      const isRunning = task.status === "Running";
                      const isCancelled = task.status === "Cancelled";
                      const timingMessage = getTimingMessage(task);

                      const statusNode =
                        task.status === "Scheduled" ? (
                          <Tooltip
                            title={
                              task.scheduled_at
                                ? `Scheduled at ${task.scheduled_at}`
                                : "Scheduled"
                            }
                            arrow
                          >
                            <span className={statusPillClass(task.status)}>
                              {task.status}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className={statusPillClass(task.status)}>
                            {task.status}
                          </span>
                        );

                      return (
                        <tr key={task.id} className={zebra}>
                          <td className="border-b border-gray-200 px-3 py-3 dark:border-white/10">
                            {task.id}
                          </td>
                          <td className="border-b border-gray-200 px-3 py-3 dark:border-white/10">
                            {task.createdAt}
                          </td>
                          <td className="border-b border-gray-200 px-3 py-3 dark:border-white/10">
                            {task.type}
                          </td>
                          <td className="border-b border-gray-200 px-3 py-3 dark:border-white/10">
                            {task.created_by}
                          </td>
                          <td className="border-b border-gray-200 px-3 py-3 dark:border-white/10">
                            {statusNode}
                          </td>

                          {/* Comment column */}
                          <td className="border-b border-gray-200 px-3 py-3 dark:border-white/10">
                            {task.comment ? (
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => openCommentModal(task)}
                                startIcon={<NoteAddIcon fontSize="small" />}
                                className="normal-case"
                                sx={{
                                  textTransform: "none",
                                }}
                              >
                                View comment
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => openCommentModal(task)}
                                startIcon={<NoteAddIcon />}
                                className="normal-case"
                                sx={{
                                  textTransform: "none",
                                  borderColor: "rgba(0,0,0,0.2)",
                                  "html.dark &": {
                                    borderColor: "rgba(255,255,255,0.2)",
                                    color: "#e5e7eb",
                                  },
                                  "&:hover": {
                                    borderColor: "rgba(0,0,0,0.35)",
                                    "html.dark &": {
                                      borderColor: "rgba(255,255,255,0.35)",
                                    },
                                  },
                                }}
                              >
                                Add comment
                              </Button>
                            )}
                          </td>

                          {/* Actions (kebab) */}
                          <td className="border-b border-gray-200 px-2 py-1 dark:border-white/10">
                            <div className="flex items-center justify-end gap-2">
                              <Tooltip
                                title={timingMessage}
                                arrow
                                enterDelay={200}
                                enterNextDelay={200}
                                slotProps={{
                                  tooltip: {
                                    sx: {
                                      fontSize: "0.7rem",
                                      px: 1.5,
                                      py: 0.75,
                                      whiteSpace: "nowrap",
                                      backgroundColor: (theme) =>
                                        theme.palette.mode === "dark"
                                          ? "rgba(15,23,42,0.92)"
                                          : "#111827",
                                      color: "#f9fafb",
                                      boxShadow: (theme) =>
                                        theme.palette.mode === "dark"
                                          ? "0px 12px 30px rgba(15, 23, 42, 0.5)"
                                          : "0px 12px 30px rgba(15, 23, 42, 0.25)",
                                    },
                                  },
                                  arrow: {
                                    sx: {
                                      color: (theme) =>
                                        theme.palette.mode === "dark"
                                          ? "rgba(15,23,42,0.92)"
                                          : "#111827",
                                    },
                                  },
                                }}
                              >
                                <span>
                                  <IconButton
                                    aria-label="View task timing"
                                    size="small"
                                    color="inherit"
                                    className="border border-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10"
                                    disabled={isRunning}
                                  >
                                    <AccessTimeIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <IconButton
                                aria-label="Actions"
                                size="small"
                                color="inherit"
                                className="border border-gray-300 dark:border-white/10"
                                onClick={(e) =>
                                  handleOpenMenu(task.id, e.currentTarget)
                                }
                              >
                                <MoreIcon fontSize="small" />
                              </IconButton>
                            </div>

                            <Menu
                              anchorEl={anchorEl}
                              open={Boolean(anchorEl)}
                              onClose={() => handleCloseMenu(task.id)}
                              anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "left",
                              }}
                              transformOrigin={{
                                vertical: "top",
                                horizontal: "left",
                              }}
                              MenuListProps={{ dense: true }}
                              slotProps={{
                                paper: {
                                  sx: {
                                    minWidth: 200,
                                    py: 0.5,
                                    "html.dark &": {
                                      borderColor: "rgba(255,255,255,0.1)",
                                    },
                                  },
                                  elevation: 3,
                                },
                              }}
                              sx={{
                                "& .MuiMenuItem-root": {
                                  fontSize: "0.85rem",
                                  py: 0.5,
                                },
                              }}
                            >
                              {/* SCHEDULED → allow cancel or delete */}
                              {isScheduled ? (
                                <>
                                  <MenuItem
                                    onClick={() => {
                                      handleCloseMenu(task.id);
                                      setCancelModal({ open: true, task });
                                    }}
                                  >
                                    <CancelIcon
                                      fontSize="small"
                                      style={{ marginRight: 8 }}
                                    />
                                    Cancel task
                                  </MenuItem>
                                  {/* <MenuItem
                                    onClick={() => {
                                      handleCloseMenu(task.id);
                                      handleDeleteTask(task);
                                    }}
                                  >
                                    <DeleteIcon
                                      fontSize="small"
                                      style={{ marginRight: 8 }}
                                    />
                                    Delete task
                                  </MenuItem> */}
                                </>
                              ) : isRunning ? (
                                // RUNNING → show disabled downloads
                                <>
                                  <MenuItem disabled>
                                    <FileDownloadIcon
                                      fontSize="small"
                                      style={{ marginRight: 8 }}
                                    />
                                    Download CSV
                                  </MenuItem>
                                  <MenuItem disabled>
                                    <DownloadIcon
                                      fontSize="small"
                                      style={{ marginRight: 8 }}
                                    />
                                    Download JSON
                                  </MenuItem>
                                </>
                              ) : isCancelled ? (
                                // CANCELLED → downloads disabled
                                <>
                                  <MenuItem disabled>
                                    <FileDownloadIcon
                                      fontSize="small"
                                      style={{ marginRight: 8 }}
                                    />
                                    Download CSV
                                  </MenuItem>
                                  <MenuItem disabled>
                                    <DownloadIcon
                                      fontSize="small"
                                      style={{ marginRight: 8 }}
                                    />
                                    Download JSON
                                  </MenuItem>
                                </>
                              ) : (
                                // SUCCESS / FAILED → downloads enabled
                                <>
                                  <MenuItem
                                    onClick={() => {
                                      handleCloseMenu(task.id);
                                      handleDownload("csv", task);
                                    }}
                                  >
                                    <FileDownloadIcon
                                      fontSize="small"
                                      style={{ marginRight: 8 }}
                                    />
                                    Download CSV
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() => {
                                      handleCloseMenu(task.id);
                                      handleDownload("json", task);
                                    }}
                                  >
                                    <DownloadIcon
                                      fontSize="small"
                                      style={{ marginRight: 8 }}
                                    />
                                    Download JSON
                                  </MenuItem>
                                </>
                              )}
                            </Menu>
                          </td>
                        </tr>
                      );
                    })}

                    {paged.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-gray-600 dark:text-gray-300"
                        >
                          No matching tasks found.
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-gray-200 px-3 py-2 text-sm dark:border-white/10">
            <div className="text-gray-600 dark:text-gray-300">
              {filteredTasks.length > 0
                ? `${start + 1}–${start + filteredTasks.length}`
                : "0 of 0"}
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                aria-label="Previous page"
                onClick={() => {
                  setIsLoading(true); // show loading while page changes
                  setPage((p) => Math.max(0, p - 1));
                }}
                disabled={page === 0}
                size="small"
                color="inherit"
                className="border border-gray-300 disabled:opacity-50 dark:border-white/10"
              >
                <NavigateBefore fontSize="small" />
              </IconButton>
              <div className="min-w-16 text-center text-gray-600 dark:text-gray-300">
                {page + 1} / {pageCount}
              </div>
              <IconButton
                aria-label="Next page"
                onClick={() => {
                  setIsLoading(true); // show loading while page changes
                  setPage((p) => Math.min(pageCount - 1, p + 1));
                }}
                disabled={page >= pageCount - 1}
                size="small"
                color="inherit"
                className="border border-gray-300 disabled:opacity-50 dark:border-white/10"
              >
                <NavigateNext fontSize="small" />
              </IconButton>
            </div>
          </div>
        </div>
      </Box>

      {/* Comment Modal */}
      <Modal
        open={commentModal.open}
        onClose={() => setCommentModal({ open: false, taskId: null, text: "" })}
        aria-labelledby="comment-title"
        aria-describedby="comment-description"
      >
        <Box className="dark:bg-secondary-dark absolute top-1/2 left-1/2 w-[90%] max-w-xl -translate-x-1/2 -translate-y-1/2 transform rounded-xl bg-white p-6 text-gray-900 shadow-lg ring-1 ring-black/5 dark:text-gray-100 dark:ring-white/10">
          <Typography variant="h6" className="mb-4" id="comment-title">
            {commentModal.taskId
              ? `Comment for ${commentModal.taskId}`
              : "Comment"}
          </Typography>

          <div className="mt-2 space-y-2">
            <textarea
              id="comment-input"
              value={commentModal.text}
              onChange={(e) =>
                setCommentModal((s) => ({ ...s, text: e.target.value }))
              }
              placeholder="Write a short note about this task…"
              className="block w-full resize-y rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/20 dark:bg-[#1f1f1f] dark:text-white dark:placeholder-white/90"
              rows={6}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            {saving ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Saving…
              </span>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                variant="text"
                onClick={() =>
                  setCommentModal({ open: false, taskId: null, text: "" })
                }
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button
                variant="outlined"
                onClick={async () => {
                  setSaving(true);
                  setErrorMsg("");
                  try {
                    await API.upsertComment(
                      commentModal.taskId,
                      commentModal.text.trim(),
                    );
                    await refreshTasks();
                    setCommentModal({ open: false, taskId: null, text: "" });
                    enqueueSnackbar("Comment saved", { variant: "success" });
                  } catch (e) {
                    setErrorMsg(e.message || "Failed to save comment");
                    enqueueSnackbar(e.message || "Failed to save comment", {
                      variant: "error",
                    });
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                sx={{
                  textTransform: "none",
                  borderColor: "rgba(0,0,0,0.2)",
                  "html.dark &": {
                    borderColor: "rgba(255,255,255,0.25)",
                    color: "#e5e7eb",
                  },
                  "&:hover": {
                    borderColor: "rgba(0,0,0,0.35)",
                    "html.dark &": { borderColor: "rgba(255,255,255,0.35)" },
                  },
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </Box>
      </Modal>

      {/* Cancel Task Confirmation Modal */}
      <Modal
        open={cancelModal.open}
        onClose={() => setCancelModal({ open: false, task: null })}
        aria-labelledby="cancel-task-title"
      >
        <Box className="dark:bg-secondary-dark absolute top-1/2 left-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-xl bg-white p-6 text-gray-900 shadow-lg ring-1 ring-black/5 dark:text-gray-100 dark:ring-white/10">
          <Typography variant="h6" className="mb-4" id="cancel-task-title">
            Cancel Task
          </Typography>

          <Typography className="mb-6 text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to cancel task{" "}
            <span className="font-mono font-semibold text-gray-900 dark:text-white">
              {cancelModal.task?.id}
            </span>
            ? This action cannot be undone.
          </Typography>

          <div className="flex justify-end gap-2">
            <Button
              variant="text"
              onClick={() => setCancelModal({ open: false, task: null })}
              sx={{ textTransform: "none" }}
            >
              No, Keep it
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleCancelTask}
              sx={{ textTransform: "none" }}
            >
              Yes, Cancel Task
            </Button>
          </div>
        </Box>
      </Modal>
    </PageLayout>
  );
};

export default TaskStatus;
