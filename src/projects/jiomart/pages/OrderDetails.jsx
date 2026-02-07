import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLayout from "../../../components/PageLayout";
import CustomModal from "../../../components/CustomModal";
import apiClient from "../../../api/client";
import { useSnackbar } from "notistack";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { Drawer, Skeleton, Tooltip } from "@mui/material";
import OrderHistory from "../components/Orders/OrderHistory";
import CustomDropdown from "../../../components/CustomDropdown";

const LSP_ACCOUNT_MAP = {
  delhivery_jio: 19,
  ecom_jio: 1,
  xpressbees_jio: 20,
  shadowfax_jio: 26,
  "Delhivery_H&B": 43,
};

const LSP_LABEL_MAP = {
  delhivery_jio: "Delhivery Jio",
  ecom_jio: "Ecom Jio",
  xpressbees_jio: "Xpressbees Jio",
  shadowfax_jio: "Shadowfax Jio",
  "Delhivery_H&B": "Delhivery H&B",
};

const LSP_ACCOUNT_LABEL_MAP = Object.entries(LSP_ACCOUNT_MAP).reduce(
  (acc, [key, value]) => {
    acc[String(value)] = LSP_LABEL_MAP[key] ?? key;
    return acc;
  },
  {},
);

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "—";
  const numberValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(numberValue)) return value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numberValue);
};

const formatWeight = (weight) => {
  if (weight === null || weight === undefined) return "—";
  if (typeof weight === "string" || typeof weight === "number") {
    return String(weight);
  }
  if (typeof weight === "object") {
    const value = weight.value ?? "";
    const unit = weight.unit ?? "";
    const formatted = `${value} ${unit}`.trim();
    return formatted || "—";
  }
  return "—";
};

const parseActivityMessage = (rawMessage) => {
  if (!rawMessage) return null;
  if (typeof rawMessage !== "string") return rawMessage;
  const cleaned = rawMessage.replace(/\\/g, "");
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    return { message: cleaned };
  }
};

const formatActivityDate = (value) => {
  if (!value) return { date: "—", time: "" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: String(value), time: "" };
  }
  return {
    date: parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: parsed.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};


const normalizeBags = (bags) => {
  if (!Array.isArray(bags)) return [];
  return bags
    .map((bag, index) => {
      if (!bag) return null;
      return {
        id: bag.bag_id ?? bag.id ?? `bag-${index}`,
        sku: bag?.item?.code ?? bag.sku ?? "—",
        skuName: bag?.sku_name ?? bag.skuName ?? bag?.item?.name ?? "SKU Item",
        price:
          bag?.financial_breakup?.[0]?.price_effective ??
          bag.price ??
          null,
        hsn: bag?.gst_details?.hsn_code ?? bag.hsn ?? "",
        image: bag?.item?.image?.[0] ?? bag.image ?? "",
        jioCode: bag?.meta?.jio_code ?? bag.jioCode ?? "",
        isActive: bag?.status?.is_active ?? bag?.status?.isActive ?? null,
      };
    })
    .filter(Boolean);
};

const normalizeShipment = (shipment) => {
  if (!shipment) return shipment;
  const data = shipment?.data?.shipment ?? shipment?.data ?? shipment;
  const store = data?.fulfilling_store ?? {};
  const storeAddress = store?.store_address_json ?? {};
  const prices = data?.prices ?? {};
  const normalizedWeight =
    data?.weight && typeof data.weight === "object"
      ? `${data.weight.value ?? ""} ${data.weight.unit ?? ""}`.trim()
      : data?.weight;
  return {
    ...data,
    shipmentId: data?.shipment_id ?? data?.shipmentId ?? data?.id,
    orderId:
      data?.affiliate_details?.affiliate_order_id ??
      data?.orderId ??
      data?.order_id,
    orderValue: data?.order_value ?? data?.orderValue,
    price: prices?.amount_paid ?? data?.price,
    bagCount:
      data?.no_of_bags_order ??
      data?.total_shipment_bags ??
      data?.bagCount ??
      data?.bags?.length,
    paymentMode: data?.payment_mode ?? data?.paymentMode,
    airwaybill: data?.dp_details?.awb_no ?? data?.airwaybill,
    deliveryPartner: data?.dp_details?.name ?? data?.deliveryPartner,
    dpAssigned:
      data?.dp_assigned ?? data?.dpAssigned ?? data?.dp_details?.name ?? null,
    invoiceId: data?.invoice?.store_invoice_id ?? data?.invoiceId,
    expectedDeliveryDate: data?.expected_delivery_date ?? data?.expectedDeliveryDate,
    weight: normalizedWeight,
    fulfilment: {
      code: store?.code ?? data?.fulfilment?.code,
      sellerName: store?.name ?? data?.fulfilment?.sellerName,
      address: [
        storeAddress?.address1,
        storeAddress?.address2,
        storeAddress?.pincode ? `Pincode: ${storeAddress.pincode}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      companyId: store?.id ?? data?.fulfilment?.companyId,
    },
    priceBreakup: {
      mrp: prices?.price_marked ?? data?.priceBreakup?.mrp,
      amountPaid: prices?.amount_paid ?? data?.priceBreakup?.amountPaid,
      discount: prices?.discount ?? data?.priceBreakup?.discount,
      cashbackApplied:
        prices?.cashback_applied ?? data?.priceBreakup?.cashbackApplied,
      deliveryCharges:
        prices?.delivery_charge ?? data?.priceBreakup?.deliveryCharges,
      couponValue:
        prices?.coupon_effective_discount ?? data?.priceBreakup?.couponValue,
    },
    bags: normalizeBags(data?.bags),
  };
};

const DEFAULT_SAMPLE_SHIPMENT = {
  shipmentId: "SHIP-PLACEHOLDER",
  orderId: "JMD-23045001",
  orderDate: "2025-01-04T09:32:00+05:30",
  orderValue: 45990,
  price: 43990,
  bagCount: 1,
  manualAssignable: true,
  airwaybill: "AWB-998123",
  expectedDeliveryDate: "2025-01-10",
  invoiceId: "INV-22145",
  paymentMode: "Prepaid",
  weight: "5.2 kg",
  priceBreakup: {
    mrp: 45990,
    amountPaid: 43990,
    discount: 1500,
    cashbackApplied: 500,
    deliveryCharges: 0,
    couponValue: 1000,
  },
  fulfilment: {
    code: "SELL-201",
    sellerName: "Reliance Retail Ltd",
    address: "Reliance Corporate Park, Ghansoli, Navi Mumbai",
    companyId: "COMP-8891",
  },
  shipping: {
    customerName: "Ishaan Kulkarni",
    contact: "+91 98765 43210",
    address:
      "B-402, Palm Drive Residences, Sector 62, Gurugram, Haryana - 122102",
  },
  bags: [
    {
      id: "BAG-1001",
      sku: "SKU-879234",
      skuName: "Samsung Galaxy Tab S9",
      price: 45990,
      hsn: "HSN-9981",
      image:
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=60",
    },
    {
      id: "BAG-1001",
      sku: "SKU-879234",
      skuName: "Samsung Galaxy Tab S9",
      price: 45990,
      hsn: "HSN-9981",
      image:
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=60",
    },
    {
      id: "BAG-1001",
      sku: "SKU-879234",
      skuName: "Samsung Galaxy Tab S9",
      price: 45990,
      hsn: "HSN-9981",
      image:
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=60",
    },
    {
      id: "BAG-1001",
      sku: "SKU-879234",
      skuName: "Samsung Galaxy Tab S9",
      price: 45990,
      hsn: "HSN-9981",
      image:
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=60",
    },
  ],
};

const SAMPLE_SHIPMENTS = {
  "SHIP-50001": { ...DEFAULT_SAMPLE_SHIPMENT, shipmentId: "SHIP-50001" },
  default: { ...DEFAULT_SAMPLE_SHIPMENT, shipmentId: "SHIP-SAMPLE" },
};

const API = {
  fetchShipment: async (shipmentId) => {
    try {
      const response = await apiClient.post(
        "/__deku/api/v1/__jiomart/fetch/shipment",
        { shipment_id: shipmentId },
      );
      return { data: response?.data?.data ?? null, meta: { source: "api" } };
    } catch (error) {
      console.warn(
        "[OrderDetails] Falling back to sample shipment for",
        shipmentId,
        error,
      );
      const fallbackSource =
        SAMPLE_SHIPMENTS[shipmentId] ??
        (SAMPLE_SHIPMENTS.default
          ? { ...SAMPLE_SHIPMENTS.default, shipmentId }
          : null);
      const fallback = fallbackSource ? { ...fallbackSource } : null;
      return { data: fallback, meta: { source: "sample" } };
    }
  },
};

const SECTION_BOX =
  "rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm dark:border-gray-800 dark:bg-[#101114]";

const OrderDetails = () => {
  const { shipmentId = "" } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bagsOpen, setBagsOpen] = useState(false);
  const [selectedPosting, setSelectedPosting] = useState(null);
  const [postingModalOpen, setPostingModalOpen] = useState(false);
  const [postingsPanelOpen, setPostingsPanelOpen] = useState(false);
  const [dpManifestationOpen, setDpManifestationOpen] = useState(false);
  const [fulfilmentOpen, setFulfilmentOpen] = useState(false);
  const [priceBreakupOpen, setPriceBreakupOpen] = useState(false);
  const [jioFulfilmentOpen, setJioFulfilmentOpen] = useState(false);
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [activityHistory, setActivityHistory] = useState([]);
  const [lspHistory, setLspHistory] = useState([]);
  const [activityTab, setActivityTab] = useState("fynd");
  const fulfilmentPanelRef = useRef(null);
  const fulfilmentToggleRef = useRef(null);
  const [dpManifestationLoading, setDpManifestationLoading] = useState(false);
  const [dpManifestationError, setDpManifestationError] = useState("");
  const [lspPriority, setLspPriority] = useState(null);
  const [dpManifestation, setDpManifestation] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedDownstream, setSelectedDownstream] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const downstreamOptions = useMemo(
    () => [
      { label: "INFIBEAM", value: "IB" },
      { label: "ADDVERB", value: "ADV" },
      { label: "MSTAR", value: "MSTAR" },
      { label: "ROMS", value: "ROMS" },
      { label: "KONNECT (RTI)", value: "RTI" },
      { label: "RRA", value: "RRA" },
      { label: "JIOMART_POSDM", value: "JIOMART_POSDM" },
      { label: "KAPTURE", value: "KAPTURE" },
    ],
    [],
  );
  const [postingData, setPostingData] = useState([]);
  const [postingLoading, setPostingLoading] = useState(false);
  const [postingError, setPostingError] = useState("");
  const stateOptions = useMemo(() => {
    const uniqueStates = new Set(
      (postingData || [])
        .map((row) => row?.state)
        .filter((state) => Boolean(state)),
    );
    return Array.from(uniqueStates).map((state) => ({
      label: state,
      value: state,
    }));
  }, [postingData]);
  const activePosting = useMemo(() => {
    if (!selectedState) return null;
    return (postingData || []).find((row) => row.state === selectedState) || null;
  }, [postingData, selectedState]);

  const [historyPanelOpen, sethistoryPanelOpen] = useState(false);
  const [manualAssignModalOpen, setManualAssignModalOpen] = useState(false);
  const [selectedManualLsp, setSelectedManualLsp] = useState("");
  const [manualAssignSubmitting, setManualAssignSubmitting] = useState(false);
  const [usingSample, setUsingSample] = useState(false);

  const fetchShipment = useCallback(
    async (id) => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, meta } = await API.fetchShipment(id);
        if (!data) {
          enqueueSnackbar("Shipment details not found.", {
            variant: "warning",
          });
          return;
        }
        setShipment(normalizeShipment(data));
        setUsingSample(meta?.source === "sample");
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load shipment details.";
        enqueueSnackbar(message, { variant: "error" });
      } finally {
        setLoading(false);
      }
    },
    [enqueueSnackbar],
  );

  useEffect(() => {
    fetchShipment(shipmentId);
  }, [fetchShipment, shipmentId]);

  useEffect(() => {
    setSelectedState("");
  }, [selectedDownstream]);

  useEffect(() => {
    if (!selectedState) return;
    const hasState = (postingData || []).some(
      (row) => row?.state === selectedState,
    );
    if (!hasState) {
      setSelectedState("");
    }
  }, [postingData, selectedState]);

  useEffect(() => {
    if (!selectedDownstream) {
      setPostingData([]);
      setPostingError("");
      return;
    }
    const useOrderId = ["ROMS", "MSTAR"].includes(selectedDownstream);
    const identifier = useOrderId
      ? shipment?.orderId
      : shipment?.shipmentId;
    if (!identifier) {
      setPostingError("Missing identifier for selected system.");
      setPostingData([]);
      return;
    }
    let isActive = true;
    setPostingLoading(true);
    setPostingError("");
    apiClient
      .post("__deku/api/v1/__jiomart/fetch/posting-data", {
        primary_identifier: identifier,
        integration: selectedDownstream,
      })
      .then((response) => {
        if (!isActive) return;
        const rows = response?.data?.data || [];
        setPostingData(Array.isArray(rows) ? rows : []);
      })
      .catch((error) => {
        if (!isActive) return;
        setPostingError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to fetch posting data.",
        );
        setPostingData([]);
      })
      .finally(() => {
        if (isActive) setPostingLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedDownstream, shipment?.orderId, shipment?.shipmentId]);

  useEffect(() => {
    if (!dpManifestationOpen || !shipment?.shipmentId) return;
    let isActive = true;
    setDpManifestationLoading(true);
    setDpManifestationError("");
    setSelectedAccountId(null);

    Promise.all([
      apiClient.post("/__deku/api/v1/__jiomart/fetch/lsp-priority", {
        shipment_id: shipment.shipmentId,
      }),
      apiClient.post("/__deku/api/v1/__jiomart/fetch/dp-manifestation", {
        shipment_id: shipment.shipmentId,
      }),
    ])
      .then(([lspResponse, manifestationResponse]) => {
        if (!isActive) return;
        const lspData =
          lspResponse?.data?.data[0] ?? lspResponse?.data ?? null;
        const manifestationData =
          manifestationResponse?.data?.data ??
          manifestationResponse?.data ??
          null;
        setLspPriority(lspData);
        setDpManifestation(manifestationData);
      })
      .catch((error) => {
        if (!isActive) return;
        setDpManifestationError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load DP manifestation.",
        );
      })
      .finally(() => {
        if (isActive) {
          setDpManifestationLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [dpManifestationOpen, shipment?.shipmentId]);

  useEffect(() => {
    if (!activityPanelOpen) return;
    let isActive = true;
    setActivityLoading(true);
    setActivityError("");
    const payload = {
      bag_id: shipment?.bags?.[0]?.id,
      ...(shipment?.airwaybill ? { awb: shipment.airwaybill } : {}),
    };
    apiClient
      .post("/__deku/api/v1/__jiomart/fetch/kalpa-jmrt-status", payload)
      .then((response) => {
        if (!isActive) return;
        const payloadData = response?.data?.data ?? response?.data ?? {};
        const fynd =
          payloadData?.fynd_status ??
          payloadData?.activity_history ??
          payloadData?.data ??
          [];
        const lsp = payloadData?.lsp_status ?? [];
        setActivityHistory(Array.isArray(fynd) ? fynd : []);
        setLspHistory(Array.isArray(lsp) ? lsp : []);
      })
      .catch((error) => {
        if (!isActive) return;
        setActivityError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load activity history.",
        );
        setActivityHistory([]);
        setLspHistory([]);
      })
      .finally(() => {
        if (isActive) setActivityLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activityPanelOpen, shipment?.shipmentId]);

  useEffect(() => {
    if (!jioFulfilmentOpen) return;
    const handleOutsideClick = (event) => {
      const target = event.target;
      if (
        fulfilmentPanelRef.current?.contains(target) ||
        fulfilmentToggleRef.current?.contains(target)
      ) {
        return;
      }
      setJioFulfilmentOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [jioFulfilmentOpen]);

  const priceBreakup = shipment?.priceBreakup ?? {};

  const quickPrice = useMemo(
    () => [
      { label: "Order Value", value: formatCurrency(shipment?.orderValue) },
      {
        label: "Amount Paid",
        value: formatCurrency(priceBreakup.amountPaid ?? shipment?.price),
      },
      {
        label: "Manual DP Assign",
        value: shipment?.manualAssignable ? "Yes" : "No",
      },
    ],
    [
      priceBreakup.amountPaid,
      shipment?.manualAssignable,
      shipment?.orderValue,
      shipment?.price,
    ],
  );

  const tableRow = useMemo(
    () => ({
      shipmentId: shipment?.shipmentId ?? "—",
      orderId: shipment?.orderId ?? "—",
      orderValue: formatCurrency(shipment?.orderValue),
      price: formatCurrency(shipment?.price),
      bags: shipment?.bagCount ?? shipment?.bags?.length ?? "—",
      paymentMode: shipment?.paymentMode ?? "—",
    }),
    [shipment],
  );

  const normalizedOperationalState = String(
    shipment?.operational_status ?? shipment?.state ?? "",
  )
    .trim()
    .toLowerCase();
  const blockedManualStates = new Set([
    "cancelled_operations",
    "cancelled_customer",
    "cancelled_seller",
    "return_cancelled_at_dp",
    "cancelled_fynd",
    "refund_without_return",
  ]);
  const manualAssignDisabled =
    Boolean(shipment?.airwaybill) ||
    blockedManualStates.has(normalizedOperationalState) ||
    normalizedOperationalState.startsWith("rto");
  const manualAssignDisabledReason = shipment?.airwaybill
    ? "AWB already assigned."
    : normalizedOperationalState.startsWith("rto")
      ? "RTO flow does not allow manual DP assignment."
      : blockedManualStates.has(normalizedOperationalState)
        ? "Order is in a cancelled/refund state."
        : "";

  const handleManualLspAssign = async () => {
    if (!selectedManualLsp) {
      enqueueSnackbar("Select an LSP before assigning.", {
        variant: "warning",
      });
      return;
    }
    if (!shipment?.shipmentId) {
      enqueueSnackbar("Shipment ID is missing.", { variant: "warning" });
      return;
    }
    setManualAssignSubmitting(true);
    const lspLabel = LSP_LABEL_MAP[selectedManualLsp] ?? selectedManualLsp;
    const csvContent = [
      ["Shipment Id", "Alternate LSP"],
      [shipment.shipmentId, lspLabel],
    ]
      .map((row) => row.join(","))
      .join("\n");
    const file = new File([csvContent], "alternate-lsp.csv", {
      type: "text/csv",
    });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "alternate-lsp");
    try {
      await apiClient.post(
        "/__deku/api/v1/__jiomart/create-job/awb-generation",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      enqueueSnackbar("Alternate LSP assignment submitted.", {
        variant: "success",
      });
      setSelectedManualLsp("");
      setManualAssignModalOpen(false);
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to assign LSP.",
        { variant: "error" },
      );
    } finally {
      setManualAssignSubmitting(false);
    }
  };

  const renderLoadingState = () => (
    <div className="space-y-4">
      <Skeleton variant="rounded" height={120} />
      <Skeleton variant="rounded" height={200} />
      <Skeleton variant="rounded" height={300} />
    </div>
  );

  return (
    <PageLayout title="Order Detail">
      <div className="h-full w-full space-y-6 overflow-x-hidden overflow-y-auto p-1">
        {usingSample}

        {/* <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="rounded-full p-1 text-gray-500 transition hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300"
            aria-label="Back"
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </button>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {shipment?.shipmentId ?? shipmentId ?? "—"}
          </span>
        </div> */}

        {loading ? (
          renderLoadingState()
        ) : shipment ? (
          <>
            <div className="flex h-full flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex h-full flex-1 flex-col gap-5">
                <div className="flex flex-wrap justify-end gap-3">
                  {!jioFulfilmentOpen ? (
                    <Tooltip title="Show JioMart Fulfilment" arrow>
                      <button
                        type="button"
                        onClick={() => setJioFulfilmentOpen(true)}
                        className="inline-flex items-center justify-center rounded-lg border border-black/20 bg-white px-3 py-2 text-black transition hover:border-black/40 hover:bg-black/5 dark:border-white/30 dark:bg-white/5 dark:text-white"
                        aria-label="Show JioMart Fulfilment"
                        ref={fulfilmentToggleRef}
                      >
                        <ArrowBackIosNewIcon fontSize="inherit" />
                      </button>
                    </Tooltip>
                  ) : null}
                  <Tooltip title="View history" arrow>
                    <button
                      type="button"
                      onClick={() => setActivityPanelOpen(true)}
                      className="inline-flex items-center justify-center rounded-lg border border-black/20 bg-white px-3 py-2 text-black transition hover:border-black/40 hover:bg-black/5 dark:border-white/30 dark:bg-white/5 dark:text-white"
                      aria-label="View history"
                    >
                      <HistoryOutlinedIcon className="!text-lg" />
                    </button>
                  </Tooltip>
                  <Tooltip title="View postings" arrow>
                    <button
                      type="button"
                      onClick={() => setPostingsPanelOpen(true)}
                      className="inline-flex items-center justify-center rounded-lg border border-black/20 bg-white px-3 py-2 text-black transition hover:border-black/40 hover:bg-black/5 dark:border-white/30 dark:bg-white/5 dark:text-white"
                      aria-label="View postings"
                    >
                      <VisibilityOutlinedIcon className="!text-lg" />
                    </button>
                  </Tooltip>
                  <Tooltip title="DP manifestation" arrow>
                    <button
                      type="button"
                      onClick={() => setDpManifestationOpen(true)}
                      className="inline-flex items-center justify-center rounded-lg border border-black/20 bg-white px-3 py-2 text-black transition hover:border-black/40 hover:bg-black/5 dark:border-white/30 dark:bg-white/5 dark:text-white"
                      aria-label="DP manifestation"
                    >
                      <LocalShippingOutlinedIcon className="!text-lg" />
                    </button>
                  </Tooltip>
                </div>
                {shipment ? (
                  <div className="overflow-x-auto rounded-2xl border-2 border-orange-300 bg-white shadow-md dark:border-orange-500 dark:bg-[#0f1115]">
                    <table className="min-w-full text-left text-sm text-gray-700 dark:text-gray-100">
                      <thead className="bg-orange-50 text-xs font-semibold tracking-wide text-orange-700 uppercase dark:bg-orange-900/20 dark:text-orange-200">
                        <tr>
                          <th className="px-4 py-3">Shipment Id</th>
                          <th className="px-4 py-3">Order ID</th>
                          <th className="px-4 py-3">Order Value</th>
                          <th className="px-4 py-3">Price</th>
                          <th className="px-4 py-3">Bags</th>
                          <th className="px-4 py-3">Payment Mode</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-orange-100 text-base font-medium dark:border-orange-900/30">
                          <td className="px-4 py-4">{tableRow.shipmentId}</td>
                          <td className="px-4 py-4">{tableRow.orderId}</td>
                          <td className="px-4 py-4">{tableRow.orderValue}</td>
                          <td className="px-4 py-4">{tableRow.price}</td>
                          <td className="px-4 py-4">{tableRow.bags}</td>
                          <td className="px-4 py-4">{tableRow.paymentMode}</td>
                          <td className="px-4 py-4 text-right">
                            <Tooltip
                              title={
                                manualAssignDisabled
                                  ? manualAssignDisabledReason
                                  : "Assign a delivery partner manually"
                              }
                              arrow
                            >
                              <span>
                                <button
                                  type="button"
                                  onClick={() => setManualAssignModalOpen(true)}
                                  disabled={manualAssignDisabled}
                                  className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                                    manualAssignDisabled
                                      ? "cursor-not-allowed border-gray-300 text-gray-400"
                                      : "border-orange-400 text-orange-600 hover:bg-orange-50 dark:border-orange-300 dark:text-orange-200 dark:hover:bg-orange-200/10"
                                  }`}
                                >
                                  Manual DP Assign
                                </button>
                              </span>
                            </Tooltip>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <div
                  className={`${SECTION_BOX} border-purple-200 shadow-[0_10px_30px_rgba(168,85,247,0.18)]`}
                >
                  <div className="grid gap-6 md:grid-cols-3 md:items-start">
                    <div className="md:col-span-1 space-y-3 p-3 text-sm break-words text-gray-800 dark:text-gray-200">
                      <div className="flex items-center justify-between">
                        <p>
                          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                            {shipment?.operational_status ?? shipment?.state ?? "—"}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            Airwaybill:
                          </span>{" "}
                          {shipment.airwaybill ?? "—"}
                        </p>
                      </div>
                      {[
                        [
                          "Delivery Partner",
                          shipment.deliveryPartner ?? "—",
                        ],
                        [
                          "Expected Delivery Date",
                          shipment.expectedDeliveryDate ?? "—",
                        ],
                        [
                          "Invoice ID",
                          shipment.invoiceId
                            ? `${shipment.invoiceId}${shipment.paymentMode ? ` (${shipment.paymentMode})` : ""}`
                            : "—",
                        ],
                        ["Weight", formatWeight(shipment.weight)],
                      ].map(([label, value]) => (
                        <p key={label}>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {label}:
                          </span>{" "}
                          {value}
                        </p>
                      ))}
                    </div>
                    <div className="md:col-span-2">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 shadow-inner dark:border-gray-800 dark:bg-[#0f1115]">
                        <button
                          type="button"
                          onClick={() => setBagsOpen((open) => !open)}
                          className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide text-gray-600 transition hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                        >
                          <span className="flex items-center gap-2">
                            Bags
                            {shipment?.bags?.length ? (
                              <span className="rounded-md bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700 dark:bg-white/10 dark:text-gray-200">
                                {shipment.bags.length}
                              </span>
                            ) : null}
                          </span>
                          {bagsOpen ? (
                            <ExpandLessIcon fontSize="small" />
                          ) : (
                            <ExpandMoreIcon fontSize="small" />
                          )}
                        </button>
                        {bagsOpen ? (
                          !shipment?.bags?.length ? (
                            <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-[#0c0d11] dark:text-gray-400">
                              No bag level data available.
                            </div>
                          ) : (
                            <div className="mt-3 space-y-3 pr-1">
                              {shipment.bags.map((bag) => (
                                <div
                                  key={bag.id}
                                  className="flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white p-2 shadow-sm transition hover:border-blue-400 dark:border-gray-700 dark:bg-[#0c0d11] dark:hover:border-blue-500"
                                >
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5">
                                    {bag.image ? (
                                      <img
                                        src={bag.image}
                                        alt={bag.skuName}
                                        className="h-10 w-10 rounded-2xl object-cover"
                                      />
                                    ) : (
                                      <span className="text-xs font-semibold text-gray-500">
                                        {bag.sku?.slice(-3) ?? "SKU"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-5 text-sm font-semibold break-words text-gray-900 dark:text-gray-100">
                                    <p>
                                      Bag ID:{" "}
                                      <span
                                        className={`font-mono ${
                                          bag.isActive === true
                                            ? "text-emerald-500 drop-shadow-[0_0_6px_rgba(34,197,94,0.65)]"
                                            : bag.isActive === false
                                              ? "text-rose-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.65)]"
                                              : ""
                                        }`}
                                      >
                                        {bag.id}
                                      </span>
                                    </p>
                                    <p>
                                      SKU:{" "}
                                      <span className="font-normal text-gray-700 dark:text-gray-300">
                                        {bag.sku}
                                      </span>
                                    </p>
                                    <p>
                                      Price:{" "}
                                      <span className="font-normal text-gray-700 dark:text-gray-300">
                                        {formatCurrency(bag.price)}
                                      </span>
                                    </p>
                                    <p>
                                      HSN:{" "}
                                      <span className="font-normal text-gray-700 dark:text-gray-300">
                                        {bag.hsn || "—"}
                                      </span>
                                    </p>
                                    <p>
                                      Jio Code:{" "}
                                      <span className="font-normal text-gray-700 dark:text-gray-300">
                                        {bag.jioCode || "—"}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {jioFulfilmentOpen ? (
                <div
                  className="flex h-full w-full flex-col lg:w-[26rem] lg:shrink-0"
                  ref={fulfilmentPanelRef}
                >
                  <div
                    className={`${SECTION_BOX} flex h-full min-h-full flex-col border-2 border-blue-200`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white p-1">
                          <img
                            src="/assets/jiomart_logo.svg"
                            alt="JioMart"
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            JioMart Fulfilment
                          </p>
                        </div>
                      </div>
                    </div>

                    <>
                      <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="rounded-xl border border-blue-200/70 bg-white p-4 shadow-sm dark:border-blue-700/60 dark:bg-[#0b0c0f]">
                          <button
                            type="button"
                            onClick={() => setFulfilmentOpen((open) => !open)}
                            className="mb-3 flex w-full items-center justify-between text-left"
                          >
                            <h4 className="text-xs font-semibold tracking-wide text-blue-800 uppercase dark:text-blue-100">
                              Fulfilment Data
                            </h4>
                            {fulfilmentOpen ? (
                              <ExpandLessIcon fontSize="small" />
                            ) : (
                              <ExpandMoreIcon fontSize="small" />
                            )}
                          </button>
                          {fulfilmentOpen ? (
                            <dl className="divide-y divide-blue-100/80 text-sm dark:divide-blue-900/40">
                              {[
                                ["Code", shipment?.fulfilment?.code ?? "—"],
                                ["Seller", shipment?.fulfilment?.sellerName ?? "—"],
                                ["Address", shipment?.fulfilment?.address ?? "—"],
                                ["Company ID", shipment?.fulfilment?.companyId ?? "—"],
                              ].map(([label, value]) => (
                                <div
                                  key={label}
                                  className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                                >
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-200">
                                    {label}
                                  </dt>
                                  <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="rounded-xl border border-emerald-200/70 bg-white p-4 shadow-sm dark:border-emerald-700/60 dark:bg-[#0b0c0f]">
                          <button
                            type="button"
                            onClick={() => setPriceBreakupOpen((open) => !open)}
                            className="mb-3 flex w-full items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-semibold tracking-wide text-emerald-800 uppercase dark:text-emerald-100">
                                Price Breakup
                              </h4>
                              <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-800/60">
                                INR
                              </span>
                            </div>
                            {priceBreakupOpen ? (
                              <ExpandLessIcon fontSize="small" />
                            ) : (
                              <ExpandMoreIcon fontSize="small" />
                            )}
                          </button>
                          {priceBreakupOpen ? (
                            <dl className="space-y-2">
                              {[
                                ["MRP", priceBreakup.mrp],
                                ["Amount Paid", priceBreakup.amountPaid],
                                ["Discount", priceBreakup.discount],
                                ["Cashback Applied", priceBreakup.cashbackApplied],
                                ["Delivery Charges", priceBreakup.deliveryCharges],
                                ["Coupon Value", priceBreakup.couponValue],
                              ].map(([label, value]) => (
                                <div
                                  key={label}
                                  className="flex items-center justify-between rounded-lg border border-emerald-100/50 bg-white/70 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-emerald-800/50 dark:bg-emerald-900/20"
                                >
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-100">
                                    {label}
                                  </dt>
                                  <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {value !== undefined
                                      ? formatCurrency(value)
                                      : "—"}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          ) : null}
                        </div>
                      </div>
                    </>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white/80 p-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-[#101114] dark:text-gray-300">
            Shipment not found. Try selecting a shipment from the Orders page.
          </div>
        )}
      </div>

      <Drawer
        anchor="bottom"
        open={historyPanelOpen}
        onClose={() => sethistoryPanelOpen(false)}
        PaperProps={{
          sx: {
            height: { xs: "75vh", sm: "70vh" },
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: "hidden",
          },
        }}
      >
        <div className="flex h-full flex-col bg-white dark:bg-[#0b0c0f]">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Order History
              </p>
            </div>
            <button
              type="button"
              onClick={() => sethistoryPanelOpen(false)}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/20"
              aria-label="Close history"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <OrderHistory />
          </div>
        </div>
      </Drawer>

      <Drawer
        anchor="right"
        open={postingsPanelOpen}
        onClose={() => setPostingsPanelOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "80vw", lg: "45vw" },
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
            overflow: "hidden",
          },
        }}
      >
        <div className="flex h-full flex-col bg-white dark:bg-[#0b0c0f]">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                View Postings
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPostingsPanelOpen(false)}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/20"
              aria-label="Close postings"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Shipment
                  </label>
                  <input
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-[#0c0d11] dark:text-gray-100"
                    value={shipment?.shipmentId || ""}
                    disabled
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Order Id
                  </label>
                  <input
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-[#0c0d11] dark:text-gray-100"
                    value={shipment?.orderId || ""}
                    disabled
                  />
                </div>
              </div>

              <div>
                <CustomDropdown
                  options={downstreamOptions}
                  value={
                    downstreamOptions.find(
                      (opt) => opt.value === selectedDownstream,
                    ) || null
                  }
                  onChange={(opt) => setSelectedDownstream(opt?.value || "")}
                  placeholder="Select Downstream System"
                  searchable={false}
                  buttonClassName="w-full border-gray-200 bg-white text-sm font-medium text-gray-800 shadow-sm transition focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-[#0c0d11] dark:text-gray-100"
                />
              </div>

              <div>
                <CustomDropdown
                  options={stateOptions}
                  value={
                    stateOptions.find((opt) => opt.value === selectedState) ||
                    null
                  }
                  onChange={(opt) => setSelectedState(opt?.value || "")}
                  placeholder="Select State"
                  searchable={false}
                  isDisabled={!selectedDownstream || postingLoading}
                  buttonClassName="w-full border-gray-200 bg-white text-sm font-medium text-gray-800 shadow-sm transition focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#0c0d11] dark:text-gray-100"
                />
              </div>

              {postingLoading ? (
                <div className="space-y-3">
                  <Skeleton variant="rounded" height={140} />
                  <Skeleton variant="rounded" height={220} />
                </div>
              ) : postingError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {postingError}
                </div>
              ) : selectedDownstream && activePosting ? (
                <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#0c0d11]">
                  <div className="grid gap-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <div className="flex justify-between">
                      <span>State:</span>
                      <span>{activePosting.state}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${
                          activePosting.status === "completed"
                            ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-700/60"
                            : activePosting.status === "retry"
                              ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-700/60"
                              : "bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-700/60"
                        }`}
                      >
                        {activePosting.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Retry Count:</span>
                      <span>{activePosting.retry_count ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>State Index:</span>
                      <span>{activePosting.state_index ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created On:</span>
                      <span>{activePosting.created_on ?? "—"}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      payload
                    </p>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-[#0c0d11]">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          JSON Viewer
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              formatRawPayload(activePosting.payload),
                            )
                          }
                          className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800 dark:border-gray-700 dark:text-gray-300"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-xs text-gray-800 dark:bg-[#0b0c0f] dark:text-gray-100">
                        {activePosting.payload ? (
                          <code
                            className="block font-mono"
                            dangerouslySetInnerHTML={renderJsonHtml(
                              activePosting.payload,
                            )}
                          />
                        ) : (
                          "No payload"
                        )}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      response_text
                    </p>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-[#0c0d11]">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          JSON Viewer
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              formatRawPayload(activePosting.response_text),
                            )
                          }
                          className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800 dark:border-gray-700 dark:text-gray-300"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-xs text-gray-800 dark:bg-[#0b0c0f] dark:text-gray-100">
                        {activePosting.response_text ? (
                          <code
                            className="block font-mono"
                            dangerouslySetInnerHTML={renderJsonHtml(
                              activePosting.response_text,
                            )}
                          />
                        ) : (
                          "No response_text"
                        )}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : selectedDownstream ? (
                <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-inner dark:border-gray-800 dark:bg-[#0c0d11] dark:text-gray-400">
                  Select a state to view payloads.
                </div>
              ) : (
                <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-inner dark:border-gray-800 dark:bg-[#0c0d11] dark:text-gray-400">
                  <div className="relative flex flex-col items-center gap-4">
                    <div className="absolute inset-0 -z-10 max-w-[160px] rounded-[28px] bg-gradient-to-br from-gray-200/20 via-gray-300/15 to-gray-400/10 blur-2xl dark:from-white/10 dark:via-white/5 dark:to-white/0" />
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-gray-900 via-gray-700 to-gray-500 shadow-lg shadow-black/10 dark:from-white/30 dark:via-white/20 dark:to-white/10">
                      <svg
                        viewBox="0 0 64 64"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 text-white"
                      >
                        <path
                          d="M14 32c0-9.941 8.059-18 18-18s18 8.059 18 18-8.059 18-18 18"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                        <path
                          d="M24 28h10.5a5.5 5.5 0 0 1 0 11H30"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M28 24 18 32l10 8"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="27"
                          cy="32"
                          r="5"
                          fill="currentColor"
                          opacity="0.16"
                        />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        Pick a downstream system
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Choose an option to load its posting payloads.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Drawer>

      <Drawer
        anchor="right"
        open={activityPanelOpen}
        onClose={() => setActivityPanelOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "80vw", lg: "50vw" },
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
            overflow: "hidden",
          },
        }}
      >
        <div className="flex h-full flex-col bg-gradient-to-b from-amber-50 via-white to-sky-50 dark:from-[#0b0c0f] dark:via-[#0c0d11] dark:to-[#0b0c0f]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-gray-800 dark:bg-[#0b0c0f]/70">
            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => setActivityTab("fynd")}
                className={`pb-1 text-xs font-semibold uppercase tracking-wide ${
                  activityTab === "fynd"
                    ? "border-b-2 border-amber-500 text-gray-900 dark:border-amber-300 dark:text-gray-100"
                    : "text-[11px] text-slate-400"
                }`}
              >
                Fynd Status
              </button>
              <button
                type="button"
                onClick={() => setActivityTab("lsp")}
                className={`pb-1 text-xs font-semibold uppercase tracking-wide ${
                  activityTab === "lsp"
                    ? "border-b-2 border-sky-500 text-gray-900 dark:border-sky-300 dark:text-gray-100"
                    : "text-[11px] text-slate-400"
                }`}
              >
                LSP Status
              </button>
            </div>
            <button
              type="button"
              onClick={() => setActivityPanelOpen(false)}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/20"
              aria-label="Close activity history"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {activityLoading ? (
              <div className="space-y-3">
                <Skeleton variant="rounded" height={120} />
                <Skeleton variant="rounded" height={120} />
                <Skeleton variant="rounded" height={120} />
              </div>
            ) : activityError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {activityError}
              </div>
            ) : activityTab === "fynd" && activityHistory.length ? (
              <div className="space-y-3">
                {activityHistory.map((item, index) => {
                  const parsed = parseActivityMessage(item?.bag_activity);
                  const message =
                    parsed?.message ?? parsed?.status ?? "Activity update";
                  const reason = parsed?.reason ?? null;
                  const reasonText =
                    reason && typeof reason === "object"
                      ? reason.display_name
                        ? `${reason.display_name}${reason.text ? ` (${reason.text})` : ""}`
                        : reason.text ?? null
                      : reason;
                  const createdBy = item?.created_by ?? "—";
                  const shortCreatedBy =
                    createdBy.length > 12
                      ? `${createdBy.slice(0, 12)}...`
                      : createdBy;
                  const createdAt = formatActivityDate(item?.created_at);
                  const isSystem =
                    String(createdBy).toLowerCase() === "system";
                  const AvatarIcon = isSystem
                    ? SettingsOutlinedIcon
                    : PersonOutlineIcon;
                  return (
                    <div
                      key={`${item?.created_at ?? "activity"}-${index}`}
                      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-amber-100/60 dark:border-gray-800 dark:bg-[#0c0d11]"
                    >
                      <span
                        className={`absolute left-0 top-0 h-full w-1 ${
                          isSystem ? "bg-amber-400" : "bg-sky-400"
                        }`}
                      />
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="min-w-[100px] text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          <span className="block">{createdAt.date}</span>
                          <span className="block">{createdAt.time}</span>
                        </div>
                        <div className="flex-1 space-y-1 text-xs text-gray-700 dark:text-gray-200">
                          <p>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {message}
                            </span>{" "}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              Reason:
                            </span>{" "}
                            {reasonText || "—"}
                          </p>
                        </div>
                        <div className="flex w-16 flex-col items-center justify-center gap-1.5 text-gray-600 dark:text-gray-300">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm ${
                              isSystem
                                ? "border-amber-200 bg-amber-50 text-amber-600"
                                : "border-sky-200 bg-sky-50 text-sky-600"
                            } dark:border-gray-700 dark:bg-white/5 dark:text-gray-200`}
                          >
                            <AvatarIcon fontSize="inherit" />
                          </div>
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            {shortCreatedBy}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : activityTab === "lsp" && lspHistory.length ? (
              <div className="space-y-3">
                {lspHistory.map((item, index) => {
                  const createdAt = formatActivityDate(item?.created_at);
                  return (
                    <div
                      key={`${item?.created_at ?? "lsp"}-${index}`}
                      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-amber-100/60 dark:border-gray-800 dark:bg-[#0c0d11]"
                    >
                      <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="min-w-[100px] text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          <span className="block">{createdAt.date}</span>
                          <span className="block">{createdAt.time}</span>
                        </div>
                        <div className="flex-1 space-y-1 text-xs text-gray-700 dark:text-gray-200">
                          <p>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              Status:
                            </span>{" "}
                            {item?.status ?? "—"}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              Location:
                            </span>{" "}
                            {item?.location ?? "—"}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              Reason:
                            </span>{" "}
                            {item?.reason ?? "—"}
                          </p>
                        </div>
                        <div className="flex w-16 flex-col items-center justify-center gap-1.5 text-gray-600 dark:text-gray-300">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-600 shadow-sm dark:border-gray-700 dark:bg-white/5 dark:text-gray-200">
                            <LocalShippingOutlinedIcon fontSize="inherit" />
                          </div>
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            {item?.awb ? "LSP" : "STATUS"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-inner dark:border-gray-800 dark:bg-[#0c0d11] dark:text-gray-400">
                {activityTab === "lsp"
                  ? "No LSP status available."
                  : "No activity history available."}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      <PostingsModal
        open={postingModalOpen}
        onClose={() => {
          setPostingModalOpen(false);
          setSelectedPosting(null);
        }}
        shipmentId={shipment?.shipmentId}
        payload={selectedPosting}
      />

      <DPManifestationModal
        open={dpManifestationOpen}
        onClose={() => setDpManifestationOpen(false)}
        shipment={shipment}
        lspPriority={lspPriority}
        manifestation={dpManifestation}
        loading={dpManifestationLoading}
        error={dpManifestationError}
        selectedAccountId={selectedAccountId}
        onSelectAccount={(value) => setSelectedAccountId(value)}
      />

      <CustomModal
        open={manualAssignModalOpen}
        onClose={() => setManualAssignModalOpen(false)}
        size="sm"
        isDark={false}
      >
        <div className="space-y-5 p-4">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Manual DP Assign
            </h3>
            <div className="border-b border-dashed border-gray-200" />
            <p className="text-sm font-semibold text-gray-700">
              {shipment?.shipmentId ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-4">
            <div className="flex flex-wrap gap-4 text-sm text-gray-700">
              {Object.entries(LSP_LABEL_MAP).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <input
                    type="radio"
                    name="manual-lsp"
                    value={key}
                    checked={selectedManualLsp === key}
                    onChange={() => setSelectedManualLsp(key)}
                    className="h-4 w-4 accent-black"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleManualLspAssign}
              className="rounded-full border border-gray-300 bg-white px-8 py-2 text-sm font-semibold uppercase tracking-wide text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!selectedManualLsp || manualAssignSubmitting}
            >
              {manualAssignSubmitting ? "Assigning..." : "Assign LSP"}
            </button>
          </div>
        </div>
      </CustomModal>
    </PageLayout>
  );
};

export default OrderDetails;

// Modal for postings
const PostingsModal = ({
  open,
  onClose,
  shipmentId,
  payload,
}) => (
  <CustomModal open={open} onClose={onClose} size="lg" isDark={false}>
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {shipmentId || "{shipment_id}"}
          </p>
          <h3 className="text-lg font-semibold text-gray-900">Posting Payload</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
          aria-label="Close payload"
        >
          <CloseIcon fontSize="small" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            raw
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-800">
            {payload?.raw ? JSON.stringify(payload.raw, null, 2) : "No raw payload"}
          </pre>
        </div>
        <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            raw_response
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-800">
            {payload?.raw_response
              ? JSON.stringify(payload.raw_response, null, 2)
              : "No raw response"}
          </pre>
        </div>
      </div>
    </div>
  </CustomModal>
);

const formatRawPayload = (value) => {
  if (!value) return "—";
  if (typeof value !== "string") {
    return JSON.stringify(value, null, 2);
  }
  const cleaned = value.replace(/\\/g, "");
  try {
    return JSON.stringify(JSON.parse(cleaned), null, 2);
  } catch (error) {
    return cleaned;
  }
};

const renderJsonHtml = (value) => {
  const raw = formatRawPayload(value);
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const highlighted = escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?/g,
    (match) => {
      let className = "text-slate-700";
      if (match.startsWith('"')) {
        className = match.endsWith(":")
          ? "text-indigo-600"
          : "text-emerald-700";
      } else if (match === "true" || match === "false") {
        className = "text-amber-600";
      } else if (match === "null") {
        className = "text-rose-600";
      } else {
        className = "text-sky-600";
      }
      return `<span class="${className}">${match}</span>`;
    },
  );
  return { __html: highlighted };
};

const getLspAccountId = (lspName) => {
  if (typeof lspName === "number") return lspName;
  return LSP_ACCOUNT_MAP[lspName] ?? null;
};

const formatLspLabel = (name, accountId) => {
  if (name && LSP_LABEL_MAP[name]) return LSP_LABEL_MAP[name];
  if (name && typeof name === "string") {
    return name.replace(/_/g, " ").trim();
  }
  if (accountId != null) {
    return LSP_ACCOUNT_LABEL_MAP[String(accountId)] ?? String(accountId);
  }
  return "—";
};

const DPManifestationModal = ({
  open,
  onClose,
  shipment,
  lspPriority,
  manifestation,
  loading,
  error,
  selectedAccountId,
  onSelectAccount,
}) => {
  const handleManifestationDownload = () => {
    const payload = manifestation ?? {};
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const shipmentKey =
      manifestation?.shipment_id ?? shipment?.shipmentId ?? "manifestation";
    link.href = url;
    link.download = `dp-manifestation-${shipmentKey}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const records = manifestation?.records ?? [];
  const normalizedSelected =
    selectedAccountId != null ? String(selectedAccountId) : null;
  const matchedRecord =
    normalizedSelected != null
      ? records.find(
          (record) => String(record.account_id) === normalizedSelected,
        )
      : null;
  const lspKeys = ["LSP1", "LSP2", "LSP3", "LSP4", "LSP5"];
  const priorityNodes = lspKeys
    .map((key) => {
      const lspName = lspPriority?.[key] ?? null;
      if (!lspName) return null;
      return {
        key: `priority-${key}`,
        name: lspName,
        accountId: getLspAccountId(lspName),
        isPriority: true,
      };
    })
    .filter(Boolean);
  const priorityAccountIds = new Set(
    priorityNodes
      .map((node) => node.accountId)
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value)),
  );
  const extraNodes = records
    .filter(
      (record) => !priorityAccountIds.has(String(record.account_id ?? "")),
    )
    .map((record, index) => ({
      key: `extra-${record.account_id}-${index}`,
      name: null,
      accountId: record.account_id,
      isPriority: false,
    }));
  const combinedNodes = [...priorityNodes, ...extraNodes].slice(0, 5);
  const lspNodes = Array.from({ length: 5 }).map((_, index) => {
    const node = combinedNodes[index];
    if (!node) {
      return {
        key: `empty-${index}`,
        name: null,
        accountId: null,
        isPriority: false,
        isEmpty: true,
      };
    }
    return { ...node, isEmpty: false };
  });

  return (
    <CustomModal open={open} onClose={onClose} size="xl" isDark={false}>
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              DP Manifestation
            </h3>
          </div>
          <button
            type="button"
            onClick={handleManifestationDownload}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:bg-gray-50"
          >
            Download
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={220} />
            <Skeleton variant="rounded" height={160} />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-semibold text-gray-900">
                    Shipment ID:
                  </span>{" "}
                  {manifestation?.shipment_id ?? shipment?.shipmentId ?? "—"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    LSP Assigned:
                  </span>{" "}
                  {shipment?.dpAssigned ?? shipment?.deliveryPartner ?? "—"}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Airwaybill:
                  </span>{" "}
                  {shipment?.airwaybill ?? "—"}
                </p>
              </div>
              <div className="flex items-start justify-end" />
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Promised LSP Priority
              </h4>
              <div className="relative rounded-2xl border border-dashed border-gray-300 bg-white/90 px-4 py-6">
                <div className="absolute left-6 right-6 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-sky-200 via-violet-200 to-amber-200 md:block" />
                <div className="grid gap-6 md:grid-cols-5">
                  {lspNodes.map((node, index) => {
                    const isActive =
                      node.accountId != null &&
                      String(selectedAccountId) === String(node.accountId);
                    const glow =
                      index % 2 === 0
                        ? "shadow-[0_0_24px_rgba(56,189,248,0.35)]"
                        : "shadow-[0_0_24px_rgba(167,139,250,0.35)]";
                    const offset =
                      index % 2 === 0 ? "-translate-y-4" : "translate-y-4";
                    const baseCircle =
                      "flex h-12 w-12 items-center justify-center rounded-full border-2 transition";
                    const circleClass = node.isEmpty
                      ? "border-gray-200 bg-gray-100 text-gray-400"
                      : isActive
                        ? "border-orange-400 bg-orange-500 text-white shadow-[0_0_28px_rgba(249,115,22,0.75)]"
                        : `border-gray-300 bg-white text-gray-800 group-hover:border-gray-400 ${glow}`;
                    const innerCircle = node.isPriority ? (
                      <span className="absolute inset-[7px] rounded-full border border-current opacity-80" />
                    ) : null;
                    const outerGlow = node.isPriority
                      ? "ring-2 ring-sky-300/60 ring-offset-2 ring-offset-white shadow-[0_0_18px_rgba(56,189,248,0.25)]"
                      : "";
                    return (
                      <button
                        key={node.key}
                        type="button"
                        onClick={() =>
                          node.accountId != null &&
                          onSelectAccount(node.accountId)
                        }
                        className={`group flex flex-col items-center gap-2 text-xs font-semibold ${
                          node.isEmpty ? "text-gray-400" : "text-gray-600"
                        } ${offset}`}
                        disabled={node.isEmpty}
                      >
                        <span
                          className={`${baseCircle} ${circleClass} ${outerGlow} relative`}
                        >
                          {innerCircle}
                          {node.accountId ?? ""}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide">
                          {formatLspLabel(node.name, node.accountId).toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Raw Request
                </p>
                <pre className="h-44 overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">
                  {matchedRecord ? (
                    <code
                      className="block font-mono"
                      dangerouslySetInnerHTML={renderJsonHtml(
                        matchedRecord.raw_request,
                      )}
                    />
                  ) : (
                    "Select an account to view payloads."
                  )}
                </pre>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Raw Response
                </p>
                <pre className="h-44 overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">
                  {matchedRecord ? (
                    <code
                      className="block font-mono"
                      dangerouslySetInnerHTML={renderJsonHtml(
                        matchedRecord.raw_response,
                      )}
                    />
                  ) : (
                    "Select an account to view payloads."
                  )}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>
    </CustomModal>
  );
};
