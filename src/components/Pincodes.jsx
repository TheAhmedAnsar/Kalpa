import React, { useEffect, useMemo, useRef, useState } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  IconButton,
  Skeleton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import apiClient from "../api/client";
import { enqueueSnackbar } from "notistack";
import JsonView from "react18-json-view";
import CustomModal from "./CustomModal";
import SearchBar from "./SearchBar";

const DEFAULT_PINCODE = "400059";

const formatParentHierarchy = (value) => {
  if (!value) return "—";
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "—";
  const [, hierarchy = trimmed] = trimmed.split(/:(.+)/);
  const parts = hierarchy
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return parts.length ? parts.join(" - ") : hierarchy;
};

const formatLatLongLabel = (lat, lng) => {
  if (lat == null || lng == null) return "—";
  const toText = (value) =>
    typeof value === "number" ? `${value}` : String(value ?? "");
  return `${toText(lat)}, ${toText(lng)}`;
};

const StatusDot = ({ active }) => (
  <span
    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
      active ? "bg-green-400" : "bg-red-400"
    }`}
  >
    <span
      className={`absolute inline-flex h-full w-full rounded-full ${
        active
          ? "animate-ping bg-green-400 opacity-75"
          : "bg-red-400 opacity-60"
      }`}
    />
  </span>
);

const Row = ({ label, value }) => (
  <div className="flex items-baseline justify-between py-1.5">
    <div className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
      {label}
    </div>
    <div className="text-right text-sm font-medium break-words text-gray-900 dark:text-gray-100">
      {value}
    </div>
  </div>
);

const CHIP_SKELETON_KEYS = ["chip-a", "chip-b", "chip-c"];

const BoxSkeleton = () => (
  <div className="space-y-6 px-2">
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={12} height={12} />
        <Skeleton variant="text" width={140} />
        <Skeleton variant="rounded" width={80} height={24} />
      </div>
      <Skeleton variant="text" width="60%" />
    </div>

    <div className="space-y-2">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="flex items-center justify-between py-1">
          <Skeleton variant="text" width={90} />
          <Skeleton variant="rounded" width={140} height={18} />
        </div>
      ))}
    </div>

    <div>
      <Skeleton variant="text" width={130} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {[...Array(2)].map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
          >
            <Skeleton variant="text" width="40%" />
            <div className="mt-2 flex flex-wrap gap-2">
              {CHIP_SKELETON_KEYS.map((chipKey) => (
                <Skeleton
                  key={`${columnIndex}-${chipKey}`}
                  variant="rounded"
                  width={70}
                  height={20}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Epoch (sec) -> IST human-readable
const fmtDateIST = (sec) => {
  if (!sec || isNaN(sec)) return "—";
  const d = new Date(Number(sec) * 1000);
  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${date}, ${time}`;
};

// Remove "store|" prefix
const cleanStore = (s) =>
  typeof s === "string" ? s.replace(/^store\|/i, "") : s;

export const Pincodes = () => {
  const [pincode, setPincode] = useState(DEFAULT_PINCODE);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reqIdRef = useRef(0);

  const [modalOpen, setModalOpen] = useState(false);

  const handleChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 6) value = value.slice(0, 6);
    setPincode(value);
    setError("");
  };

  useEffect(() => {
    if (pincode.length !== 6) return;
    const controller = new AbortController();
    const id = ++reqIdRef.current;
    setLoading(true);
    setError("");

    const fetchData = async () => {
      try {
        const res = await apiClient.post(
          "/__deku/api/v1/__jiomart/fetch/pincode",
          { pincode },
          { signal: controller.signal },
        );
        if (res?.data?.success === false) {
          const apiMessage =
            res.data.error || res.data.message || "Failed to fetch pincode.";
          enqueueSnackbar(apiMessage, { variant: "error" });
          throw new Error(apiMessage);
        }
        let data = res?.data?.data || res?.data?.result || res?.data;
        if (!data || (Array.isArray(data) && data.length === 0)) {
          if (id === reqIdRef.current)
            setError(`No record found for “${pincode}”`);
          return;
        }
        const item = Array.isArray(data) ? data[0] : data;
        if (id === reqIdRef.current) setDoc(item ?? null);
      } catch (error) {
        if (!controller.signal.aborted && id === reqIdRef.current) {
          const apiMessage =
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.message;
          if (apiMessage) {
            enqueueSnackbar(apiMessage, { variant: "error" });
          }
          setError(apiMessage || `Failed to fetch for “${pincode}”`);
        }
      } finally {
        if (id === reqIdRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    const t = setTimeout(fetchData, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [pincode]);

  const lat = doc?.lat_long?.coordinates?.[1];
  const lng = doc?.lat_long?.coordinates?.[0];
  const holidays = doc?.meta?.holidays || [];

  // Build verticals -> keep BOTH raw & cleaned store labels
  const shownVerticals = useMemo(() => {
    const v = doc?.vertical || {};
    return Object.entries(v)
      .map(([name, cfg]) => {
        const rawStores = Array.isArray(cfg?.stores) ? cfg.stores : [];
        const stores = rawStores.map(cleanStore);
        return { name, rawStores, stores };
      })
      .filter(({ stores }) => stores.length > 0);
  }, [doc?.vertical]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="w-full max-w-sm">
        <SearchBar
          value={pincode}
          onChange={handleChange}
          placeholder="Enter 6-digit pincode…"
          aria-label="Search by pincode"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          type="text"
        />
      </div>

      {loading ? (
        <BoxSkeleton />
      ) : error ? (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : (
        <div className="space-y-4 px-2">
          {/* Header with single Info button */}
          <div className="flex flex-col gap-3">
            <div className="flex w-full items-center gap-5">
              <StatusDot active={!!doc?.is_active} />
              <div className="flex w-full justify-between">
                <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {doc?.name ?? "Details"}
                </span>

                <button
                  size="small"
                  className="cursor-pointer rounded-sm bg-gray-200 px-3 py-1 text-xs font-bold hover:text-blue-500"
                  onClick={() => setModalOpen(true)}
                >
                  View Details
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <b className="text-gray-700 dark:text-gray-200">
                {formatParentHierarchy(doc?.parent_id)}
              </b>
            </div>
            {/* </Tooltip> */}
          </div>

          {/* <Row value={doc?.parent_id ?? "—"} /> */}
          <Row label="Zone" value={doc?.meta?.zone ?? "—"} />
          <Row
            label="Holidays"
            value={
              holidays.length ? (
                <div className="flex flex-wrap justify-end gap-1">
                  {holidays.map((h, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    >
                      {fmtDateIST(h)}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )
            }
          />
          <Row label="Lat / Long" value={formatLatLongLabel(lat, lng)} />

          {/* Verticals - only this section scrolls */}
          {/* Verticals - only this section scrolls */}
          <div className="space-y-2">
            <div className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Verticals & Stores
            </div>

            <div
              className="max-h-[50vh] overflow-y-auto pr-1"
              style={{
                overscrollBehavior: "contain",
                scrollbarGutter: "stable",
              }}
            >
              {shownVerticals.length ? (
                <div className="columns-1 gap-2 pr-2 [column-fill:_balance] sm:columns-2">
                  {shownVerticals.map(({ name, stores }) => (
                    <div
                      key={name}
                      /* Important for masonry: inline-block + break-inside avoid */
                      className="mb-2 inline-block w-full align-top"
                      style={{ breakInside: "avoid" }}
                    >
                      <div className="group rounded-lg border border-gray-200 bg-white/60 p-3 transition hover:bg-white hover:shadow-sm dark:border-gray-700 dark:bg-white/5 dark:hover:bg-white/10">
                        {/* TITLE ROW — prevent overflow, add tooltip */}
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <Tooltip title={name} arrow>
                              <div className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
                                {name}
                              </div>
                            </Tooltip>
                          </div>
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                            {stores.length}
                          </span>
                        </div>

                        {/* Chips: tooltip shows FULL raw store name; chip shows cleaned code */}
                        <div
                          className="max-h-32 overflow-y-auto pr-1"
                          style={{ scrollbarGutter: "stable" }}
                        >
                          <div className="flex flex-wrap gap-1">
                            {stores.map((s) => {
                              return (
                                <span className="cursor-default rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                                  {s}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No verticals.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* JSON Modal */}
      <CustomModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="sm"
      >
        <div className="flex max-h-[80vh] w-full flex-col px-4">
          {/* Fixed (sticky) header */}
          <div
            id="row-json-dialog-title"
            className="sticky top-0 z-10 border-b border-gray-200 px-4 py-3 text-2xl font-semibold dark:border-neutral-700"
          >
            Pincode Detail
          </div>

          {/* Scrollable content only */}
          <div className="flex-1 overflow-auto">
            <div className="p-4">
              <JsonView src={doc || {}} theme="pop" className="text-sm" />
            </div>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};
