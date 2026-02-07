import React, { useEffect, useMemo, useRef, useState } from "react";
import { Divider, IconButton, Tooltip, Drawer, Skeleton } from "@mui/material";
import AddBusinessOutlinedIcon from "@mui/icons-material/AddBusinessOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";
import CustomModal from "../../../components/CustomModal";
import AddStore from "../components/Stores/AddStore";
import apiClient from "../../../api/client";
import PinDropOutlinedIcon from "@mui/icons-material/PinDropOutlined";
import { Pincodes } from "../../../components/Pincodes";
import PageLayout from "../../../components/PageLayout";
import SearchBar from "../../../components/SearchBar";
import { enqueueSnackbar } from "notistack";

const StatusDot = ({ active }) => (
  <span
    className={`relative inline-flex h-3 w-3 rounded-full ${
      active ? "bg-green-400" : "bg-red-400"
    }`}
  >
    <span
      className={`absolute inline-flex h-full w-full rounded-full ${
        active
          ? "animate-ping bg-green-400 opacity-75"
          : "bg-red-400 opacity-75"
      }`}
    />
  </span>
);

const InfoCell = ({ label, value }) => (
  <div className="col-span-12 sm:col-span-6 lg:col-span-3">
    <div className="text-[11px] tracking-wide text-gray-500 uppercase dark:text-gray-400">
      {label}
    </div>
    <div className="mt-1 truncate text-sm font-medium text-gray-900 dark:text-white">
      {value}
    </div>
  </div>
);

const StoreCardSkeleton = () => (
  <div className="relative rounded-md border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-700 dark:bg-[#1b1b1b]">
    <div className="flex items-center gap-2 pb-3">
      <Skeleton variant="circular" width={12} height={12} />
      <Skeleton variant="rounded" width={80} height={24} />
      <Skeleton
        variant="rounded"
        width={120}
        height={24}
        style={{ marginLeft: 4 }}
      />
      <div className="ml-auto">
        <Skeleton variant="rounded" width={140} height={20} />
      </div>
    </div>
    <div className="grid grid-cols-12 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Skeleton variant="text" width={70 + i * 5} />
          <div className="flex items-center justify-between">
            <Skeleton variant="rounded" height={24} width="70%" />
            {i === 3 ? (
              <Skeleton variant="circular" width={28} height={28} />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const FyndStores = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true); // start loading to avoid flash
  const [error, setError] = useState(null);

  // search state
  const [query, setQuery] = useState("");
  const [openAddStore, setOpenAddStore] = useState(false);

  // Update Stores sidebar
  const [updateOpen, setUpdateOpen] = useState(false);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    const fetchStores = async () => {
      const id = ++requestIdRef.current;
      try {
        const q = query.trim().toUpperCase();
        const res = q
          ? await apiClient.post(
              "/__deku/api/v1/__jiomart/search/store",
              { store_name: q },
              { signal: controller.signal },
            )
          : await apiClient.get("/__deku/api/v1/__jiomart/store/latest", {
              signal: controller.signal,
            });

        if (res?.data?.success === false) {
          const apiMessage =
            res.data.error || res.data.message || "Failed to fetch stores.";
          enqueueSnackbar(apiMessage, { variant: "error" });
          throw new Error(apiMessage);
        }

        let data;
        if (res && res.data) {
          if (res.data.data !== undefined) data = res.data.data;
          else if (res.data.stores !== undefined) data = res.data.stores;
          else if (res.data.results !== undefined) data = res.data.results;
          else if (Array.isArray(res.data)) data = res.data;
          else data = res.data;
        } else {
          data = [];
        }

        const finalData = Array.isArray(data)
          ? data
          : data && typeof data === "object"
            ? [data]
            : [];

        if (id === requestIdRef.current) setRows(finalData);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch stores:", err);
          if (requestIdRef.current) {
            const apiMessage =
              err?.response?.data?.error ||
              err?.response?.data?.message ||
              err?.message ||
              "Something went wrong";
            enqueueSnackbar(apiMessage, { variant: "error" });
            setError(apiMessage);
            setRows([]);
          }
        }
      } finally {
        if (id === requestIdRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(fetchStores, 300); // debounce

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const handleAddStore = () => setOpenAddStore((old) => !old);
  const openUpdate = () => setUpdateOpen(true);
  const closeUpdate = () => setUpdateOpen(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const openInfo = (row) => {
    setSelectedRow(row);
    setDialogOpen(true);
  };
  const closeInfo = () => setDialogOpen(false);

  const filtered = useMemo(() => rows, [rows]);

  const formatStoreCode = (code) => {
    if (!code) return "";
    return code.includes("|") ? code.split("|")[1] : code;
  };

  return (
    <PageLayout title="Fynd Stores" contentClassName="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 py-3">
        {/* Search + Actions */}
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm sm:flex-1">
            <SearchBar
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Store..."
              aria-label="Search stores"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pr-3">
            <button
              onClick={handleAddStore}
              className="flex cursor-pointer items-center gap-1 rounded-md border border-black/20 px-4 py-2 text-sm text-gray-800 transition-colors hover:border-black/40 active:border-black/60 dark:border-white/30 dark:text-gray-200 dark:hover:border-white/50"
            >
              <AddBusinessOutlinedIcon size="small" /> Add Store
            </button>

            <button
              onClick={openUpdate}
              className="flex cursor-pointer items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              {" "}
              <PinDropOutlinedIcon size="small" />
              Pincodes
            </button>
          </div>
        </div>

        {/* Content */}
        <section className="flex flex-col">
          <div
            className="flex-1 overflow-y-auto pr-3"
            style={{ maxHeight: "calc(100vh - 230px)" }}
          >
            {loading ? (
              // Skeletons while loading
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <StoreCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-md px-4 py-10 text-center text-red-500">
                Error: {error}
              </div>
            ) : filtered.length === 0 ? (
              // Improved empty state
              <div className="text-md px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                {query.trim() ? (
                  <>
                    No stores found for{" "}
                    <b className="text-gray-700 dark:text-gray-200">
                      “{query.trim()}”
                    </b>
                  </>
                ) : (
                  "No stores to show"
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((row) => (
                  <div
                    key={
                      row?.uid ||
                      `${row?.meta?.store_id ?? "unknown"}-${row?.pincode ?? "na"}-${
                        row?.address?.city ?? "na"
                      }`
                    }
                    className="group relative flex items-start gap-3 rounded-md border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md dark:border-gray-700 dark:bg-[#1b1b1b] dark:shadow-gray-800"
                  >
                    {/* Left content */}
                    <div className="flex-1">
                      {/* Top strip: compact identifiers */}
                      <div className="flex items-center gap-2 pb-3">
                        <StatusDot active={!!row?.is_active} />
                        <span className="rounded-md bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700 dark:bg-white/5 dark:text-gray-200">
                          {formatStoreCode(row?.meta?.store_id)}
                        </span>

                        {row?.meta?.jio_sale_point === "RRL_STORE" ? (
                          <img
                            src="/assets/reliance_retail.png"
                            alt="Reliance Retail"
                            className="h-7 w-auto object-contain align-middle"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                            {row?.meta?.seller_name || "Unknown"}
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>
                            Store Cutoff:{" "}
                            {(() => {
                              const hour = row?.meta?.cutoff_time?.hour ?? 0;
                              const minute =
                                row?.meta?.cutoff_time?.minute ?? 0;
                              const isDefaultCutoff =
                                hour === 0 &&
                                minute === 0 &&
                                row?.meta?.jio_sale_point !== "RRL_STORE";
                              const cutoffDisplay = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} Hrs`;
                              return (
                                <>
                                  <b className="text-gray-700 dark:text-gray-200">
                                    {cutoffDisplay}
                                  </b>
                                  {isDefaultCutoff && (
                                    <span className="dark:text-gray-black ml-2 rounded-sm bg-orange-100 px-3 py-[3px] text-[11px] font-semibold text-black dark:bg-orange-700 dark:text-white">
                                      Default 3:00 Hrs
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Grid with inline info button on the right of Lat/Long */}
                      <div className="grid grid-cols-12 items-center gap-3">
                        <InfoCell
                          label="City"
                          value={row?.address?.city || "N/A"}
                        />
                        <InfoCell
                          label="Pincodes"
                          value={row?.pincode || "N/A"}
                        />
                        <InfoCell
                          label="TAT"
                          value={
                            row?.tat
                              ? `Min ${(row.tat.min ?? 0) / 86400} - Max ${(row.tat.max ?? 0) / 86400} Days`
                              : "N/A"
                          }
                        />

                        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                          <div className="text-[11px] tracking-wide text-gray-500 uppercase dark:text-gray-400">
                            Lat / Long
                          </div>
                          <div className="mt-1 flex items-center justify-between text-sm font-medium text-gray-900 dark:text-white">
                            <span>
                              {Number(row?.lat_long?.coordinates?.[1]).toFixed(
                                3,
                              ) ?? "—"}
                              {"  "} {"|"}
                              {"  "}
                              {Number(row?.lat_long?.coordinates?.[0]).toFixed(
                                3,
                              ) ?? "—"}
                            </span>
                            {/* <Tooltip title="View full JSON" arrow> */}
                            <button
                              aria-label="view row json"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                openInfo(row);
                              }}
                              className="cursor-pointer rounded-md bg-blue-50 px-3 py-1 text-xs text-black"
                            >
                              {/* <InfoOutlinedIcon
                                  fontSize="medium"
                                  className="hover:text-blue-600 dark:text-white"
                                /> */}
                              View Details
                            </button>
                            {/* </Tooltip> */}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* JSON Dialog */}
      <CustomModal
        open={dialogOpen}
        onClose={closeInfo}
        size="sm"
        aria-labelledby="row-json-dialog-title"
      >
        <div className="flex max-h-[80vh] w-full flex-col px-4">
          {/* Fixed (sticky) header */}
          <div
            id="row-json-dialog-title"
            className="sticky top-0 z-10 border-b border-gray-200 px-4 py-3 text-2xl font-semibold dark:border-neutral-700"
          >
            Store Detail
          </div>

          {/* Scrollable content only */}
          <div className="flex-1 overflow-auto">
            <div className="p-2">
              <JsonView src={selectedRow} theme="pop" className="text-sm" />
            </div>
          </div>
        </div>
      </CustomModal>

      {/* Add Store Modal */}
      <CustomModal
        onClose={() => setOpenAddStore(false)}
        open={openAddStore}
        size={"sm"}
      >
        <AddStore onClose={() => setOpenAddStore(false)} />
      </CustomModal>

      {/* Update Stores Sidebar (right Drawer) */}
      <Drawer
        anchor="right"
        open={updateOpen}
        onClose={closeUpdate}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 420 },
              borderColor: "divider",
            },
          },
        }}
      >
        <section className="dark:bg-primary-dark h-full w-full py-3">
          <div className="font-fynd flex h-16 items-center justify-between px-5 text-2xl dark:text-white">
            <span>Pincodes</span>
            <IconButton
              aria-label="Close pincode sidebar"
              onClick={closeUpdate}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
          <Divider className="!mx-4 !mb-4 !bg-gray-300 dark:!bg-gray-700" />
          <div className="px-5">
            <Pincodes />
          </div>
        </section>
      </Drawer>
    </PageLayout>
  );
};

export default FyndStores;
