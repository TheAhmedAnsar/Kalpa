import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccountCircleOutlined,
  LocationOnOutlined,
  CheckCircleOutline,
  ErrorOutline,
  BadgeOutlined,
  DescriptionOutlined,
} from "@mui/icons-material";
import PageLayout from "../../../components/PageLayout";
import TmsTable from "../components/TmsTable";
import TmsDownloadButton from "../components/TmsDownloadButton";
import TmsDateRangeButton from "../components/TmsDateRangeButton";
import { fetchTmsDashboardData } from "../api/dashboard";
import { format, subMonths } from "date-fns";
import TwoWheelerOutlinedIcon from "@mui/icons-material/TwoWheelerOutlined";

const TmsAsterDashboard = () => {
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

  const company = "aster";
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

  const columns = useMemo(
    () => [
      {
        key: "awb_number",
        label: "AWB",
        icon: <BadgeOutlined fontSize="small" />,
        render: (row) => row.awb_number || "-",
        isFilter: true,
      },
      {
        key: "order_id",
        label: "Order ID",
        icon: <BadgeOutlined fontSize="small" />,
        render: (row) => row.order_id || "-",
        isFilter: true,
      },
      {
        key: "reference_id",
        label: "Shipment ID",
        icon: <BadgeOutlined fontSize="small" />,
        render: (row) => row.reference_id || "-",
      },
      {
        key: "comments",
        label: "Comments",
        icon: <DescriptionOutlined fontSize="small" />,
        render: (row) => {
          const raw = row?.meta;
          if (!raw) return "-";

          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          return parsed?.notes || "-";
        },
      },
      {
        key: "instructions",
        label: "Instructions",
        icon: <DescriptionOutlined fontSize="small" />,
        render: (row) => row.instructions || "-",
      },
      {
        key: "pow_completed",
        label: "POW Completed",
        icon: <CheckCircleOutline fontSize="small" />,
        render: (row) => (row.pow_completed ? "Yes" : "No"),
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
        key: "task_name",
        label: "Task Name",
        icon: <BadgeOutlined fontSize="small" />,
        render: (row) => row.task_name || "-",
        isFilter: true,
      },
      {
        key: "task_status_code",
        label: "Task Status",
        icon: <ErrorOutline fontSize="small" />,
        render: (row) => row.task_status_code || "-",
        isFilter: true,
      },
      {
        key: "task_type",
        label: "Task Type",
        icon: <BadgeOutlined fontSize="small" />,
        render: (row) => row.task_type || "-",
        isFilter: true,
      },
      {
        key: "trip_id",
        label: "Trip ID",
        icon: <TwoWheelerOutlinedIcon fontSize="small" />,
        render: (row) => row.trip_id || "-",
      },

      //   {
      //     key: "pow_id",
      //     label: "POW ID",
      //     icon: <BadgeOutlined fontSize="small" />,
      //     render: (row) => row.pow_id || "-",
      //     isFilter: true,
      //   },
      //   {
      //     key: "task_id",
      //     label: "Task ID",
      //     icon: <BadgeOutlined fontSize="small" />,
      //     render: (row) => row.task_id || "-",
      //     isFilter: true,
      //   },

      //   {
      //     key: "latitude",
      //     label: "Latitude",
      //     icon: <LocationOnOutlined fontSize="small" />,
      //     render: (row) => row.latitude ?? "-",
      //   },
      //   {
      //     key: "longitude",
      //     label: "Longitude",
      //     icon: <LocationOnOutlined fontSize="small" />,
      //     render: (row) => row.longitude ?? "-",
      //   },

      //   {
      //     key: "user_id",
      //     label: "User ID",
      //     icon: <AccountCircleOutlined fontSize="small" />,
      //     render: (row) => row.user_id || "-",
      //     isFilter: true,
      //   },
    ],
    [],
  );

  return (
    <PageLayout title="Aster <> TMS | Rider Comment Dashboard">
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
            filename="aster-rider-data.xlsx"
            company="aster"
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

export default TmsAsterDashboard;
