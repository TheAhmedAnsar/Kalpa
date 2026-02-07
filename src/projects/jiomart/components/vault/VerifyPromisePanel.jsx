import React, { useState } from "react";
import { enqueueSnackbar } from "notistack";
import StoreMallDirectoryOutlinedIcon from "@mui/icons-material/StoreMallDirectoryOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import DoubleArrowOutlinedIcon from "@mui/icons-material/DoubleArrowOutlined";
import NightsStayOutlinedIcon from "@mui/icons-material/NightsStayOutlined";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import apiClient from "../../../../api/client";

const DEFAULT_FORM = {
  storeCode: "",
  customerPincode: "",
  fulfilmentType: "1p",
};

const VERIFY_PROMISE_ENDPOINT = "/__deku/api/v1/__jiomart/serviceability";

const pickFirstValue = (source, keys) => {
  if (!source || typeof source !== "object") return "";
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return "";
};

const ensureString = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const toNumberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toStringArray = (input) => {
  if (!input && input !== 0) return [];
  if (Array.isArray(input)) {
    return input.map(ensureString).filter(Boolean);
  }
  const normalized = ensureString(input);
  if (!normalized) return [];
  return normalized
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const padTwoDigits = (value) => String(value).padStart(2, "0");

const clampNumber = (value, min, max, fallback) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
};

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const SIX_AM_MINUTES = 6 * MINUTES_PER_HOUR;

const parseTimeStringToMinutes = (value) => {
  const text = ensureString(value).trim();
  if (!text) return null;

  const [hourPart, minutePart = "0"] = text.split(":");
  const hour = toNumberOrNull(hourPart);
  const minute = toNumberOrNull(minutePart);

  if (hour === null || hour < 0 || hour > 23) {
    return null;
  }

  const safeMinute = minute === null ? 0 : clampNumber(minute, 0, 59, 0);
  return hour * MINUTES_PER_HOUR + safeMinute;
};

const evaluateCutoffIndicator = (cutoffValue, referenceDate = new Date()) => {
  const cutoffMinutes = parseTimeStringToMinutes(cutoffValue);
  if (cutoffMinutes === null) return null;

  const nowMinutes =
    referenceDate.getHours() * MINUTES_PER_HOUR + referenceDate.getMinutes();

  if (nowMinutes > cutoffMinutes) {
    return "night";
  }

  if (nowMinutes >= SIX_AM_MINUTES && nowMinutes <= cutoffMinutes) {
    return "sun";
  }

  return "night";
};

const formatCutoffTime = (value) => {
  if (value === undefined || value === null || value === "") return "";

  let hour = null;
  let minute = null;

  if (typeof value === "object") {
    const hourRaw =
      value.hour ?? value.hours ?? value.HH ?? value.h ?? value.H ?? value.hr;
    const minuteRaw =
      value.minute ?? value.minutes ?? value.mm ?? value.MM ?? value.m;
    const h = toNumberOrNull(hourRaw);
    const m = toNumberOrNull(minuteRaw);
    if (h !== null || m !== null) {
      hour = clampNumber(h ?? 0, 0, 23, 0);
      minute = clampNumber(m ?? 0, 0, 59, 0);
    }
  } else if (typeof value === "number" && Number.isFinite(value)) {
    hour = clampNumber(value, 0, 23, 0);
    minute = 0;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    // Try to parse HH:mm
    const parts = trimmed.split(":");
    if (parts.length >= 2) {
      const h = toNumberOrNull(parts[0]);
      const m = toNumberOrNull(parts[1]);
      if (h !== null) {
        hour = clampNumber(h, 0, 23, 0);
        minute = clampNumber(m ?? 0, 0, 59, 0);
      } else {
        return trimmed;
      }
    } else {
      return trimmed;
    }
  }

  if (hour !== null && minute !== null) {
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${padTwoDigits(minute)} ${period}`;
  }

  return ensureString(value);
};

const formatTatRange = (minValue, maxValue, fallback = "") => {
  const min = toNumberOrNull(minValue);
  const max = toNumberOrNull(maxValue);

  if (min === null && max === null) {
    const text = ensureString(fallback);
    return text;
  }

  if (min !== null && max !== null) {
    if (min === max) {
      return `${min} ${min === 1 ? "Day" : "Days"}`;
    }
    return `${min} - ${max} Days`;
  }

  const single = min !== null ? min : max;
  if (single !== null) {
    return `${single} ${single === 1 ? "Day" : "Days"}`;
  }

  const text = ensureString(fallback);
  return text;
};

const formatRegionLabel = (value) => {
  const text = ensureString(value).trim();
  if (!text) return "";
  if (/[_>|]/.test(text)) {
    const tokens = text
      .split(/[_>|]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    if (tokens.length) {
      return tokens.map((token) => token.toUpperCase()).join(" - ");
    }
  }
  return text.toUpperCase();
};

const formatDpLabel = (value) => {
  const text = ensureString(value).trim();
  if (!text) return "";
  return text.replace(/_/g, " ").replace(/\s+/g, " ").trim();
};

const extractMaxNumberFromText = (value) => {
  const text = ensureString(value);
  if (!text) return null;
  const matches = text.match(/(\d+(\.\d+)?)/g);
  if (!matches || !matches.length) return null;
  return matches.reduce(
    (max, current) => Math.max(max, Number(current)),
    Number.NEGATIVE_INFINITY,
  );
};

const getTatDaysFromSource = (...sources) => {
  for (const source of sources) {
    if (source === null || source === undefined || source === "") continue;
    if (typeof source === "number" && Number.isFinite(source)) {
      return source;
    }
    if (typeof source === "object") {
      const min = toNumberOrNull(
        source.min ??
          source.from ??
          source.minimum ??
          source.lower ??
          source.start,
      );
      const max = toNumberOrNull(
        source.max ?? source.to ?? source.maximum ?? source.upper ?? source.end,
      );
      if (max !== null) return max;
      if (min !== null) return min;
    }
    if (typeof source === "string") {
      const numeric = toNumberOrNull(source);
      if (numeric !== null) return numeric;
      const fromLabel = extractMaxNumberFromText(source);
      if (fromLabel !== null && Number.isFinite(fromLabel)) {
        return fromLabel;
      }
    }
  }
  return null;
};

const CONNECTOR_VARIANTS = {
  default:
    "border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200",
};

const resolveTatVariant = (days) => {
  if (days === null || days === undefined || Number.isNaN(days)) {
    return "default";
  }
  if (days <= 1) return "success";
  if (days <= 3) return "warning";
  return "danger";
};

const normalizePromiseData = (raw, fulfilmentType = "1p") => {
  if (!raw) return null;
  const payload = Array.isArray(raw) ? (raw[0] ?? null) : raw;
  if (!payload || typeof payload !== "object") return null;

  const storeBlock =
    payload.store_details ||
    payload.storeDetail ||
    payload.store ||
    payload.storeInfo;
  const originBlock =
    payload.origin_details || payload.origin || payload.source;
  const destinationBlock =
    payload.destination_details ||
    payload.destination ||
    payload.customer ||
    payload.to;
  const lspBlock =
    payload.lsp_details || payload.lsp || payload.dp_info || payload.partner;

  let storeCode = ensureString(
    pickFirstValue(payload, [
      "store_code",
      "storeCode",
      "store_id",
      "storeId",
      "store",
    ]) || pickFirstValue(storeBlock, ["code", "store_code", "id"]),
  );
  if (!storeCode && typeof storeBlock === "string") {
    storeCode = ensureString(storeBlock);
  }

  let storeName = ensureString(
    pickFirstValue(payload, [
      "store_name",
      "storeName",
      "store_display_name",
    ]) || pickFirstValue(storeBlock, ["name", "display_name", "label"]),
  );
  if (!storeName && typeof storeBlock === "string") {
    storeName = ensureString(storeBlock);
  }

  const storePincode = ensureString(
    pickFirstValue(payload, ["store_pincode", "storePincode", "store_pin"]) ||
      pickFirstValue(storeBlock, ["pincode", "pin", "zip"]),
  );

  let customerPincode = ensureString(
    pickFirstValue(payload, [
      "customer_pincode",
      "customerPincode",
      "pincode",
      "destination_pincode",
      "dest_pincode",
    ]) || pickFirstValue(destinationBlock, ["pincode", "pin", "zip"]),
  );

  let originPincode = ensureString(
    pickFirstValue(payload, ["origin", "origin_pincode", "source_pincode"]) ||
      pickFirstValue(originBlock, ["pincode", "pin", "zip"]),
  );
  if (!originPincode && storePincode) {
    originPincode = storePincode;
  }

  let originName = ensureString(
    pickFirstValue(payload, [
      "origin_name",
      "origin_city",
      "source_city",
      "origin_cluster_name",
    ]) || pickFirstValue(originBlock, ["city", "name", "label"]),
  );

  const fromRegion = ensureString(
    pickFirstValue(payload, [
      "from_region",
      "origin_region",
      "source_region",
    ]) || pickFirstValue(originBlock, ["region", "zone"]),
  );

  let cutoff = formatCutoffTime(
    pickFirstValue(payload, ["cutoff", "cutoff_time", "cutoffTime", "cut_off"]),
  );
  if (!cutoff) {
    cutoff = formatCutoffTime(
      payload.store_cutoff_time ||
        storeBlock?.cutoff_time ||
        storeBlock?.cutoffTime,
    );
  }

  let lspName = ensureString(
    pickFirstValue(payload, [
      "lsp",
      "lsp_name",
      "delivery_partner",
      "dp_name",
      "partner_name",
    ]) || pickFirstValue(lspBlock, ["name", "display_name", "label"]),
  );

  const transitDaysSource = pickFirstValue(payload, [
    "transit_days",
    "promise_days",
    "tat_days",
    "days",
    "eta_days",
  ]);

  const destinationName = ensureString(
    pickFirstValue(payload, [
      "destination",
      "destination_city",
      "to_city",
      "destination_cluster_name",
    ]) || pickFirstValue(destinationBlock, ["city", "name", "label"]),
  );

  const toRegion = ensureString(
    pickFirstValue(payload, [
      "to_region",
      "destination_region",
      "dest_region",
    ]) || pickFirstValue(destinationBlock, ["region", "zone"]),
  );

  const serviceableDps = toStringArray(
    payload.serviceable_dps ||
      payload.serviceableDps ||
      payload.serviceable_lsps ||
      payload.lsps ||
      payload.dps,
  );

  if (!lspName && serviceableDps.length === 1) {
    lspName = serviceableDps[0];
  } else if (!lspName && serviceableDps.length > 1) {
    lspName = `${serviceableDps.length} partners`;
  }

  const storeTatRaw =
    payload.store_tat || payload.storeTat || storeBlock?.tat || {};
  const storeTatMin = toNumberOrNull(
    storeTatRaw?.min ?? storeTatRaw?.from ?? storeTatRaw?.minimum,
  );
  const storeTatMax = toNumberOrNull(
    storeTatRaw?.max ?? storeTatRaw?.to ?? storeTatRaw?.maximum,
  );
  const storeTatLabel = formatTatRange(storeTatMin, storeTatMax, "");

  const dpTatSource =
    payload.dp_tat ||
    payload.dpTat ||
    payload.dp_promise ||
    payload.promise_breakup ||
    [];

  const serviceableSet = new Set(
    serviceableDps.map((item) => item.toLowerCase()),
  );

  let aggregatedMin = null;
  let aggregatedMax = null;

  const deliveryPartners = Array.isArray(dpTatSource)
    ? dpTatSource
        .map((item, index) => {
          if (!item) return null;
          if (typeof item !== "object") {
            const name = ensureString(item);
            if (!name) return null;
            return {
              name,
              tat: "",
              tatLabel: "",
              tatValue: null,
              tatMin: null,
              tatMax: null,
              type: "",
              isServiceable: serviceableSet.has(name.toLowerCase()),
            };
          }

          const partnerIdentifier =
            pickFirstValue(item, [
              "dp",
              "code",
              "name",
              "partner",
              "id",
              "lsp",
              "delivery_partner",
            ]) || `Partner ${index + 1}`;

          const partnerName = ensureString(partnerIdentifier);
          const minValue = pickFirstValue(item, [
            "min",
            "minimum",
            "from",
            "tat_min",
            "promise_min",
          ]);
          const maxValue = pickFirstValue(item, [
            "max",
            "maximum",
            "to",
            "tat_max",
            "promise_max",
          ]);
          const min = toNumberOrNull(minValue);
          const max = toNumberOrNull(maxValue);

          if (min !== null) {
            aggregatedMin =
              aggregatedMin === null ? min : Math.min(aggregatedMin, min);
          }
          if (max !== null) {
            aggregatedMax =
              aggregatedMax === null ? max : Math.max(aggregatedMax, max);
          }

          const fallbackTat = pickFirstValue(item, [
            "tat",
            "promise",
            "tat_days",
            "days",
            "promise_days",
          ]);
          const tatLabel = formatTatRange(min, max, ensureString(fallbackTat));
          const tatValue =
            min !== null && max !== null && min === max
              ? min
              : toNumberOrNull(fallbackTat);

          const type = ensureString(
            pickFirstValue(item, [
              "type",
              "fulfilment_type",
              "mode",
              "category",
              "dp_type",
            ]),
          );

          const isServiceable = partnerName
            ? serviceableSet.has(partnerName.toLowerCase())
            : false;

          return {
            name: partnerName,
            tat: tatLabel,
            tatLabel,
            tatValue,
            tatMin: min,
            tatMax: max,
            type,
            isServiceable,
          };
        })
        .filter(Boolean)
    : [];

  const transitRangeLabel = formatTatRange(
    aggregatedMin,
    aggregatedMax,
    ensureString(transitDaysSource),
  );

  const transitDays =
    aggregatedMin !== null &&
    aggregatedMax !== null &&
    aggregatedMin === aggregatedMax
      ? aggregatedMin
      : toNumberOrNull(transitDaysSource);

  const hasUsefulData = [
    storeCode,
    storeName,
    customerPincode,
    originPincode,
    fromRegion,
    cutoff,
    lspName,
    transitRangeLabel,
    originName,
    destinationName,
    toRegion,
  ].some((value) => value !== "");

  if (!hasUsefulData && deliveryPartners.length === 0) {
    return null;
  }

  return {
    storeCode,
    storeName,
    storePincode,
    customerPincode,
    originPincode,
    originName,
    fromRegion,
    cutoff,
    lspName,
    transitDays,
    transitDaysRaw: transitRangeLabel,
    destinationName,
    toRegion,
    deliveryPartners,
    serviceableDps,
    serviceableDpsLabel: serviceableDps.join(", "),
    storeTat: {
      min: storeTatMin,
      max: storeTatMax,
    },
    storeTatLabel,
    fulfilmentType,
  };
};

const formatTatLabel = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : fallback;
  }
  if (typeof value === "object") {
    const min = value.min ?? value.from ?? value.minimum;
    const max = value.max ?? value.to ?? value.maximum;
    const label = formatTatRange(min, max, fallback);
    return label || fallback;
  }
  const numeric = toNumberOrNull(value);
  if (numeric !== null) {
    return `${numeric} ${numeric === 1 ? "Day" : "Days"}`;
  }
  const text = ensureString(value);
  return text || fallback;
};

const VerifyPromisePanel = () => {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const typeOptions = [
    { value: "1p", label: "1P" },
    { value: "3p", label: "3P" },
  ];

  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const changePromiseType = (nextType) => {
    setForm((prev) => ({ ...prev, fulfilmentType: nextType }));
    setData(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedStore = form.storeCode.trim().toUpperCase();
    const trimmedPincode = form.customerPincode.trim();

    if (!trimmedStore || !trimmedPincode) {
      enqueueSnackbar("Store code and customer pincode are required.", {
        variant: "warning",
      });
      setData(null);
      return;
    }

    setForm((prev) => ({
      ...prev,
      storeCode: trimmedStore,
      customerPincode: trimmedPincode,
    }));

    setLoading(true);
    setData(null);

    const currentType = form.fulfilmentType;

    try {
      const payload = {
        store_name: trimmedStore,
        c_pincode: trimmedPincode,
        type: currentType.toUpperCase(),
      };

      const res = await apiClient.post(VERIFY_PROMISE_ENDPOINT, payload);
      let responsePayload = res?.data;

      if (responsePayload?.error) {
        enqueueSnackbar(ensureString(responsePayload.error), {
          variant: "error",
        });
        return;
      }

      if (responsePayload && typeof responsePayload === "object") {
        if (responsePayload.data !== undefined)
          responsePayload = responsePayload.data;
        else if (responsePayload.result !== undefined)
          responsePayload = responsePayload.result;
        else if (responsePayload.payload !== undefined)
          responsePayload = responsePayload.payload;
        else if (responsePayload.promise !== undefined)
          responsePayload = responsePayload.promise;
      }

      const normalized = normalizePromiseData(responsePayload, currentType);
      if (!normalized) {
        const message =
          "No promise details were returned for the provided inputs.";
        enqueueSnackbar(message, { variant: "error" });
        return;
      }

      setData(normalized);
      // console.log(normalized);
    } catch (fetchError) {
      console.error("Failed to fetch promise details:", fetchError);
      const message =
        fetchError?.response?.data?.message ||
        fetchError?.message ||
        "Failed to fetch promise details.";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const isThreeP = form.fulfilmentType === "3p";
  const hasPromiseData = Boolean(data);
  const isSubmitDisabled =
    loading || !form.storeCode.trim() || !form.customerPincode.trim();

  const displayValue = (value) => {
    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : "—";
    }
    if (value && typeof value === "object") {
      if ("label" in value && value.label) {
        return ensureString(value.label);
      }
      if ("min" in value || "max" in value) {
        const label = formatTatRange(value.min, value.max, "");
        return label || "—";
      }
    }
    const text = ensureString(value);
    return text || "—";
  };

  const storePincodeValue =
    data?.storePincode ||
    data?.originPincode ||
    (isThreeP ? data?.customerPincode : form.customerPincode) ||
    form.customerPincode;
  const originDisplay = data?.originName || data?.originPincode || "";
  const fromRegionDisplay = data?.fromRegion || "";
  const customerPincodeValue = data?.customerPincode || form.customerPincode;
  const destinationDisplay = data?.destinationName || "";
  const destinationRegionDisplay = data?.toRegion || "";
  const transitLabel = hasPromiseData ? data.transitDaysRaw : "";
  const storeTatLabel = hasPromiseData
    ? formatTatLabel(data?.storeTat ?? data?.storeTatLabel ?? "", "")
    : "";
  const storeConnectorLabel = storeTatLabel ? `${storeTatLabel}` : "";
  const transitConnectorLabel = transitLabel ? `${transitLabel}` : "";
  const deliveryPartners = data?.deliveryPartners ?? [];
  const cutoffIndicatorType =
    hasPromiseData && data?.cutoff
      ? evaluateCutoffIndicator(data.cutoff)
      : null;
  const cutoffIndicatorElement = (() => {
    if (!cutoffIndicatorType) return null;
    if (cutoffIndicatorType === "night") {
      return (
        <div className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-200 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-400/40">
          <NightsStayOutlinedIcon fontSize="small" />
        </div>
      );
    }
    return (
      <div className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400/10 text-yellow-500 ring-1 ring-yellow-300 dark:bg-yellow-300/10 dark:text-yellow-200 dark:ring-yellow-400/40">
        <WbSunnyOutlinedIcon fontSize="small" />
      </div>
    );
  })();

  const formattedFromRegionDisplay = fromRegionDisplay
    ? formatRegionLabel(fromRegionDisplay)
    : "";
  const formattedDestinationRegionDisplay = destinationRegionDisplay
    ? formatRegionLabel(destinationRegionDisplay)
    : "";
  const primaryDpName = data?.lspName ? formatDpLabel(data.lspName) : "";

  const storeRows = [
    data?.storeName && { label: "Store Name", value: data.storeName },
    (data?.storeCode || form.storeCode) && {
      label: "Store ID",
      value: data?.storeCode || form.storeCode,
    },
    storePincodeValue && { label: "Store Pincode", value: storePincodeValue },
    originDisplay && { label: "Origin", value: originDisplay },
    formattedFromRegionDisplay && {
      label: "From Region",
      value: formattedFromRegionDisplay,
      noWrap: true,
    },
    storeTatLabel && { label: "Store TAT", value: storeTatLabel },
    data?.cutoff && { label: "Cutoff", value: data.cutoff },
  ].filter(Boolean);

  const lspItems = [
    {
      label: "Fulfilment Type",
      value: (data?.fulfilmentType || form.fulfilmentType).toUpperCase(),
    },
    primaryDpName && {
      label: isThreeP ? "Primary DP" : "LSP Name",
      value: primaryDpName,
    },
    data?.transitDaysRaw && {
      label: "Transit TAT",
      value: data.transitDaysRaw,
    },
  ].filter(Boolean);

  const customerItems = [
    customerPincodeValue && {
      label: "Customer Pincode",
      value: customerPincodeValue,
    },
    destinationDisplay && { label: "Destination", value: destinationDisplay },
    formattedDestinationRegionDisplay && {
      label: "To Region",
      value: formattedDestinationRegionDisplay,
      noWrap: true,
    },
  ].filter(Boolean);

  const storeTatDays = getTatDaysFromSource(
    data?.storeTat,
    data?.storeTatLabel,
    storeTatLabel,
  );
  const transitTatDays = getTatDaysFromSource(
    data?.transitDays,
    data?.transitDaysRaw,
    transitLabel,
  );
  const storeConnectorVariant = resolveTatVariant(storeTatDays);
  const transitConnectorVariant = resolveTatVariant(transitTatDays);

  const JourneyStep = ({ icon, title, items, colorClass, bgClass, extra }) => {
    const sanitizedItems = items.filter((item) => item && item.label);
    return (
      <div className="relative z-10 flex flex-1 flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-[#16191f]">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgClass} ${colorClass}`}
            >
              {icon}
            </div>
            <div className="text-sm font-bold tracking-wide text-gray-900 dark:text-gray-100">
              {title}
            </div>
          </div>
          {extra}
        </div>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {sanitizedItems.map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col gap-1 ${item.noWrap ? "col-span-full" : ""}`}
            >
              <dt className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                {item.label}
              </dt>
              <dd className="text-sm font-medium break-words text-gray-900 dark:text-gray-100">
                {displayValue(item.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  const JourneyConnector = ({ label, variant = "default" }) => {
    const colors = {
      default: "text-gray-500 dark:text-gray-400",
      success: "text-emerald-600 dark:text-emerald-400",
      warning: "text-amber-600 dark:text-amber-400",
      danger: "text-rose-600 dark:text-rose-400",
    };
    const textColor = colors[variant] || colors.default;

    return (
      <div className="relative flex items-center justify-center py-6 lg:px-4 lg:py-0">
        {/* Vertical Line (Mobile/Tablet) */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-gray-200 lg:hidden dark:bg-gray-800" />

        {/* Horizontal Line (Desktop) */}
        <div className="hidden h-0.5 w-full bg-gray-200 lg:block dark:bg-gray-800" />

        {/* Badge */}
        {label && (
          <div
            className={`relative z-10 rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-bold tracking-wider uppercase shadow-sm dark:border-gray-700 dark:bg-[#1f2227] ${textColor}`}
          >
            {label}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50/50 dark:bg-[#0b0d0e]">
      {/* Header / Form Section */}
      <div className="z-30 border-b border-gray-200 bg-white px-4 py-5 shadow-sm sm:px-6 dark:border-white/5 dark:bg-[#111417]">
        <form onSubmit={handleSubmit}>
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Verify Promise
              </h1>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter store and customer details to visualize the complete
                promise journey and serviceability.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:items-end">
              {/* Store Code */}
              <div className="md:col-span-3 lg:col-span-3">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Store Code
                </label>
                <input
                  type="text"
                  value={form.storeCode}
                  onChange={handleInputChange("storeCode")}
                  placeholder="e.g. SANR"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-[#1a1d21] dark:text-white dark:placeholder-gray-600 dark:focus:border-blue-500"
                  autoComplete="off"
                />
              </div>

              {/* Customer Pincode */}
              <div className="md:col-span-3 lg:col-span-3">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Customer Pincode
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={form.customerPincode}
                  onChange={handleInputChange("customerPincode")}
                  placeholder="e.g. 400001"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-[#1a1d21] dark:text-white dark:placeholder-gray-600 dark:focus:border-blue-500"
                  autoComplete="off"
                />
              </div>

              {/* Fulfilment Type */}
              <div className="md:col-span-4 lg:col-span-4">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Fulfilment Type
                </label>
                <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-[#1a1d21]">
                  {typeOptions.map((option) => {
                    const isActive = form.fulfilmentType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => changePromiseType(option.value)}
                        className={`flex-1 cursor-pointer rounded-md py-1.5 text-xs font-bold tracking-wide uppercase transition-all ${
                          isActive
                            ? "bg-white text-gray-900 shadow-sm dark:bg-[#2c3036] dark:text-white"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="md:col-span-2 lg:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus:ring-offset-[#111417]"
                >
                  {loading ? (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : null}
                  Check
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-8 pb-10">
          {hasPromiseData && (
            <>
              {/* Journey Visualization */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-wide text-gray-900 uppercase dark:text-white">
                    Promise Journey
                  </h3>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                </div>

                <div className="flex flex-col lg:flex-row">
                  {/* Store Step */}
                  <JourneyStep
                    icon={<StoreMallDirectoryOutlinedIcon />}
                    title="Store"
                    items={storeRows}
                    colorClass="text-blue-600 dark:text-blue-400"
                    bgClass="bg-blue-50 dark:bg-blue-500/10"
                    extra={cutoffIndicatorElement}
                  />

                  <JourneyConnector
                    label={storeConnectorLabel}
                    variant={storeConnectorVariant}
                  />

                  {/* Logistics Step */}
                  <JourneyStep
                    icon={<LocalShippingOutlinedIcon />}
                    title="Logistics"
                    items={lspItems}
                    colorClass="text-amber-600 dark:text-amber-400"
                    bgClass="bg-amber-50 dark:bg-amber-500/10"
                  />

                  <JourneyConnector
                    label={transitConnectorLabel}
                    variant={transitConnectorVariant}
                  />

                  {/* Customer Step */}
                  <JourneyStep
                    icon={<LocationOnOutlinedIcon />}
                    title="Customer"
                    items={customerItems}
                    colorClass="text-emerald-600 dark:text-emerald-400"
                    bgClass="bg-emerald-50 dark:bg-emerald-500/10"
                  />
                </div>
              </section>

              {/* Delivery Partners Grid */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-wide text-gray-900 uppercase dark:text-white">
                      Delivery Partners
                    </h3>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600 dark:bg-white/10 dark:text-gray-400">
                      {deliveryPartners.length}
                    </span>
                  </div>
                </div>

                {deliveryPartners.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {deliveryPartners.map((partner, index) => {
                      const tatRangeLabel =
                        partner.tatLabel ||
                        formatTatRange(
                          partner.tatMin,
                          partner.tatMax,
                          partner.tatValue ?? partner.tat,
                        );
                      const showTatLimits =
                        partner.tatMin !== null &&
                        partner.tatMax !== null &&
                        partner.tatMin !== partner.tatMax;

                      return (
                        <div
                          key={`${partner.name}-${index}`}
                          className="group relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-[#16191f]"
                        >
                          <div>
                            <div className="mb-4 flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                {formatDpLabel(partner.name)}
                              </h4>
                              {partner.isServiceable && (
                                <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-600 uppercase dark:bg-emerald-500/20 dark:text-emerald-400">
                                  Serviceable
                                </span>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div>
                                <div className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                  TAT Range
                                </div>
                                <div className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                  {tatRangeLabel || "—"}
                                </div>
                              </div>

                              {showTatLimits && (
                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                  <div>
                                    <span className="font-medium">Min:</span>{" "}
                                    {formatTatLabel(partner.tatMin)}
                                  </div>
                                  <div className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
                                  <div>
                                    <span className="font-medium">Max:</span>{" "}
                                    {formatTatLabel(partner.tatMax)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {partner.type && (
                            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-white/5">
                              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-[10px] font-bold tracking-wide text-gray-600 uppercase dark:bg-white/5 dark:text-gray-400">
                                {partner.type}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-[#16191f]">
                    <LocalShippingOutlinedIcon className="mb-3 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      No delivery partners found
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Try checking a different pincode or store.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}

          {!hasPromiseData && !loading && (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-center dark:border-gray-800 dark:bg-[#16191f]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
                <StoreMallDirectoryOutlinedIcon className="text-gray-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
                Ready to verify
              </h3>
              <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
                Enter the details above to check serviceability and view the
                promise journey.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyPromisePanel;
