import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CustomModal from "../../../../components/CustomModal";
import CsvPreviewTable from "../../../../components/CsvPreviewTable";
import CustomDropdown from "../../../../components/CustomDropdown";
import Papa from "papaparse";
import apiClient from "../../../../api/client";
import { VERTICAL_OPTIONS } from "../../../../constants/verticals";

const STORE_FORMAT_OPTIONS = [
  "1PRFC",
  "DIGITAL",
  "SMARTPOINT",
  "SMART",
  "SMARTBAZAR",
  "SMARTNET",
  "TRENDS",
];
const ENTITY_TYPE_OPTIONS = ["STORE", "FC", "1PRFC"];
const SALE_POINT_OPTIONS = ["RRL_STORE"];

async function uploadStoresCsvApi(file, defaults = {}) {
  try {
    const task_type = {
      type: "store",
      sub_type: "create",
    };
    const fd = new FormData();
    fd.append("file", file);
    fd.append("execution_type", "now");
    fd.append("username", "aakash");
    fd.append("user_email", "aakashmisra@gofynd.com");
    fd.append("job_type", JSON.stringify(task_type));
    fd.append("verticals", JSON.stringify(defaults.verticals));

    console.log(defaults.verticals);

    const reader = new FileReader();
    reader.onload = function (event) {
      const text = event.target.result;
      console.log(text);
    };
    reader.readAsText(file);

    const res = await apiClient.post("/__deku/api/v1/job/create", fd);
    console.log(res);
    if (!res.data.success) throw new Error(`HTTP ${res.status}`);
    const taskId = res.data.task_id;
    return { ok: true, taskId };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e?.message || "Unknown error" };
  }
}

const CSV_COLUMN_LABELS = [
  "store_code",
  "pincode",
  "latitude",
  "longitude",
  "jio_store_type",
  "fynd_store_type",
  "jio_sale_point",
  "business_unit",
];

const toCsvRow = (arr) =>
  arr
    .map((val) => {
      const s = String(val ?? "");
      const needsQuotes = /[",\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    })
    .join(",");

function buildSampleCsvContent() {
  const header = toCsvRow(CSV_COLUMN_LABELS);
  const sampleRow = toCsvRow([
    "SAMPLE_STORE_CODE",
    "400001",
    "19.0760",
    "72.8777",
    "SMART",
    "STORE",
    "RRL_STORE",
    "",
  ]);
  return `${header}\n${sampleRow}\n`;
}

function downloadSampleCsv() {
  const blob = new Blob([buildSampleCsvContent()], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "store_sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function fileToText(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsText(file);
  });
}

async function stripFirstColumnFromFile(file) {
  const text = await fileToText(file);

  try {
    const parsed = Papa.parse(text, {
      skipEmptyLines: false,
    });

    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    if (!rows.length) {
      return file;
    }

    const expectedColumns = CSV_COLUMN_LABELS.length;
    const normalizeCell = (value) =>
      value == null ? "" : String(value).trim();

    const meaningfulRows = rows.filter(
      (row) =>
        Array.isArray(row) && row.some((cell) => normalizeCell(cell) !== ""),
    );

    if (!meaningfulRows.length) {
      return file;
    }

    const headerRow = meaningfulRows[0];
    const normalizedHeader = headerRow.map((cell) =>
      normalizeCell(cell).toLowerCase(),
    );
    const expectedHeader = CSV_COLUMN_LABELS.map((label) =>
      label.toLowerCase(),
    );

    let shouldStrip = false;

    if (normalizedHeader.length === expectedColumns + 1) {
      const withoutFirst = normalizedHeader.slice(1);
      if (
        withoutFirst.length === expectedHeader.length &&
        withoutFirst.every((cell, idx) => cell === expectedHeader[idx])
      ) {
        shouldStrip = true;
      }
    }

    if (!shouldStrip) {
      const dataRows = meaningfulRows.slice(1);
      const extraColumnRow = dataRows.find((row) => {
        if (!Array.isArray(row)) return false;
        const normalizedRow = row.map(normalizeCell);
        if (!normalizedRow.some((cell) => cell !== "")) return false;
        if (normalizedRow.length !== expectedColumns + 1) return false;
        const leading = normalizedRow[0];
        return leading === "" || /^[0-9]+$/.test(leading);
      });

      if (extraColumnRow) {
        shouldStrip = true;
      }
    }

    if (!shouldStrip) {
      return file;
    }

    const trimmedRows = rows.map((row) => {
      if (!Array.isArray(row)) return row;
      return row.length > expectedColumns ? row.slice(1) : row;
    });

    const csv = Papa.unparse(trimmedRows, { newline: "\n" });
    const normalizedCsv = csv.endsWith("\n") ? csv : `${csv}\n`;

    const blob = new Blob([normalizedCsv], { type: "text/csv" });
    const name =
      (file.name?.replace(/\.csv$/i, "") || "bulk") + "_processed.csv";
    return new File([blob], name, { type: "text/csv" });
  } catch (error) {
    console.error("stripFirstColumnFromFile failed:", error);
    return file;
  }
}

function SmoothHeight({ children, deps = [], className = "" }) {
  const innerRef = useRef(null);
  const [height, setHeight] = useState("auto");
  const measure = () => {
    const h = innerRef.current?.getBoundingClientRect().height ?? 0;
    setHeight(`${Math.ceil(h)}px`);
  };
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    requestAnimationFrame(measure);
  }, deps);
  return (
    <div
      className={`overflow-hidden transition-[height] duration-300 ease-out ${className}`}
      style={{ height }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

export default function AddStore({ onCreated, onClose }) {
  const [activeTab, setActiveTab] = useState("add");

  const [store, setStore] = useState("");
  const [businessUnit, setBusinessUnit] = useState("");
  const [pincode, setPincode] = useState("");
  const [lat, setLat] = useState("");
  const [long, setLong] = useState("");

  const [storeFormat, setStoreFormat] = useState("");
  const [storeFormatOther, setStoreFormatOther] = useState("");

  const [entityType, setEntityType] = useState("");
  const [entityTypeOther, setEntityTypeOther] = useState("");

  const [salePoint, setSalePoint] = useState("");
  const [salePointOther, setSalePointOther] = useState("");

  const [verticals, setVerticals] = useState([]);
  const [verticalSelect, setVerticalSelect] = useState("");
  const [verticalOther, setVerticalOther] = useState("");
  const [showVerticalOther, setShowVerticalOther] = useState(false);

  // --- Bulk ---
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkError, setBulkError] = useState("");
  const [bulkVerticals, setBulkVerticals] = useState([]); // MANDATORY
  const [bulkVerticalSelect, setBulkVerticalSelect] = useState("");
  const [bulkVerticalOther, setBulkVerticalOther] = useState("");
  const [showBulkVerticalOther, setShowBulkVerticalOther] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (storeFormat !== "__other__") setStoreFormatOther("");
  }, [storeFormat]);
  useEffect(() => {
    if (entityType !== "__other__") setEntityTypeOther("");
  }, [entityType]);
  useEffect(() => {
    if (salePoint !== "__other__") setSalePointOther("");
  }, [salePoint]);

  const resolvedStoreFormat =
    storeFormat === "__other__" ? storeFormatOther.trim() : storeFormat;
  const resolvedEntityType =
    entityType === "__other__" ? entityTypeOther.trim() : entityType;
  const resolvedSalePoint =
    salePoint === "__other__" ? salePointOther.trim() : salePoint;

  const isLatValid =
    lat !== "" &&
    !Number.isNaN(Number(lat)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90;
  const isLongValid =
    long !== "" &&
    !Number.isNaN(Number(long)) &&
    Number(long) >= -180 &&
    Number(long) <= 180;
  const isPincodeValid = pincode.trim().length > 0;

  const addValid = useMemo(() => {
    return (
      store.trim() &&
      isPincodeValid &&
      isLatValid &&
      isLongValid &&
      resolvedStoreFormat &&
      resolvedEntityType &&
      resolvedSalePoint &&
      verticals.length > 0
    );
  }, [
    store,
    isPincodeValid,
    isLatValid,
    isLongValid,
    resolvedStoreFormat,
    resolvedEntityType,
    resolvedSalePoint,
    verticals.length,
  ]);

  const bulkValid = useMemo(() => {
    return Boolean(bulkFile) && bulkVerticals.length > 0;
  }, [bulkFile, bulkVerticals.length]);

  // ---- Styles (dark-friendly) ----
  const fieldCls =
    "h-9 rounded-md w-full border border-gray-300 bg-white px-3 text-sm text-gray-800 " +
    "placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 " +
    "dark:bg-[#111214] dark:text-gray-100 dark:placeholder-gray-400/70 dark:border-gray-700 " +
    "dark:focus:border-blue-400 dark:focus:ring-blue-400/30";
  const chipCls =
    "inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700 ring-1 ring-gray-200 " +
    "dark:bg-[#0e0f12] dark:text-gray-100 dark:ring-gray-800";

  const tabWrap = "relative rounded-xl bg-gray-100 dark:bg-[#0f1115]";
  const tabIndicator =
    "absolute top-0 left-0 h-full w-1/2 rounded-xl bg-white shadow transition-transform duration-300 ease-out dark:bg-gray-800 cursor-pointer";
  const tabBtn =
    "z-10 h-9 w-36 cursor-pointer rounded-xl px-4 text-xs font-medium text-gray-700 transition-colors duration-200 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hoover:cursor-pointer";

  // ---- Verticals (Add) ----
  const addVerticalValue = (value) =>
    setVerticals((prev) =>
      value && !prev.includes(value) ? [...prev, value] : prev,
    );
  const removeVerticalValue = (value) =>
    setVerticals((prev) => prev.filter((v) => v !== value));
  const handleAddOtherVertical = () => {
    const v = verticalOther.trim();
    if (!v) return;
    addVerticalValue(v);
    setVerticalOther("");
    setShowVerticalOther(false);
    setVerticalSelect("");
  };

  // ---- Verticals (Bulk - mandatory) ----
  const addBulkVerticalValue = (value) =>
    setBulkVerticals((prev) =>
      value && !prev.includes(value) ? [...prev, value] : prev,
    );
  const removeBulkVerticalValue = (value) =>
    setBulkVerticals((prev) => prev.filter((v) => v !== value));
  const handleAddBulkOtherVertical = () => {
    const v = bulkVerticalOther.trim();
    if (!v) return;
    addBulkVerticalValue(v);
    setBulkVerticalOther("");
    setShowBulkVerticalOther(false);
    setBulkVerticalSelect("");
  };

  /** Build one-row CSV for the Add flow */
  const buildSingleCsvFile = () => {
    const row = toCsvRow([
      store.trim(),
      businessUnit.trim(),
      pincode.trim(),
      Number(lat),
      Number(long),
      resolvedStoreFormat,
      resolvedEntityType,
      resolvedSalePoint,
    ]);
    const content = `${row}\n`;
    const blob = new Blob([content], { type: "text/csv" });
    return new File([blob], "store_single.csv", { type: "text/csv" });
  };

  const openPreviewForAdd = () => {
    const file = buildSingleCsvFile();
    setPreviewFile(file);
    setSubmitError("");
    setPreviewOpen(true);
  };
  const openPreviewForBulk = () => {
    if (!bulkValid) {
      setBulkError(
        !bulkFile
          ? "Please select a CSV file."
          : "Please add at least one vertical (required).",
      );
      return;
    }
    setPreviewFile(bulkFile);
    setSubmitError("");
    setPreviewOpen(true);
  };

  // --- Submit from preview modal (common endpoint) ---
  const handlePreviewSubmit = async () => {
    if (!previewFile) return;
    setSubmitting(true);
    setSubmitError("");

    const defaults =
      activeTab === "add" ? { verticals } : { verticals: bulkVerticals };
    const fileToSend =
      activeTab === "bulk"
        ? await stripFirstColumnFromFile(previewFile)
        : previewFile;

    const { ok, taskId, error } = await uploadStoresCsvApi(
      fileToSend,
      defaults,
    );
    setSubmitting(false);

    if (!ok) {
      setSubmitError(error || "Failed to upload.");
      return;
    }
    onCreated?.(taskId || { uploaded: true });
    setPreviewOpen(false);
    onClose?.();
  };

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-2xl">
        {/* Tabs */}
        <div className="mb-4 flex items-center justify-center">
          <div className={tabWrap}>
            <div
              className={tabIndicator}
              style={{
                transform:
                  activeTab === "bulk" ? "translateX(100%)" : "translateX(0%)",
              }}
            />
            <div className="relative flex">
              <button
                type="button"
                className={tabBtn}
                onClick={() => setActiveTab("add")}
              >
                Add Store
              </button>
              <button
                type="button"
                className={tabBtn}
                onClick={() => setActiveTab("bulk")}
              >
                Bulk Store Add
              </button>
            </div>
          </div>
        </div>

        {/* Smooth height wrapper for content */}
        <SmoothHeight deps={[activeTab]}>
          <div className="relative">
            {/* ADD PANEL */}
            <div
              className={`transition-all duration-300 ease-out ${
                activeTab === "add"
                  ? "relative translate-y-0 opacity-100"
                  : "pointer-events-none absolute inset-0 -z-10 -translate-y-1 opacity-0"
              }`}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (addValid) openPreviewForAdd();
                }}
                className="w-full rounded-2xl p-2"
              >
                <div className="mb-4 text-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Add Store
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Fill details, then{" "}
                    <span className="font-medium">Proceed</span> to preview CSV.
                  </p>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Store (left) */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                      Store
                    </label>
                    <input
                      type="text"
                      value={store}
                      onChange={(e) => setStore(e.target.value)}
                      placeholder="Store name"
                      className={fieldCls}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                      Business Unit
                    </label>
                    <input
                      type="text"
                      value={businessUnit}
                      onChange={(e) => setBusinessUnit(e.target.value)}
                      // placeholder="e.g., RETAIL_BU"
                      className={fieldCls}
                    />
                  </div>

                  {/* Pincode (right) */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g., 400001"
                      inputMode="numeric"
                      className={fieldCls}
                      maxLength={6}
                    />
                  </div>

                  {/* Latitude (left) */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="e.g., 19.0760"
                      className={fieldCls}
                    />
                  </div>

                  {/* Longitude (right) */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={long}
                      onChange={(e) => setLong(e.target.value)}
                      placeholder="e.g., 72.8777"
                      className={fieldCls}
                    />
                  </div>

                  {/* Store Format — full width */}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                      Store Format
                    </label>
                    <div className="w-full">
                      <CustomDropdown
                        options={[
                          ...STORE_FORMAT_OPTIONS.map((o) => ({
                            label: o,
                            value: o,
                          })),
                          { label: "Other…", value: "__other__" },
                        ]}
                        value={
                          storeFormat
                            ? {
                                label:
                                  storeFormat === "__other__"
                                    ? "Other…"
                                    : storeFormat,
                                value: storeFormat,
                              }
                            : null
                        }
                        onChange={(option) =>
                          setStoreFormat(option?.value || "")
                        }
                        placeholder="Select format"
                      />
                      {storeFormat === "__other__" && (
                        <input
                          type="text"
                          value={storeFormatOther}
                          onChange={(e) => setStoreFormatOther(e.target.value)}
                          placeholder="Enter custom store format"
                          className={`${fieldCls} mt-2 flex-1`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Entity Type */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                      Entity Type
                    </label>
                    <div className="w-full">
                      <CustomDropdown
                        options={[
                          ...ENTITY_TYPE_OPTIONS.map((o) => ({
                            label: o,
                            value: o,
                          })),
                          { label: "Other…", value: "__other__" },
                        ]}
                        value={
                          entityType
                            ? {
                                label:
                                  entityType === "__other__"
                                    ? "Other…"
                                    : entityType,
                                value: entityType,
                              }
                            : null
                        }
                        onChange={(option) =>
                          setEntityType(option?.value || "")
                        }
                        placeholder="Select type"
                      />
                    </div>
                    {entityType === "__other__" && (
                      <input
                        type="text"
                        value={entityTypeOther}
                        onChange={(e) => setEntityTypeOther(e.target.value)}
                        placeholder="Enter custom entity type"
                        className={`${fieldCls} mt-2`}
                      />
                    )}
                  </div>

                  {/* Sale Point */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                      Sale Point
                    </label>
                    <div className="w-full">
                      <CustomDropdown
                        options={[
                          ...SALE_POINT_OPTIONS.map((o) => ({
                            label: o,
                            value: o,
                          })),
                          { label: "Other…", value: "__other__" },
                        ]}
                        value={
                          salePoint
                            ? {
                                label:
                                  salePoint === "__other__"
                                    ? "Other…"
                                    : salePoint,
                                value: salePoint,
                              }
                            : null
                        }
                        onChange={(option) => setSalePoint(option?.value || "")}
                        placeholder="Select sale point"
                      />
                    </div>
                    {salePoint === "__other__" && (
                      <input
                        type="text"
                        value={salePointOther}
                        onChange={(e) => setSalePointOther(e.target.value)}
                        placeholder="Enter custom sale point"
                        className={`${fieldCls} mt-2`}
                      />
                    )}
                  </div>

                  {/* Verticals — full width */}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                      Verticals{" "}
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        (add one by one)
                      </span>
                    </label>
                    <div className="flex flex-1 gap-2">
                      <div className="w-1/2">
                        <CustomDropdown
                          options={[
                            ...VERTICAL_OPTIONS,
                            { label: "Other…", value: "__other__" },
                          ]}
                          value={
                            verticalSelect
                              ? VERTICAL_OPTIONS.find(
                                  (o) => o.value === verticalSelect,
                                ) || { label: "Other…", value: "__other__" }
                              : null
                          }
                          onChange={(option) => {
                            const v = option?.value || "";
                            setVerticalSelect(v);
                            setShowVerticalOther(v === "__other__");
                            if (v && v !== "__other__") {
                              addVerticalValue(v);
                              setVerticalSelect("");
                            }
                          }}
                          placeholder="Select vertical…"
                        />
                      </div>

                      {showVerticalOther && (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            type="text"
                            value={verticalOther}
                            onChange={(e) => setVerticalOther(e.target.value)}
                            placeholder="Enter custom vertical"
                            className={fieldCls}
                          />
                          <button
                            type="button"
                            onClick={handleAddOtherVertical}
                            className="h-9 shrink-0 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Selected chips */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {verticals.length === 0 ? (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          No verticals selected.
                        </span>
                      ) : (
                        verticals.map((v) => {
                          const label =
                            VERTICAL_OPTIONS.find((o) => o.value === v)
                              ?.label || v;
                          return (
                            <span
                              key={v}
                              className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700 ring-1 ring-gray-200 dark:bg-[#0e0f12] dark:text-gray-100 dark:ring-gray-800"
                            >
                              {label}
                              <button
                                type="button"
                                onClick={() => removeVerticalValue(v)}
                                className="ml-1 rounded p-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                aria-label={`Remove ${label}`}
                                title="Remove"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Proceed only */}
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-9 rounded-md border border-gray-300 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#15171a] dark:text-gray-200 dark:hover:bg-[#1b1e22]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!addValid}
                    className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    title={!addValid ? "Fill all required fields" : ""}
                  >
                    Proceed
                  </button>
                </div>
              </form>
            </div>

            {/* BULK PANEL */}
            <div
              className={`transition-all duration-300 ease-out ${
                activeTab === "bulk"
                  ? "relative translate-y-0 opacity-100"
                  : "pointer-events-none absolute inset-0 -z-10 -translate-y-1 opacity-0"
              }`}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  openPreviewForBulk();
                }}
                className="w-full rounded-2xl p-2"
              >
                <div className="mb-4 text-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Bulk Store Add
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload a CSV with columns: {CSV_COLUMN_LABELS.join(", ")}.
                    Then <span className="font-medium">Proceed</span> to preview
                    &amp; submit.
                  </p>
                </div>

                {/* Mandatory Default Verticals */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-200">
                    Default Verticals <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-1 gap-2">
                    <div className="w-full">
                      <CustomDropdown
                        options={[
                          ...VERTICAL_OPTIONS,
                          { label: "Other…", value: "__other__" },
                        ]}
                        value={
                          bulkVerticalSelect
                            ? VERTICAL_OPTIONS.find(
                                (o) => o.value === bulkVerticalSelect,
                              ) || { label: "Other…", value: "__other__" }
                            : null
                        }
                        onChange={(option) => {
                          const v = option?.value || "";
                          setBulkVerticalSelect(v);
                          setShowBulkVerticalOther(v === "__other__");
                          if (v && v !== "__other__") {
                            addBulkVerticalValue(v);
                            setBulkVerticalSelect("");
                          }
                        }}
                        placeholder="Select vertical…"
                      />
                    </div>

                    {showBulkVerticalOther && (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          value={bulkVerticalOther}
                          onChange={(e) => setBulkVerticalOther(e.target.value)}
                          placeholder="Enter custom vertical"
                          className={fieldCls}
                        />
                        <button
                          type="button"
                          onClick={handleAddBulkOtherVertical}
                          className="h-9 shrink-0 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Chips + helper */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {bulkVerticals.length === 0 ? (
                      <span className="text-[11px] text-red-500">
                        At least one vertical is required.
                      </span>
                    ) : (
                      bulkVerticals.map((v) => {
                        const label =
                          VERTICAL_OPTIONS.find((o) => o.value === v)?.label ||
                          v;
                        return (
                          <span key={v} className={chipCls}>
                            {label}
                            <button
                              type="button"
                              onClick={() => removeBulkVerticalValue(v)}
                              className="ml-1 rounded p-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              aria-label={`Remove ${label}`}
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* File input + Sample button */}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-700">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      setBulkFile(e.target.files?.[0] || null);
                      setBulkError("");
                    }}
                    className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-blue-700 dark:text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={downloadSampleCsv}
                    className="h-8 shrink-0 rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#15171a] dark:text-gray-200 dark:hover:bg-[#1b1e22]"
                    title="Download sample CSV"
                  >
                    Download sample
                  </button>
                </div>

                {bulkFile && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Selected:{" "}
                    <span className="font-medium">{bulkFile.name}</span>
                  </div>
                )}
                {bulkError && (
                  <div className="mt-3 text-xs text-red-500">{bulkError}</div>
                )}

                {/* Actions: Proceed only */}
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-9 rounded-md border border-gray-300 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#15171a] dark:text-gray-200 dark:hover:bg-[#1b1e22]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!bulkValid}
                    className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    title={
                      !bulkValid ? "Select CSV and at least one vertical" : ""
                    }
                  >
                    Proceed
                  </button>
                </div>

                {/* Helper note */}
                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  Note: On submit, the{" "}
                  <span className="font-medium">first column</span> of the CSV
                  will be ignored.
                </p>
              </form>
            </div>
          </div>
        </SmoothHeight>
      </div>

      {/* ==== PREVIEW MODAL ==== */}
      <CustomModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size="md"
        isDark={false}
      >
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Preview CSV</h3>
          {previewFile ? (
            <CsvPreviewTable
              file={previewFile}
              columnLabels={CSV_COLUMN_LABELS}
            />
          ) : (
            <div className="text-xs text-gray-500">No file to preview.</div>
          )}

          {/* Defaults summary (verticals) */}
          <div className="rounded-md bg-gray-50 p-2 text-xs text-gray-600 ring-1 ring-gray-200">
            <div className="mb-1 font-medium text-gray-700"></div>
            <div>
              Verticals:
              <span className="font-mono">
                {(activeTab === "add" ? verticals : bulkVerticals).join(
                  " | ",
                ) || "—"}
              </span>
            </div>
            {activeTab === "bulk" && (
              <div className="mt-1">
                First column will be ignored on submit.
              </div>
            )}
          </div>

          {/* Error */}
          {submitError && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
              {submitError}
            </div>
          )}

          {/* Footer actions */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePreviewSubmit}
              disabled={submitting || !previewFile}
              className="h-9 rounded-md bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}
