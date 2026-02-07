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
import { format, subMonths, subYears } from "date-fns";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import TwoWheelerOutlinedIcon from "@mui/icons-material/TwoWheelerOutlined";

const TmsKlydoDashboard = () => {
  const [activeTab, setActiveTab] = useState("data");
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

  const company = "klydo";

  const loadDashboardData = useCallback(async () => {
    const type = activeTab;
    const shouldSendDateRange = activeTab === "data";
    const effectiveRange = shouldSendDateRange
      ? {
          startDate:
            dateRange.startDate ||
            format(subYears(new Date(), 1), "yyyy-MM-dd"),
          endDate: dateRange.endDate || format(new Date(), "yyyy-MM-dd"),
        }
      : null;
    setLoading(true);
    setError("");
    try {
      const data = await fetchTmsDashboardData({
        company,
        type,
        limit: pageSize,
        offset: page,
        startDate: shouldSendDateRange ? effectiveRange?.startDate : undefined,
        endDate: shouldSendDateRange ? effectiveRange?.endDate : undefined,
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

  const riderDataColumns = useMemo(
    () => [
      {
        key: "rider_name",
        label: "Rider",
        icon: <BadgeOutlinedIcon fontSize="small" />,
        render: (row) => row.rider_name || row.rider || row.name || "-",
        isFilter: true,
      },
      {
        key: "availability",
        label: "Availability",
        icon: <ErrorOutline fontSize="small" />,
        render: (row) => row.availability || "-",
        isFilter: true,
      },
      {
        key: "status",
        label: "Status",
        icon: <ErrorOutline fontSize="small" />,
        render: (row) => row.status || "-",
        isFilter: true,
      },
      {
        key: "distance_km",
        label: "Distance (km)",
        icon: <Speed fontSize="small" />,
        render: (row) =>
          row.distance_km != null
            ? Number(row.distance_km).toFixed(2)
            : (row.distance_km ?? "-"),
      },
      {
        key: "trip_id",
        label: "Trip ID",
        icon: <TwoWheelerOutlinedIcon fontSize="small" />,
        render: (row) => row.trip_id || "-",
      },
      {
        key: "id",
        label: "Rider ID",
        icon: <AccountCircleOutlined fontSize="small" />,
        render: (row) => row.id || row.riderId || "-",
        isFilter: true,
      },
      {
        key: "is_active",
        label: "Active",
        icon: <CheckCircleOutline fontSize="small" />,
        render: (row) => (row.is_active ? "Yes" : "No"),
        isFilter: true,
      },
      {
        key: "is_trip_active",
        label: "Trip Active",
        icon: <CheckCircleOutline fontSize="small" />,
        render: (row) => (row.is_trip_active ? "Yes" : "No"),
        isFilter: true,
      },
      {
        key: "latitude",
        label: "Latitude",
        icon: <LocationOnOutlined fontSize="small" />,
        render: (row) => row.latitude ?? "-",
      },
      {
        key: "longitude",
        label: "Longitude",
        icon: <LocationOnOutlined fontSize="small" />,
        render: (row) => row.longitude ?? "-",
      },
    ],
    [],
  );

  const riderInfoColumns = useMemo(
    () => [
      {
        key: "date",
        label: "Date",
        icon: <CalendarMonthOutlinedIcon fontSize="small" />,
        render: (row) => row.date?.value || row.date || "-",
        isFilter: true,
      },
      {
        key: "rider_name",
        label: "Name",
        icon: <BadgeOutlinedIcon fontSize="small" />,
        render: (row) => row.rider_name || row.rider || row.name || "-",
        isFilter: true,
      },
      {
        key: "phone_number",
        label: "Phone",
        icon: <LocalPhoneOutlinedIcon fontSize="small" />,
        render: (row) => row.phone_number || row.phone || "-",
      },
      // {
      //   key: "mail_id",
      //   label: "Email",
      //   icon: <EmailOutlinedIcon fontSize="small" />,
      //   render: (row) => row.mail_id || row.email || "-",
      //   isFilter: true,
      // },
      {
        key: "number_of_shipments",
        label: "Shipments",
        icon: <CheckCircleOutline fontSize="small" />,
        render: (row) => row.number_of_shipments ?? "-",
      },
      {
        key: "number_of_trips",
        label: "Trips",
        icon: <TwoWheelerOutlinedIcon fontSize="small" />,
        render: (row) => row.number_of_trips ?? "-",
      },
      {
        key: "total_distance_km",
        label: "Distance (km)",
        icon: <Speed fontSize="small" />,
        render: (row) =>
          row.total_distance_km != null ? row.total_distance_km : "-",
      },
    ],
    [],
  );

  const columns = activeTab === "info" ? riderDataColumns : riderInfoColumns;

  return (
    <PageLayout
      title={
        activeTab === "data"
          ? "Klydo <> TMS | Rider Trip Data - Day Wise"
          : "Klydo <> TMS | Rider Data"
      }
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex w-full items-center gap-2">
            <TmsTabButton
              label="Rider Trip Data"
              active={activeTab === "data"}
              onClick={() => {
                setActiveTab("data");
                setPage(0);
              }}
            />
            <TmsTabButton
              label="Rider Data"
              active={activeTab === "info"}
              onClick={() => {
                setActiveTab("info");
                setPage(0);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "data" && (
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
                    startDate: format(subYears(today, 1), "yyyy-MM-dd"),
                    endDate: format(today, "yyyy-MM-dd"),
                  });
                  setPage(0);
                }}
              />
            )}
            <TmsDownloadButton
              columns={columns}
              data={rows}
              filename={`klydo-${activeTab}-data.xlsx`}
              company="klydo"
              type={activeTab}
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

export default TmsKlydoDashboard;
