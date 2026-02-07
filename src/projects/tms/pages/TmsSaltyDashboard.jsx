import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccountCircleOutlined,
  LocationOnOutlined,
  CheckCircleOutline,
  ErrorOutline,
  Speed,
} from "@mui/icons-material";
import PageLayout from "../../../components/PageLayout";
import TmsTable from "../components/TmsTable";
import TmsTabButton from "../components/TmsTabButton";
import TmsDownloadButton from "../components/TmsDownloadButton";
import TmsDateRangeButton from "../components/TmsDateRangeButton";
import { fetchTmsDashboardData } from "../api/dashboard";
import { format, subMonths } from "date-fns";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import TwoWheelerOutlinedIcon from "@mui/icons-material/TwoWheelerOutlined";

const TmsSaltyDashboard = () => {
  const [activeTab, setActiveTab] = useState("cash_reco");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(0);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      startDate: format(subMonths(today, 2), "yyyy-MM-dd"),
      endDate: format(today, "yyyy-MM-dd"),
    };
  });

  const company = "salty";

  const loadDashboardData = useCallback(async () => {
    const effectiveRange = {
      startDate:
        dateRange.startDate || format(subMonths(new Date(), 2), "yyyy-MM-dd"),
      endDate: dateRange.endDate || format(new Date(), "yyyy-MM-dd"),
    };
    setLoading(true);
    setError("");
    try {
      const data = await fetchTmsDashboardData({
        company,
        type: activeTab,
        limit: pageSize,
        offset: page,
        startDate: effectiveRange.startDate,
        endDate: effectiveRange.endDate,
      });
      const normalized = Array.isArray(data)
        ? data
        : Array.isArray(data?.rows)
          ? data.rows
          : [];
      setRows(normalized);
    } catch (err) {
      setError(err?.message || "Failed to load dashboard data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, company, page, pageSize, dateRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, pageSize, dateRange]);

  const cashRecoColumns = useMemo(() => {
    const formatDateOnly = (value) => {
      if (!value) return "-";
      if (typeof value === "string") {
        const normalized = value
          .replace(" ", "T")
          .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
        const parsed = new Date(normalized);
        if (!Number.isNaN(parsed.getTime())) {
          return format(parsed, "yyyy-MM-dd");
        }
        return value;
      }
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return format(parsed, "yyyy-MM-dd");
      }
      return String(value);
    };

    return [
      {
        key: "awb_number",
        label: "AWB ",
        icon: <BadgeOutlinedIcon fontSize="small" />,
        render: (row) => row.awb_number || "-",
        isFilter: true,
      },
      {
        key: "order_id",
        label: "Order ID",
        icon: <BadgeOutlinedIcon fontSize="small" />,
        render: (row) => row.order_id || "-",
        isFilter: true,
      },
      {
        key: "shipment_id",
        label: "Shipment ID",
        icon: <TwoWheelerOutlinedIcon fontSize="small" />,
        render: (row) => row.shipment_id || "-",
        isFilter: true,
      },
      {
        key: "created_at",
        label: "Created At",
        icon: <CalendarMonthOutlinedIcon fontSize="small" />,
        render: (row) => formatDateOnly(row.created_at),
      },

      {
        key: "updated_at",
        label: "Updated At",
        icon: <CalendarMonthOutlinedIcon fontSize="small" />,
        render: (row) => formatDateOnly(row.updated_at),
      },
      {
        key: "amount_to_collect",
        label: "Amount to Collect",
        icon: <Speed fontSize="small" />,
        render: (row) => row.amount_to_collect ?? "-",
      },
      {
        key: "invoice_amount",
        label: "Invoice Amount",
        icon: <Speed fontSize="small" />,
        render: (row) => row.invoice_amount ?? "-",
      },
      {
        key: "journey_type",
        label: "Journey Type",
        icon: <TwoWheelerOutlinedIcon fontSize="small" />,
        render: (row) => row.journey_type || "-",
        isFilter: true,
      },
      {
        key: "mode_of_payment",
        label: "Mode of Payment",
        icon: <CheckCircleOutline fontSize="small" />,
        render: (row) => row.mode_of_payment || "-",
        isFilter: true,
      },
      {
        key: "latest_trip_id",
        label: "Trip",
        icon: <TwoWheelerOutlinedIcon fontSize="small" />,
        render: (row) => row.latest_trip_id || "-",
      },
      {
        key: "payment_method",
        label: "Payment Method",
        icon: <CheckCircleOutline fontSize="small" />,
        render: (row) => row.payment_method || "-",
        isFilter: true,
      },
      //   {
      //     key: "status_code",
      //     label: "Status Code",
      //     icon: <ErrorOutline fontSize="small" />,
      //     render: (row) => row.status_code || "-",
      //     isFilter: true,
      //   },

      {
        key: "rider_name",
        label: "Rider Name",
        icon: <AccountCircleOutlined fontSize="small" />,
        render: (row) => row.rider_name || "-",
        isFilter: true,
      },
      {
        key: "rider_number",
        label: "Rider Number",
        icon: <LocalPhoneOutlinedIcon fontSize="small" />,
        render: (row) => row.rider_number || "-",
      },
      //   {
      //     key: "rider_mail",
      //     label: "Rider Email",
      //     icon: <EmailOutlinedIcon fontSize="small" />,
      //     render: (row) => row.rider_mail || "-",
      //     isFilter: true,
      //   },
    ];
  }, []);

  const riderCashColumns = useMemo(
    () => [
      {
        key: "shipment_date",
        label: "Shipment Date",
        icon: <CalendarMonthOutlinedIcon fontSize="small" />,
        render: (row) => row.shipment_date?.value || row.shipment_date || "-",
        isFilter: true,
      },
      {
        key: "rider_name",
        label: "Rider Name",
        icon: <BadgeOutlinedIcon fontSize="small" />,
        render: (row) => row.rider_name || "-",
        isFilter: true,
      },
      {
        key: "rider_number",
        label: "Rider Number",
        icon: <LocalPhoneOutlinedIcon fontSize="small" />,
        render: (row) => row.rider_number || "-",
      },
      //   {
      //     key: "rider_mail",
      //     label: "Rider Email",
      //     icon: <EmailOutlinedIcon fontSize="small" />,
      //     render: (row) => row.rider_mail || "-",
      //     isFilter: true,
      //   },
      {
        key: "total_shipments",
        label: "Total Shipments",
        icon: <CheckCircleOutline fontSize="small" />,
        render: (row) => row.total_shipments ?? "-",
      },
      //   {
      //     key: "total_invoice_amount",
      //     label: "Total Invoice Amount",
      //     icon: <Speed fontSize="small" />,
      //     render: (row) => row.total_invoice_amount ?? "-",
      //   },

      {
        key: "cod_upi_amount",
        label: "COD UPI Amount",
        icon: <Speed fontSize="small" />,
        render: (row) => row.cod_upi_amount ?? "-",
      },
      {
        key: "cod_cash_amount",
        label: "COD Cash Amount",
        icon: <Speed fontSize="small" />,
        render: (row) => row.cod_cash_amount ?? "-",
      },
      {
        key: "cod_amount_to_collect",
        label: "COD Order Value",
        icon: <Speed fontSize="small" />,
        render: (row) => row.cod_amount_to_collect ?? "-",
      },
    ],
    [],
  );

  const columns =
    activeTab === "cash_reco" ? cashRecoColumns : riderCashColumns;

  return (
    <PageLayout
      title={
        activeTab === "cash_reco"
          ? "Salty <> TMS | Cash Reconciliation Dashboard"
          : "Salty <> TMS | Rider Wise Amount Collection (Delivered & COD Order Only)"
      }
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex w-full items-center gap-2">
            <TmsTabButton
              label="Cash Reco"
              active={activeTab === "cash_reco"}
              onClick={() => {
                setActiveTab("cash_reco");
                setPage(0);
              }}
            />
            <TmsTabButton
              label="Rider Cash"
              active={activeTab === "rider_cash"}
              onClick={() => {
                setActiveTab("rider_cash");
                setPage(0);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <TmsDateRangeButton
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onApply={(nextRange) => {
                setDateRange(nextRange);
                setPage(0);
              }}
              onClear={() => {
                const today = new Date();
                setDateRange({
                  startDate: format(subMonths(today, 2), "yyyy-MM-dd"),
                  endDate: format(today, "yyyy-MM-dd"),
                });
                setPage(0);
              }}
            />
            <TmsDownloadButton
              columns={columns}
              data={rows}
              filename={`salty-${activeTab}-data.xlsx`}
              company="salty"
              type={activeTab}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          </div>
        </div>

        <TmsTable
          columns={columns}
          rows={rows}
          isLoading={loading}
          pageSize={pageSize}
          onPageSizeChange={(value) => {
            setPageSize(value);
          }}
          page={page}
          onPageChange={(nextPage) => {
            setPage(nextPage);
          }}
          bodyHeight="calc(100vh - 250px)"
        />
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default TmsSaltyDashboard;
