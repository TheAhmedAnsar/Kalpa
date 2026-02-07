import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccountCircleOutlined,
  CheckCircleOutline,
  DescriptionOutlined,
  ErrorOutline,
  LocationOnOutlined,
  Speed,
} from "@mui/icons-material";
import PageLayout from "../../../components/PageLayout";
import TmsTable from "../components/TmsTable";
import TmsDownloadButton from "../components/TmsDownloadButton";
import TmsDateRangeButton from "../components/TmsDateRangeButton";
import { fetchTmsDashboardData } from "../api/dashboard";
import { format, subMonths } from "date-fns";
import TwoWheelerOutlinedIcon from "@mui/icons-material/TwoWheelerOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";

const TmsLucasDashboard = () => {
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

  const company = "lucas";
  const type = "rider";

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
        type,
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
  }, [company, type, page, pageSize, dateRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    setPage(0);
  }, [pageSize, dateRange]);

  const columns = useMemo(() => {
    const toIstDateTime = (value) => {
      if (!value) return "-";
      const normalized =
        typeof value === "string"
          ? value.replace(" ", "T").replace(/([+-]\d{2})(\d{2})$/, "$1:$2")
          : value;
      const parsed = new Date(normalized);
      if (Number.isNaN(parsed.getTime())) return "-";
      const istTime = new Date(parsed.getTime() + 5.5 * 60 * 60 * 1000);
      return format(istTime, "yyyy-MM-dd hh:mm:ss a");
    };

    const truncateToDecimals = (value, decimals) => {
      const num = Number(value);
      if (Number.isNaN(num)) return "-";
      const factor = 10 ** decimals;
      const truncated = Math.trunc(num * factor) / factor;
      return truncated.toFixed(decimals);
    };

    return [
      {
        key: "trip_id",
        label: "Trip ID",
        icon: <TwoWheelerOutlinedIcon fontSize="small" />,
        render: (row) => row.trip_id || "-",
      },
      {
        key: "awb_number",
        label: "AWB",
        icon: <BadgeOutlinedIcon fontSize="small" />,
        render: (row) => row.awb_number || "-",
        isFilter: true,
      },
      {
        key: "shipment_created_at",
        label: "Shipment Created",
        icon: <CalendarMonthOutlinedIcon fontSize="small" />,
        render: (row) => toIstDateTime(row.shipment_created_at),
      },
      {
        key: "shipment_updated_at",
        label: "Shipment Picked",
        icon: <CalendarMonthOutlinedIcon fontSize="small" />,
        render: (row) => toIstDateTime(row.shipment_updated_at),
      },
      {
        key: "delivered_at",
        label: "Shipment Delivered",
        icon: <CalendarMonthOutlinedIcon fontSize="small" />,
        render: (row) => toIstDateTime(row.delivered_at),
      },

      {
        key: "shipment_status_code",
        label: "AWB Status",
        icon: <ErrorOutline fontSize="small" />,
        render: (row) => row.shipment_status_code || "-",
        isFilter: true,
      },
      {
        key: "trip_created_at",
        label: "Trip Created At",
        icon: <CalendarMonthOutlinedIcon fontSize="small" />,
        render: (row) => toIstDateTime(row.trip_created_at),
      },
      {
        key: "trip_updated_at",
        label: "Trip Updated At",
        icon: <CalendarMonthOutlinedIcon fontSize="small" />,
        render: (row) => toIstDateTime(row.trip_updated_at),
      },
      {
        key: "trip_status_code",
        label: "Trip Status",
        icon: <ErrorOutline fontSize="small" />,
        render: (row) => row.trip_status_code || "-",
        isFilter: true,
      },
      {
        key: "rider_name",
        label: "Rider Name",
        icon: <AccountCircleOutlined fontSize="small" />,
        render: (row) => row.rider_name || "-",
        isFilter: true,
      },
      {
        key: "drop_address_line_1",
        label: "Drop Address",
        icon: <LocationOnOutlined fontSize="small" />,
        render: (row) => row.drop_address_line_1 || "-",
      },
      {
        key: "drop_contact_name",
        label: "Customer Name",
        icon: <AccountCircleOutlined fontSize="small" />,
        render: (row) => row.drop_contact_name || "-",
      },
      {
        key: "pickup_address_line_1",
        label: "Pickup Address",
        icon: <LocationOnOutlined fontSize="small" />,
        render: (row) => row.pickup_address_line_1 || "-",
      },
      {
        key: "travelled_distance_km",
        label: "AWB Travelled Distance (km)",
        icon: <Speed fontSize="small" />,
        render: (row) => row.travelled_distance_km ?? "-",
      },
      {
        key: "delivery_distance_km",
        label: "AWB Est Delivery Distance(KM)",
        icon: <Speed fontSize="small" />,
        render: (row) => row.delivery_distance_km ?? "-",
      },
      {
        key: "trip_closure_time_hours",
        label: "Trip Time (hrs)",
        icon: <Speed fontSize="small" />,
        render: (row) => truncateToDecimals(row.trip_closure_time_hours, 5),
      },

      {
        key: "trip_travelled_distance_km",
        label: "Trip Distance (km)",
        icon: <Speed fontSize="small" />,
        render: (row) => row.trip_travelled_distance_km ?? "-",
      },

      {
        key: "est_trip_distance_km",
        label: "Est Trip Distance (km)",
        icon: <Speed fontSize="small" />,
        render: (row) => truncateToDecimals(row.est_trip_distance_km, 5),
      },
      // {
      //   key: "latest_trip_id",
      //   label: "Latest Trip ID",
      //   icon: <TwoWheelerOutlinedIcon fontSize="small" />,
      //   render: (row) => row.latest_trip_id || "-",
      // },
      // {
      //   key: "drop_detail_id",
      //   label: "Drop Detail ID",
      //   icon: <BadgeOutlinedIcon fontSize="small" />,
      //   render: (row) => row.drop_detail_id || "-",
      // },
      // {
      //   key: "pickup_detail_id",
      //   label: "Pickup Detail ID",
      //   icon: <BadgeOutlinedIcon fontSize="small" />,
      //   render: (row) => row.pickup_detail_id || "-",
      // },
      // {
      //   key: "failed_delivery_attempts",
      //   label: "Failed Attempts",
      //   icon: <ErrorOutline fontSize="small" />,
      //   render: (row) => row.failed_delivery_attempts ?? "-",
      // },
      // {
      //   key: "mode_of_payment",
      //   label: "Mode of Payment",
      //   icon: <CheckCircleOutline fontSize="small" />,
      //   render: (row) => row.mode_of_payment || "-",
      //   isFilter: true,
      // },

      // {
      //   key: "scan_loaded_at",
      //   label: "Scan Loaded At",
      //   icon: <CalendarMonthOutlinedIcon fontSize="small" />,
      //   render: (row) => row.scan_loaded_at || "-",
      // },

      // {
      //   key: "shipment_trip_created_at",
      //   label: "Shipment Trip Created",
      //   icon: <CalendarMonthOutlinedIcon fontSize="small" />,
      //   render: (row) => row.shipment_trip_created_at || "-",
      // },
      // {
      //   key: "shipment_trip_updated_at",
      //   label: "Shipment Trip Updated",
      //   icon: <CalendarMonthOutlinedIcon fontSize="small" />,
      //   render: (row) => row.shipment_trip_updated_at || "-",
      // },
      // {
      //   key: "is_active",
      //   label: "Active",
      //   icon: <CheckCircleOutline fontSize="small" />,
      //   render: (row) => (row.is_active ? "Yes" : "No"),
      //   isFilter: true,
      // },

      // {
      //   key: "pickup_contact_name",
      //   label: "Pickup Contact",
      //   icon: <AccountCircleOutlined fontSize="small" />,
      //   render: (row) => row.pickup_contact_name || "-",
      // },

      // {
      //   key: "delivery_notes",
      //   label: "Notes",
      //   icon: <DescriptionOutlined fontSize="small" />,
      //   render: (row) => row.delivery_notes || "-",
      // },
    ];
  }, []);

  return (
    <PageLayout title="Lucas <> TMS | Rider Dashboard">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-end gap-3">
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
          </div>
          <TmsDownloadButton
            columns={columns}
            data={rows}
            filename="lucas-rider-data.xlsx"
            company="lucas"
            type="rider"
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
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

export default TmsLucasDashboard;
