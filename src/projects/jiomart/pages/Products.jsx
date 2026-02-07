import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import PageLayout from "../../../components/PageLayout";
import CustomModal from "../../../components/CustomModal";
import SearchBar from "../../../components/SearchBar";
import IOSToggle from "../../../components/IOSToggle";
import apiClient from "../../../api/client";
import { selectUserEmail } from "../../../store/user";
import AddToPhotosOutlinedIcon from "@mui/icons-material/AddToPhotosOutlined";
import * as XLSX from "xlsx";
// Category icons (MUI)
import DevicesOtherIcon from "@mui/icons-material/DevicesOther"; // Electronics (default)
import DiamondIcon from "@mui/icons-material/Diamond"; // Jewellery
import CheckroomIcon from "@mui/icons-material/Checkroom"; // Fashion
import BrushIcon from "@mui/icons-material/Brush"; // Crafts of India
import MenuBookIcon from "@mui/icons-material/MenuBook"; // Books
import BuildIcon from "@mui/icons-material/Build"; // Home Improvement
import KitchenIcon from "@mui/icons-material/Kitchen"; // Home & Kitchen
import LocalGroceryStoreIcon from "@mui/icons-material/LocalGroceryStore"; // Groceries
import ToysOutlinedIcon from "@mui/icons-material/ToysOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";

// -------------------- Category Mappings --------------------
const CATEGORY_ICON = {
  ELECTRONICS: DevicesOtherIcon,
  JEWELLERY: DiamondIcon,
  FASHION: CheckroomIcon,
  CRAFTSOFINDIA: BrushIcon,
  SPORTSTOYSLUGGAGE: ToysOutlinedIcon,
  BOOKS: MenuBookIcon,
  HOMEIMPROVEMENT: BuildIcon,
  HOMEANDKITCHEN: KitchenIcon,
  GROCERIES: LocalGroceryStoreIcon,
};

const CATEGORY_LABEL = {
  ELECTRONICS: "Electronics",
  JEWELLERY: "Jewellery",
  FASHION: "Fashion",
  CRAFTSOFINDIA: "Crafts of India",
  SPORTSTOYSLUGGAGE: "Sports, Toys & Luggage",
  BOOKS: "Books",
  HOMEIMPROVEMENT: "Home Improvement",
  HOMEANDKITCHEN: "Home & Kitchen",
  GROCERIES: "Groceries",
};

// Optional: visual accent per vertical (for header band)
const CATEGORY_STYLE = {
  ELECTRONICS: {
    bg: "from-sky-400/30 to-sky-600/20",
    icon: "text-sky-400 dark:text-sky-300",
  },
  JEWELLERY: {
    bg: "from-amber-400/30 to-amber-600/20",
    icon: "text-amber-400 dark:text-amber-300",
  },
  FASHION: {
    bg: "from-fuchsia-400/30 to-pink-600/20",
    icon: "text-fuchsia-400 dark:text-fuchsia-300",
  },
  CRAFTSOFINDIA: {
    bg: "from-orange-400/30 to-rose-600/20",
    icon: "text-orange-400 dark:text-orange-300",
  },
  SPORTSTOYSLUGGAGE: {
    bg: "from-emerald-400/30 to-teal-600/20",
    icon: "text-emerald-400 dark:text-emerald-300",
  },
  BOOKS: {
    bg: "from-indigo-400/30 to-blue-600/20",
    icon: "text-indigo-400 dark:text-indigo-300",
  },
  HOMEIMPROVEMENT: {
    bg: "from-yellow-400/30 to-orange-600/20",
    icon: "text-yellow-500 dark:text-yellow-300",
  },
  HOMEANDKITCHEN: {
    bg: "from-rose-400/30 to-red-600/20",
    icon: "text-rose-400 dark:text-rose-300",
  },
  GROCERIES: {
    bg: "from-lime-400/30 to-green-600/20",
    icon: "text-lime-500 dark:text-lime-300",
  },
};

const DEFAULT_CATEGORY_STYLE = {
  bg: "from-slate-400/30 to-slate-600/10",
  icon: "text-slate-500 dark:text-slate-300",
};

const getCategoryStyle = (key) => CATEGORY_STYLE[key] || DEFAULT_CATEGORY_STYLE;
const HISTORY_TABS = [
  { value: "me", label: "My history" },
  { value: "all", label: "All history" },
];

const formatHistoryStatus = (status) => {
  if (!status) return "Unknown";
  return String(status)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getHistoryStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["success", "completed"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (["failed", "error", "rejected"].includes(normalized)) {
    return "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300";
  }
  if (["processing", "pending", "queued", "in_progress"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
  }
  return "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-200";
};

function classNames() {
  return Array.from(arguments).filter(Boolean).join(" ");
}

// Generate combo sample XLSX on the fly
const generateComboXlsx = () => {
  const headers = [
    "Combo ArticleCode",
    "Location",
    "master_store_code",
    "SKU Code",
    "ArticleDescription",
    "MRP",
    "Combo MRP",
    "DiscountOn MRP",
    "ComboOffer",
    "ESP",
  ];
  const sampleRow = [
    "SAMPLE_ARTICLE",
    "STORE_1",
    "MS1",
    "SKU123",
    "Sample Article",
    "1000",
    "900",
    "10%",
    "OFFER1",
    "800",
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Combo");
  XLSX.writeFile(workbook, "combo-update-sample.xlsx");
};

const normalizeVerticalKey = (vertical) => {
  if (!vertical) return "GROCERIES";
  const normalized = String(vertical)
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
  return normalized || "GROCERIES";
};

const getApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data || error?.data || {};
  if (typeof data?.error === "string" && data.error) return data.error;
  if (typeof data?.message === "string" && data.message) return data.message;
  if (typeof error?.message === "string" && error.message) return error.message;
  return fallback;
};

const INDIA_TIME_ZONE = "Asia/Kolkata";

const parseTimestampMs = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const asNumber =
    typeof value === "number"
      ? value
      : Number.isNaN(Number(value))
        ? /** @type {number} */ (Date.parse(value))
        : Number(value);

  if (Number.isNaN(asNumber)) return null;

  const ms = asNumber < 1e12 ? asNumber * 1000 : asNumber;
  if (Number.isNaN(ms)) return null;
  return ms;
};

const formatDateTime = (value) => {
  const timestampMs = parseTimestampMs(value);
  if (timestampMs === null) return "N/A";

  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) return "N/A";

  // If the parsed date is before 2022, normalize to 1 Jan 2022 (IST)
  const fallbackDate = new Date("2022-01-01T00:00:00+05:30");
  if (date.getFullYear() < 2022) {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: INDIA_TIME_ZONE,
    }).format(fallbackDate);
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: INDIA_TIME_ZONE,
  }).format(date);
};

const mapArticles = (articles = []) => {
  return articles.map((article) => {
    const articleId = article?.article_id ?? "";
    const jiopimCode = article?.jiopim_code ?? "";
    const verticalKey = normalizeVerticalKey(article?.vertical);
    const verticalLabel =
      CATEGORY_LABEL[verticalKey] || article?.vertical || "Groceries";

    const sellers = article?.sellers || {};
    let latestInventoryTimestamp = null;

    const stores = Object.entries(sellers).flatMap(
      ([sellerId, sellerData = {}]) => {
        const storeEntries = Object.entries(sellerData.stores || {});
        return storeEntries.map(([storeCode, storeData = {}]) => {
          const rawModifiedOn = storeData.modified_on ?? storeData.modifiedOn;
          const timestamp = parseTimestampMs(rawModifiedOn);

          if (timestamp !== null) {
            if (
              latestInventoryTimestamp === null ||
              timestamp > latestInventoryTimestamp
            ) {
              latestInventoryTimestamp = timestamp;
            }
          }

          return {
            id: `${sellerId}-${storeCode}`,
            code: storeCode,
            name: storeData.name || storeCode,
            sellerId,
            inventory: Boolean(storeData.inventory),
            modifiedOn: formatDateTime(rawModifiedOn),
          };
        });
      },
    );

    const inventoryModifiedOn =
      latestInventoryTimestamp !== null
        ? formatDateTime(latestInventoryTimestamp)
        : "N/A";

    return {
      articleId,
      jiopimCode,
      verticalKey,
      verticalLabel,
      priceModifiedOn: formatDateTime(article?.price_modified_on),
      inventoryModifiedOn,
      stores,
    };
  });
};

export default function Products() {
  const userEmail = useSelector(selectUserEmail);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [storeQuery, setStoreQuery] = useState("");
  const [isBulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkJobType, setBulkJobType] = useState("price-sync"); // 'price-sync' or 'combo'
  const [bulkFile, setBulkFile] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [comboSuccessOpen, setComboSuccessOpen] = useState(false);
  const [comboJobId, setComboJobId] = useState("");
  const [historyType, setHistoryType] = useState("me");
  const [historyJobs, setHistoryJobs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const bulkUploadInputId = useId();
  const bulkFileInputRef = useRef(null);
  const historyRequestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const fetchArticles = async () => {
      setIsInitialLoading(true);
      try {
        const response = await apiClient.get(
          "/__deku/api/v1/__jiomart/fetch/articles",
        );
        if (response?.data?.success === false) {
          const message =
            response?.data?.error ||
            response?.data?.message ||
            "Failed to load articles.";
          throw new Error(message);
        }
        const articles = Array.isArray(response?.data?.data)
          ? response.data.data
          : [];
        if (isMounted) {
          setProducts(mapArticles(articles));
          setFetchError(null);
        }
      } catch (error) {
        if (isMounted) {
          const message = getApiErrorMessage(
            error,
            "Failed to load articles. Please try again.",
          );
          setFetchError(new Error(message));
          enqueueSnackbar(message, { variant: "error" });
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    fetchArticles();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    const updated = products.find(
      (product) => product.articleId === selectedProduct.articleId,
    );
    if (updated && updated !== selectedProduct) {
      setSelectedProduct(updated);
    }
  }, [products, selectedProduct]);

  const normalizedQuery = query.trim();

  const fetchPriceSyncHistory = useCallback(async (type) => {
    const requestType = type || "me";
    const requestId = ++historyRequestIdRef.current;
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await apiClient.post(
        "/__deku/api/v1/__jiomart/fetch/price-sync-jobs",
        { type: requestType },
      );

      if (response?.data?.success === false) {
        const message =
          response?.data?.error ||
          response?.data?.message ||
          "Failed to fetch price sync history.";
        throw new Error(message);
      }

      let payload =
        response?.data?.jobs ??
        response?.data?.data ??
        response?.data?.results ??
        response?.data;

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        if (Array.isArray(payload.jobs)) payload = payload.jobs;
        else if (Array.isArray(payload.data)) payload = payload.data;
        else if (Array.isArray(payload.items)) payload = payload.items;
        else payload = [];
      }

      const jobs = Array.isArray(payload) ? payload : [];
      const sortedJobs = jobs.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );

      if (historyRequestIdRef.current === requestId) {
        setHistoryJobs(sortedJobs);
      }
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to fetch price sync history.",
      );
      if (historyRequestIdRef.current === requestId) {
        setHistoryError(message);
        setHistoryJobs([]);
      }
    } finally {
      if (historyRequestIdRef.current === requestId) {
        setHistoryLoading(false);
      }
    }
  }, []);

  const fetchComboHistory = useCallback(async () => {
    const requestId = ++historyRequestIdRef.current;
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await apiClient.get(
        "/__deku/api/v1/__jiomart/fetch/combo-jobs",
      );

      if (response?.data?.success === false) {
        const message =
          response?.data?.error ||
          response?.data?.message ||
          "Failed to fetch combo update history.";
        throw new Error(message);
      }

      let payload =
        response?.data?.jobs ??
        response?.data?.data ??
        response?.data?.results ??
        response?.data;

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        if (Array.isArray(payload.jobs)) payload = payload.jobs;
        else if (Array.isArray(payload.data)) payload = payload.data;
        else if (Array.isArray(payload.items)) payload = payload.items;
        else payload = [];
      }

      const jobs = Array.isArray(payload) ? payload : [];
      const getCreatedTs = (job) =>
        parseTimestampMs(
          job?.created_at ??
            job?.createdAt ??
            job?.created_on ??
            job?.createdOn ??
            job?.created,
        );
      const sortedJobs = jobs.sort(
        (a, b) => (getCreatedTs(b) || 0) - (getCreatedTs(a) || 0),
      );

      if (historyRequestIdRef.current === requestId) {
        setHistoryJobs(sortedJobs);
      }
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to fetch combo update history.",
      );
      if (historyRequestIdRef.current === requestId) {
        setHistoryError(message);
        setHistoryJobs([]);
      }
    } finally {
      if (historyRequestIdRef.current === requestId) {
        setHistoryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const trimmedQuery = normalizedQuery.toLowerCase();
    if (!trimmedQuery) {
      setSearchResults(null);
      setSearchError(null);
      setIsSearchLoading(false);
      return undefined;
    }

    let isActive = true;
    setSearchResults(null);
    setIsSearchLoading(true);
    const handler = setTimeout(async () => {
      try {
        const response = await apiClient.post(
          "/__deku/api/v1/__jiomart/search/article",
          {
            article_id: trimmedQuery,
          },
        );

        if (response?.data?.success === false) {
          const message =
            response?.data?.error ||
            response?.data?.message ||
            "Failed to fetch search results.";
          throw new Error(message);
        }

        if (!isActive) return;

        const responseData = response?.data?.data;
        const articlesArray = Array.isArray(responseData)
          ? responseData
          : responseData
            ? [responseData]
            : [];

        setSearchResults(mapArticles(articlesArray));
        setSearchError(null);
      } catch (error) {
        if (!isActive) return;
        const message = getApiErrorMessage(
          error,
          "Unable to fetch search results. Please try again.",
        );
        setSearchResults([]);
        setSearchError(new Error(message));
        enqueueSnackbar(message, { variant: "error" });
      } finally {
        if (isActive) setIsSearchLoading(false);
      }
    }, 400);

    return () => {
      isActive = false;
      clearTimeout(handler);
    };
  }, [normalizedQuery]);

  useEffect(() => {
    if (!showHistory) return;
    if (bulkJobType === "price-sync") {
      fetchPriceSyncHistory(historyType);
    } else {
      fetchComboHistory();
    }
  }, [
    showHistory,
    bulkJobType,
    historyType,
    fetchPriceSyncHistory,
    fetchComboHistory,
  ]);

  const locallyFilteredProducts = useMemo(() => {
    if (!normalizedQuery) {
      return products;
    }
    const lowered = normalizedQuery.toLowerCase();
    return products.filter((p) => {
      const stores = p.stores || [];
      return (
        (p.articleId || "").toLowerCase().includes(lowered) ||
        (p.jiopimCode || "").toLowerCase().includes(lowered) ||
        (p.verticalLabel || "").toLowerCase().includes(lowered) ||
        stores.some((store) => {
          return (
            (store.code || "").toLowerCase().includes(lowered) ||
            (store.name || "").toLowerCase().includes(lowered) ||
            (store.sellerId || "").toLowerCase().includes(lowered)
          );
        })
      );
    });
  }, [normalizedQuery, products]);

  const filteredProducts = useMemo(() => {
    if (!normalizedQuery) {
      return products;
    }
    if (searchError) {
      return locallyFilteredProducts;
    }
    if (searchResults) {
      return searchResults;
    }
    return locallyFilteredProducts;
  }, [
    normalizedQuery,
    products,
    searchError,
    searchResults,
    locallyFilteredProducts,
  ]);

  const filteredStores = useMemo(() => {
    if (!selectedProduct) return [];
    const q = storeQuery.trim().toLowerCase();
    const stores = selectedProduct.stores || [];
    if (!q) return stores;
    return stores.filter((store) => {
      return (
        (store.name || "").toLowerCase().includes(q) ||
        (store.code || "").toLowerCase().includes(q) ||
        (store.modifiedOn || "").toLowerCase().includes(q) ||
        (store.sellerId || "").toLowerCase().includes(q)
      );
    });
  }, [selectedProduct, storeQuery]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setStoreQuery("");
    setProductModalOpen(true);
  };

  const closeProductModal = () => {
    setProductModalOpen(false);
    // setSelectedProduct(null);
  };

  const openBulkModal = (type = "price-sync") => {
    setBulkJobType(type);
    setBulkModalOpen(true);
    setShowHistory(false);
    setHistoryJobs([]);
    setHistoryError("");
    setHistoryType("me");
    setHistoryLoading(false);
    historyRequestIdRef.current += 1;
    setBulkError("");
  };

  const closeBulkModal = () => {
    setBulkModalOpen(false);
    setBulkFile(null);
    setBulkJobType("price-sync");
    setShowHistory(false);
    setBulkSubmitting(false);
    setBulkError("");
    setHistoryJobs([]);
    setHistoryError("");
    setHistoryLoading(false);
    setHistoryType("me");
    historyRequestIdRef.current += 1;
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = "";
    }
  };

  const handleBulkFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setBulkFile(file);
    setBulkError("");
  };

  const isXlsxFile = (file) => {
    if (!file) return false;
    const name = String(file.name || "").toLowerCase();
    return (
      name.endsWith(".xlsx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  };

  const handleBulkSubmit = async (event) => {
    event.preventDefault();
    if (!bulkFile) {
      setBulkError(
        bulkJobType === "combo"
          ? "Please upload an .xlsx file before submitting."
          : "Please upload a CSV file before submitting.",
      );
      return;
    }

    if (bulkJobType === "combo" && !isXlsxFile(bulkFile)) {
      setBulkError(
        "Combo update requires an .xlsx file. Please upload a valid .xlsx file.",
      );
      return;
    }

    setBulkError("");
    setBulkSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", bulkFile);
      if (userEmail) {
        formData.append("user_email", userEmail);
      }

      if (bulkJobType === "combo") {
        // POST to combo endpoint
        const res = await apiClient.post(
          "/__deku/api/v1/__jiomart/create-job/combo-update",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );

        if (res?.data?.success === false) {
          const message =
            res?.data?.error ||
            res?.data?.message ||
            "Failed to submit combo update job.";
          setBulkError(message);
          enqueueSnackbar(message, { variant: "error" });
          return;
        }

        const jobId =
          res?.data?.job_id ||
          res?.data?.data?.job_id ||
          res?.data?.jobId ||
          res?.data?.id ||
          "";
        setComboJobId(jobId);
        setComboSuccessOpen(true);
        setBulkFile(null);
        if (bulkFileInputRef.current) {
          bulkFileInputRef.current.value = "";
        }
        if (showHistory) {
          fetchComboHistory();
        }
      } else {
        // Price sync flow (existing)
        const res = await apiClient.post(
          "/__deku/api/v1/__jiomart/create-job/price-sync",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );

        if (res?.data?.success === false) {
          const message =
            res?.data?.error ||
            res?.data?.message ||
            "Failed to submit price sync job.";
          setBulkError(message);
          enqueueSnackbar(message, { variant: "error" });
          return;
        }

        enqueueSnackbar("Price sync job submitted", { variant: "success" });
        setBulkFile(null);
        if (bulkFileInputRef.current) {
          bulkFileInputRef.current.value = "";
        }
        if (showHistory) {
          fetchPriceSyncHistory(historyType);
        }
      }
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        bulkJobType === "combo"
          ? "Failed to submit combo update job."
          : "Failed to submit price sync job.",
      );
      setBulkError(message);
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const isLoading = isInitialLoading || isSearchLoading;
  const tableColumnCount = 6;

  return (
    <PageLayout
      title="Products"
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 space-y-3 pt-3">
          <div className="flex flex-col justify-between gap-3 pr-2 sm:flex-row sm:items-center">
            <div className="w-full pl-1 sm:max-w-sm sm:flex-1">
              <SearchBar
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search SKUs"
                aria-label="Search SKUs"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openBulkModal("combo")}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-offset-[#0f0f0f]"
              >
                <AddToPhotosOutlinedIcon fontSize="small" />
                Combo Update
              </button>
              <button
                type="button"
                onClick={() => openBulkModal("price-sync")}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-offset-[#0f0f0f]"
              >
                <CloudUploadOutlinedIcon fontSize="small" />
                Bulk Price Sync
              </button>
            </div>
          </div>

          {fetchError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
              Failed to load articles. Please try again later.
            </div>
          )}

          {searchError && normalizedQuery && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              Unable to fetch search results. Please try again.
            </div>
          )}
        </div>

        <div className="mt-4 flex-1 overflow-hidden">
          <div className="flex h-full flex-col overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-[#111417]">
            <div className="relative h-full overflow-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                <thead className="sticky top-0 z-10 bg-gray-50/95 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:bg-[#1b1f24] dark:text-gray-400">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left whitespace-nowrap"
                    >
                      SKU
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left whitespace-nowrap"
                    >
                      Vertical
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left whitespace-nowrap"
                    >
                      Inventory updated
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left whitespace-nowrap"
                    >
                      Price updated
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left whitespace-nowrap"
                    >
                      Stores
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right whitespace-nowrap"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
                  {isLoading &&
                    Array.from({ length: 8 }).map((_, index) => (
                      <tr key={`loading-${index}`} className="animate-pulse">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-2xl bg-gray-200 dark:bg-white/10" />
                            <div className="space-y-2">
                              <div className="h-3 w-32 rounded bg-gray-200 dark:bg-white/10" />
                              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-white/5" />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-3 w-24 rounded bg-gray-200 dark:bg-white/10" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-3 w-28 rounded bg-gray-200 dark:bg-white/10" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-3 w-28 rounded bg-gray-200 dark:bg-white/10" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-white/10" />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="h-8 w-24 rounded bg-gray-200 dark:bg-white/10" />
                        </td>
                      </tr>
                    ))}

                  {!isLoading &&
                    filteredProducts.length > 0 &&
                    filteredProducts.map((product) => {
                      const Icon =
                        CATEGORY_ICON[product.verticalKey] || DevicesOtherIcon;
                      const style = getCategoryStyle(product.verticalKey);
                      const totalStores = product.stores?.length || 0;

                      return (
                        <tr
                          key={product.articleId || product.jiopimCode}
                          className="transition hover:bg-gray-50/70 dark:hover:bg-white/5"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div
                                className={classNames(
                                  "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-black/5 dark:ring-white/10",
                                  style.bg,
                                )}
                              >
                                <Icon
                                  className={classNames("h-5 w-5", style.icon)}
                                />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {product.articleId || "—"}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  JioPIM:{" "}
                                  <span className="tabular-nums">
                                    {product.jiopimCode || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {/* <div className="font-medium">
                              {product.verticalLabel}
                            </div> */}
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {product.verticalKey || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            <div className="tabular-nums">
                              {product.inventoryModifiedOn}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Inventory
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            <div className="tabular-nums">
                              {product.priceModifiedOn}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Pricing
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            <div className="text-base font-semibold tabular-nums">
                              {totalStores.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              linked stores
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleProductSelect(product)}
                              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 focus:ring-offset-white focus:outline-none dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-500/10 dark:focus:ring-offset-[#111417]"
                            >
                              View details
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                  {!isLoading && filteredProducts.length === 0 && (
                    <tr>
                      <td
                        colSpan={tableColumnCount}
                        className="px-4 py-16 text-center text-sm text-gray-600 dark:text-gray-300"
                      >
                        No products match your search. Try a different keyword
                        or clear the filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <CustomModal
        open={isProductModalOpen}
        onClose={closeProductModal}
        size="sm"
      >
        {selectedProduct && (
          <div className="w-full max-w-3xl overflow-hidden">
            <div className="flex max-h-[80vh] min-h-0 flex-col gap-4 sm:gap-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  {selectedProduct.verticalLabel}
                </p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedProduct.articleId || "Article details"}
                </h2>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-300">
                  <span className="rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200">
                    Article:{" "}
                    <span className="tabular-nums">
                      {selectedProduct.articleId || "—"}
                    </span>
                  </span>
                  <span className="rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200">
                    JioPIM:{" "}
                    <span className="tabular-nums">
                      {selectedProduct.jiopimCode || "N/A"}
                    </span>
                  </span>
                  <span className="rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200">
                    Price modified: {selectedProduct.priceModifiedOn}
                  </span>
                  <span className="rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200">
                    Inventory modified: {selectedProduct.inventoryModifiedOn}
                  </span>
                  <span className="rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200">
                    Stores: {selectedProduct.stores?.length || 0}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <SearchBar
                  value={storeQuery}
                  onChange={(e) => setStoreQuery(e.target.value)}
                  placeholder="Search stores by name, code, seller or date"
                  size="sm"
                  aria-label="Search stores"
                />
              </div>

              <div className="min-h-0 flex-1">
                <div className="h-full max-h-[55vh] overflow-y-auto pr-1 sm:pr-2">
                  {filteredStores.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2">
                      {filteredStores.map((store) => {
                        const statusClasses = store.inventory
                          ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-600/40"
                          : "bg-rose-50 text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-600/40";

                        const StatusIcon = store.inventory
                          ? CheckCircleOutlineIcon
                          : CancelOutlinedIcon;

                        return (
                          <div
                            key={store.id}
                            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-[#16191f]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {store.name}
                                </p>
                                <p className="mt-1 text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
                                  {store.code}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Seller: {store.sellerId || "—"}
                                </p>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${statusClasses}`}
                              >
                                <StatusIcon fontSize="inherit" />
                                Inventory: {store.inventory ? "True" : "False"}
                              </span>
                            </div>
                            <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                              Modified on
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                {store.modifiedOn}
                              </span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-white/5 dark:text-gray-300">
                      No stores match this search.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CustomModal>

      <CustomModal
        open={comboSuccessOpen}
        onClose={() => setComboSuccessOpen(false)}
        size="sm"
      >
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Combo Job Created
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            The combo update job was created successfully.
          </p>
          <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm dark:bg-white/5">
            <div className="text-xs text-gray-500">Request ID</div>
            <div className="mt-1 font-mono text-sm text-gray-800 dark:text-gray-100">
              {comboJobId || "-"}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setComboSuccessOpen(false)}
              className="cursor-pointer rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      </CustomModal>

      <CustomModal open={isBulkModalOpen} onClose={closeBulkModal} size="md">
        <div className="flex max-h-[80vh] flex-col overflow-auto">
          <form
            onSubmit={handleBulkSubmit}
            className="flex w-full flex-col gap-4 transition-all duration-300 ease-in-out sm:p-2"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {bulkJobType === "combo" ? "Combo Update" : "Bulk Price Sync"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {bulkJobType === "combo"
                  ? "Upload an .xlsx file with combo updates. Only .xlsx files are accepted."
                  : "Upload a CSV with SKU pricing updates. We recommend downloading the template to ensure the correct headers."}
              </p>
            </div>

            <label
              htmlFor={bulkUploadInputId}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-600 transition hover:border-blue-400 hover:bg-blue-50/60 dark:border-gray-600 dark:bg-white/5 dark:text-gray-300 dark:hover:border-blue-500/60 dark:hover:bg-blue-500/5"
            >
              <CloudUploadOutlinedIcon
                fontSize="large"
                className="text-blue-500 dark:text-blue-300"
              />
              <div>
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {bulkJobType === "combo"
                    ? "Drop your XLSX here"
                    : "Drop your CSV here"}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {" "}
                  or browse
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {bulkJobType === "combo"
                  ? "Accepted format: .xlsx • Max size 20MB"
                  : "Accepted format: .csv • Max size 10MB"}
              </span>
            </label>
            <input
              id={bulkUploadInputId}
              ref={bulkFileInputRef}
              type="file"
              accept={bulkJobType === "combo" ? ".xlsx" : ".csv"}
              onChange={handleBulkFileChange}
              className="hidden"
            />

            {bulkFile && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/40">
                <InsertDriveFileOutlinedIcon fontSize="small" />
                <span className="truncate">{bulkFile.name}</span>
              </div>
            )}

            {bulkError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                {bulkError}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {bulkJobType === "combo" ? (
                <button
                  type="button"
                  onClick={generateComboXlsx}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500 px-3 py-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-white focus:outline-none dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-500/10 dark:focus:ring-offset-[#0f0f0f]"
                >
                  <FileDownloadOutlinedIcon fontSize="small" />
                  Download sample XLSX
                </button>
              ) : (
                <a
                  href="/samples/bulk-price-sync-sample.csv"
                  download
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500 px-3 py-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-white focus:outline-none dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-500/10 dark:focus:ring-offset-[#0f0f0f]"
                >
                  <FileDownloadOutlinedIcon fontSize="small" />
                  Download sample CSV
                </a>
              )}

              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-white focus:outline-none dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 dark:focus:ring-offset-[#0f0f0f]"
              >
                <HistoryToggleOffIcon fontSize="small" />
                {showHistory ? "Hide history" : "Show history"}
              </button>
            </div>

            {showHistory && (
              <div className="animate-in fade-in slide-in-from-top-2 flex h-[30vh] max-h-[40vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-[#14181f]">
                <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4 dark:border-white/10">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {bulkJobType === "combo"
                      ? "Combo update history"
                      : "Price sync history"}
                  </h3>
                  {bulkJobType === "price-sync" && (
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs ${historyType === "all" ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500"}`}
                      >
                        All History
                      </span>
                      <IOSToggle
                        checked={historyType === "me"}
                        onChange={() =>
                          setHistoryType((prev) =>
                            prev === "all" ? "me" : "all",
                          )
                        }
                      />
                      <span
                        className={`text-xs ${historyType === "me" ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500"}`}
                      >
                        My History
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  {historyError && (
                    <div className="mx-4 mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                      {historyError}
                    </div>
                  )}

                  {historyLoading ? (
                    <div className="h-full space-y-2 overflow-auto p-4">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={`history-skeleton-${index}`}
                          className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-white/10" />
                          <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 dark:bg-white/10" />
                        </div>
                      ))}
                    </div>
                  ) : historyJobs.length ? (
                    <div className="h-full overflow-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold tracking-wide text-gray-600 uppercase dark:bg-[#1b1f24] dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-3 whitespace-nowrap">
                              Created at
                            </th>
                            <th className="px-4 py-3 whitespace-nowrap">
                              Requested by
                            </th>
                            <th className="px-4 py-3 whitespace-nowrap">
                              Status
                            </th>
                            <th className="px-4 py-3 text-right whitespace-nowrap">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {historyJobs.map((job) => {
                            const createdValue =
                              job?.created_at ||
                              job?.createdAt ||
                              job?.created_on ||
                              job?.createdOn ||
                              job?.created;
                            const requester =
                              job?.requested_by ||
                              job?.user_email ||
                              job?.user ||
                              job?.created_by ||
                              "—";
                            const logUrl =
                              job?.log_address ||
                              job?.log_url ||
                              job?.logUrl ||
                              job?.output_url ||
                              job?.outputFileUrl ||
                              job?.result_url ||
                              job?.file_address;
                            const statusLabel = formatHistoryStatus(job.status);
                            const statusTone = getHistoryStatusTone(job.status);
                            return (
                              <tr
                                key={
                                  job.id || job.file_address || job.created_at
                                }
                                className="transition hover:bg-gray-50/70 dark:hover:bg-white/5"
                              >
                                <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100">
                                  {formatDateTime(createdValue)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100">
                                  {requester}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}
                                  >
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  {logUrl && (
                                    <a
                                      href={logUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      download
                                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-500/10"
                                    >
                                      <FileDownloadOutlinedIcon fontSize="inherit" />
                                      Download
                                    </a>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="px-4 pb-4 text-xs text-gray-500 dark:text-gray-400">
                      No submissions found.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeBulkModal}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-white focus:outline-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:ring-offset-[#0f0f0f]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!bulkFile || bulkSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-offset-[#0f0f0f]"
              >
                {bulkSubmitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </CustomModal>
    </PageLayout>
  );
}
