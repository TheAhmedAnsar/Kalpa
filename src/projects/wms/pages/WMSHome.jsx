import { useEffect, useMemo, useState } from "react";
import { Chart } from "primereact/chart";
import { defaults as chartDefaults } from "chart.js";
import { Skeleton } from "@mui/material";
import apiClient from "../../../api/client";
import PageLayout from "../../../components/PageLayout";
import samplePayload from "./samplePayload.json";

const palette = {
  primary: "#6366f1",
  red: "#f97316",
  blue: "#0ea5e9",
};

const companyColors = [
  "#6366f1",
  "#a855f7",
  "#0ea5e9",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
  "#22d3ee",
];

const num = (value) => Number(value ?? 0);

const fmtDay = (iso) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));

const aggregateDaily = (weeklyStats = {}) => {
  const success = weeklyStats?.successfullOrders || {};
  const cancelled = weeklyStats?.cancelledOrders || {};
  const dates = new Set([...Object.keys(success), ...Object.keys(cancelled)]);

  const rows = Array.from(dates).map((dateKey) => {
    const successTotal = (success[dateKey] || []).reduce(
      (acc, entry) => acc + num(entry?.order_count_last_24h_ist),
      0,
    );
    const cancelledTotal = (cancelled[dateKey] || []).reduce(
      (acc, entry) => acc + num(entry?.order_count_last_24h_ist),
      0,
    );
    return {
      key: dateKey,
      label: fmtDay(dateKey),
      successTotal,
      cancelledTotal,
    };
  });

  return rows.sort((a, b) => (a.key < b.key ? -1 : 1));
};

const pickLatestDate = (weeklyStats = {}) => {
  const success = weeklyStats?.successfullOrders || {};
  const cancelled = weeklyStats?.cancelledOrders || {};
  const dates = [
    ...new Set([...Object.keys(success), ...Object.keys(cancelled)]),
  ];
  return dates.sort().at(-1) || null;
};

const topCompaniesForDate = (weeklyStats = {}, dateKey) => {
  if (!dateKey) return [];
  const companies = weeklyStats?.successfullOrders?.[dateKey] || [];
  return [...companies]
    .map((entry) => ({
      ...entry,
      count: num(entry?.order_count_last_24h_ist),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

const buildCompanyDailySeries = (weeklyStats = {}) => {
  const success = weeklyStats?.successfullOrders || {};
  const cancelled = weeklyStats?.cancelledOrders || {};
  const dateKeys = [
    ...new Set([...Object.keys(success), ...Object.keys(cancelled)]),
  ].sort();

  const perCompanyTotals = new Map();
  const perDayCompanyCounts = new Map();

  const addEntries = (entriesByDate = {}) => {
    Object.entries(entriesByDate).forEach(([dateKey, entries]) => {
      const dayMap = perDayCompanyCounts.get(dateKey) || new Map();
      entries.forEach((entry) => {
        const companyId = entry?.company_id;
        const count = num(entry?.order_count_last_24h_ist);
        if (!companyId) return;

        const existingTotal = perCompanyTotals.get(companyId) || {
          name: entry?.company_name || "Unknown",
          total: 0,
        };
        existingTotal.total += count;
        perCompanyTotals.set(companyId, existingTotal);

        dayMap.set(companyId, (dayMap.get(companyId) || 0) + count);
      });
      perDayCompanyCounts.set(dateKey, dayMap);
    });
  };

  addEntries(success);
  addEntries(cancelled);

  const topCompanies = [...perCompanyTotals.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6);

  const datasets = topCompanies.map(([companyId, info], idx) => ({
    label: info.name,
    data: dateKeys.map(
      (date) => perDayCompanyCounts.get(date)?.get(companyId) || 0,
    ),
    backgroundColor: companyColors[idx % companyColors.length],
    borderRadius: 6,
  }));

  return {
    labels: dateKeys.map((d) => fmtDay(d)),
    datasets,
  };
};

const Card = ({ title, value, sub, tone = "primary" }) => {
  const accentMap = {
    primary: "from-indigo-400/80 via-indigo-400/30 to-transparent",
    red: "from-orange-400/80 via-orange-400/30 to-transparent",
    blue: "from-sky-400/80 via-sky-400/30 to-transparent",
  };
  const accent = accentMap[tone] || accentMap.primary;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-black">
      <div
        className={`pointer-events-none absolute inset-x-4 top-0 h-1 rounded-full bg-gradient-to-r ${accent}`}
      />
      <div className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums dark:text-gray-100">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {sub}
        </div>
      ) : null}
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
      {[0, 1, 2, 3].map((idx) => (
        <div
          key={idx}
          className="relative overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-black"
        >
          <Skeleton variant="text" width="55%" height={16} />
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="text" width="70%" height={14} />
        </div>
      ))}
    </div>

    <div className="grid min-h-0 flex-1 gap-3 overflow-hidden md:grid-cols-4">
      <div className="min-h-0 rounded-2xl border border-black/5 bg-white p-5 shadow-sm md:col-span-3 dark:border-white/10 dark:bg-black">
        <div className="mb-3 space-y-1">
          <Skeleton variant="text" width="40%" height={18} />
          <Skeleton variant="text" width="60%" height={14} />
        </div>
        <div className="h-[160px] min-h-0 md:h-[180px] xl:h-[200px]">
          <Skeleton
            variant="rounded"
            width="100%"
            height="100%"
            style={{ height: "100%" }}
          />
        </div>
      </div>

      <div className="min-h-0 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-black">
        <div className="mb-2 space-y-1">
          <Skeleton variant="text" width="50%" height={16} />
          <Skeleton variant="text" width="70%" height={12} />
        </div>
        <div className="h-[140px] min-h-0 md:h-[160px] xl:h-[180px]">
          <Skeleton
            variant="rounded"
            width="100%"
            height="100%"
            style={{ height: "100%" }}
          />
        </div>
      </div>
    </div>

    <div className="grid min-h-0 flex-1 gap-3 overflow-hidden md:grid-cols-4">
      <div className="min-h-0 rounded-2xl border border-black/5 bg-white p-5 shadow-sm md:col-span-3 dark:border-white/10 dark:bg-black">
        <div className="mb-2 space-y-1">
          <Skeleton variant="text" width="45%" height={18} />
          <Skeleton variant="text" width="60%" height={14} />
        </div>
        <div className="h-[160px] min-h-0 md:h-[180px] xl:h-[200px]">
          <Skeleton
            variant="rounded"
            width="100%"
            height="100%"
            style={{ height: "100%" }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-black">
        <div className="mb-2 space-y-1">
          <Skeleton variant="text" width="55%" height={16} />
          <Skeleton variant="text" width="50%" height={12} />
        </div>
        <div className="mt-2 space-y-3 overflow-auto pr-1">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="rounded-xl border border-transparent p-3">
              <Skeleton variant="text" width="40%" height={16} />
              <Skeleton variant="rounded" width="100%" height={12} />
              <div className="mt-2 flex flex-wrap gap-3">
                <Skeleton variant="text" width="25%" height={12} />
                <Skeleton variant="text" width="25%" height={12} />
                <Skeleton variant="text" width="25%" height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const WMSHome = () => {
  const [payload, setPayload] = useState(samplePayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark"),
  );

  // Track theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Force Chart.js GLOBAL defaults for dark mode
  useEffect(() => {
    const d = chartDefaults;
    try {
      d.color = isDark ? "#e2e8f0" : "#0f172a";
      d.borderColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
      d.font = {
        ...(d.font || {}),
        size: 11,
      };

      d.plugins = d.plugins || {};
      d.plugins.legend = d.plugins.legend || {};
      d.plugins.legend.labels = d.plugins.legend.labels || {};
      d.plugins.legend.labels.color = d.color;
      d.plugins.legend.labels.boxWidth = 12;

      // Ensure base tooltip text color also respects theme
      d.plugins.tooltip = d.plugins.tooltip || {};
      d.plugins.tooltip.bodyColor = d.color;
      d.plugins.tooltip.titleColor = d.color;
    } catch {
      // ignore
    }
  }, [isDark]);

  // Remount charts on theme change
  const [chartKey, setChartKey] = useState(0);
  useEffect(() => setChartKey((k) => k + 1), [isDark]);

  // Theme colors object
  const theme = useMemo(
    () => ({
      text: isDark ? "#e2e8f0" : "#0f172a",
      subtext: isDark ? "#cbd5e1" : "#64748b",
      grid: isDark ? "#334155" : "#e2e8f0",
    }),
    [isDark],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.post(
          "__deku/api/v1/fetch/dashboard-data",
          { cluster: "wms" },
          { signal: controller.signal },
        );
        if (!active) return;
        const nextPayload =
          response && response.data && typeof response.data === "object"
            ? response.data
            : samplePayload;
        setPayload(nextPayload);
      } catch (err) {
        if (controller.signal.aborted || !active) return;
        console.error("Failed to fetch WMS dashboard data", err);
        setError(err?.message || "Failed to load WMS dashboard data");
        setPayload(samplePayload);
      } finally {
        if (!controller.signal.aborted && active) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const record = useMemo(() => {
    if (!payload || typeof payload !== "object") return {};
    if (payload.weekly_stats) return payload;
    if (payload.data && typeof payload.data === "object") return payload.data;
    return {};
  }, [payload]);

  const weeklyStats = useMemo(() => record?.weekly_stats || {}, [record]);

  const daily = useMemo(() => aggregateDaily(weeklyStats), [weeklyStats]);
  const latestDate = useMemo(() => pickLatestDate(weeklyStats), [weeklyStats]);
  const topCompanies = useMemo(
    () => topCompaniesForDate(weeklyStats, latestDate),
    [weeklyStats, latestDate],
  );
  const companySeries = useMemo(
    () => buildCompanyDailySeries(weeklyStats),
    [weeklyStats],
  );

  const totals = useMemo(() => {
    const weeklySuccess = daily.reduce((acc, r) => acc + r.successTotal, 0);
    const weeklyCancelled = daily.reduce((acc, r) => acc + r.cancelledTotal, 0);
    const latest = daily.at(-1) || { successTotal: 0, cancelledTotal: 0 };

    return {
      weeklySuccess,
      weeklyCancelled,
      latestSuccess: latest.successTotal,
      latestCancelled: latest.cancelledTotal,
    };
  }, [daily]);

  const dailyBarData = useMemo(
    () => ({
      labels: daily.map((d) => d.label),
      datasets: [
        {
          label: "Successful",
          data: daily.map((d) => d.successTotal),
          backgroundColor: palette.primary,
          borderRadius: 6,
        },
        {
          label: "Cancelled",
          data: daily.map((d) => d.cancelledTotal),
          backgroundColor: palette.red,
          borderRadius: 6,
        },
      ],
    }),
    [daily],
  );

  const dailyBarOptions = useMemo(() => {
    return {
      maintainAspectRatio: false,
      responsive: true,
      barPercentage: 0.7,
      categoryPercentage: 0.8,
      layout: { padding: { top: 8, right: 12, bottom: 8, left: 12 } },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            color: theme.text,
            font: { size: 11 },
          },
        },
        y: {
          stacked: true,
          grid: { color: theme.grid, drawBorder: false },
          ticks: {
            color: theme.text,
            font: { size: 11 },
            callback: (val) => val.toLocaleString(),
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: theme.text,
            boxWidth: 12,
            padding: 12,
            font: { size: 11, weight: "600" },
          },
        },
        tooltip: {
          titleColor: theme.text,
          bodyColor: theme.text,
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}`,
          },
        },
      },
    };
  }, [theme]);

  const latestSplitData = useMemo(
    () => ({
      labels: ["Successful", "Cancelled"],
      datasets: [
        {
          data: [totals.latestSuccess, totals.latestCancelled],
          backgroundColor: [palette.primary, palette.red],
        },
      ],
    }),
    [totals.latestSuccess, totals.latestCancelled],
  );

  const latestSplitOptions = useMemo(() => {
    return {
      cutout: "70%",
      plugins: {
        legend: {
          position: "top",
          labels: {
            boxWidth: 12,
            padding: 10,
            font: { size: 11, weight: "600" },
            color: theme.text,
          },
        },
        tooltip: {
          titleColor: theme.text,
          bodyColor: theme.text,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${Number(ctx.raw).toLocaleString()}`,
          },
        },
      },
      maintainAspectRatio: false,
      responsive: true,
    };
  }, [theme]);

  const companyBarOptions = useMemo(() => {
    return {
      maintainAspectRatio: false,
      responsive: true,
      barPercentage: 0.65,
      categoryPercentage: 0.75,
      layout: { padding: { top: 10, right: 12, bottom: 8, left: 12 } },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            color: theme.text,
            font: { size: 11 },
          },
        },
        y: {
          stacked: true,
          grid: { color: theme.grid, drawBorder: false },
          ticks: {
            color: theme.text,
            font: { size: 11 },
            callback: (val) => val.toLocaleString(),
          },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: theme.text,
            boxWidth: 12,
            padding: 10,
            font: { size: 11, weight: "600" },
          },
        },
        tooltip: {
          titleColor: theme.text,
          bodyColor: theme.text,
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}`,
          },
        },
      },
    };
  }, [theme]);

  return (
    <PageLayout
      title="WMS Orders Dashboard"
      titleClassName="font-extrabold text-xl sm:text-2xl lg:text-3xl"
      contentClassName="flex h-screen flex-col gap-3 overflow-hidden pb-3"
    >
      {!loading && error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          {/* Top KPI Cards: 4 columns at md+ */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Card
              title="Latest Day Successful"
              value={totals.latestSuccess.toLocaleString()}
              sub="Most recent day"
              tone="primary"
            />
            <Card
              title="Latest Day Cancelled"
              value={totals.latestCancelled.toLocaleString()}
              sub="Most recent day"
              tone="red"
            />
            <Card
              title="Weekly Successful"
              value={totals.weeklySuccess.toLocaleString()}
              sub="Sum of shown week"
              tone="blue"
            />
            <Card
              title="Weekly Cancelled"
              value={totals.weeklyCancelled.toLocaleString()}
              sub="Sum of shown week"
              tone="red"
            />
          </div>

          {/* Middle row: 4-column grid; left spans 3, right spans 1 (aligns with a single KPI card width) */}
          <div className="grid min-h-0 flex-1 gap-3 overflow-hidden md:grid-cols-4">
            <div className="min-h-0 rounded-2xl border border-black/5 bg-white p-5 shadow-sm md:col-span-3 dark:border-white/10 dark:bg-black">
              <div className="mb-4">
                <div className="text-base font-semibold text-gray-900 dark:text-white">
                  Orders per company per day
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Stacked by company to show daily counts
                </div>
              </div>
              <div className="h-[160px] min-h-0 md:h-[180px] xl:h-[200px]">
                <Chart
                  key={`company-${chartKey}`}
                  type="bar"
                  data={companySeries}
                  options={companyBarOptions}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>

            <div className="min-h-0 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-black">
              <div className="mb-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Latest day split
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Successful vs cancelled orders
                </div>
              </div>
              <div className="h-[140px] min-h-0 md:h-[160px] xl:h-[180px]">
                <Chart
                  key={`donut-${chartKey}`}
                  type="doughnut"
                  data={latestSplitData}
                  options={latestSplitOptions}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* Bottom row: same 4-column grid; left spans 3, right spans 1 */}
          <div className="grid min-h-0 flex-1 gap-3 overflow-hidden md:grid-cols-4">
            <div className="min-h-0 rounded-2xl border border-black/5 bg-white p-5 shadow-sm md:col-span-3 dark:border-white/10 dark:bg-black">
              <div className="mb-3">
                <div className="text-base font-semibold text-gray-900 dark:text-white">
                  Weekly successful vs cancelled
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Stacked bars per day
                </div>
              </div>
              <div className="h-[160px] min-h-0 md:h-[180px] xl:h-[200px]">
                <Chart
                  key={`daily-${chartKey}`}
                  type="bar"
                  data={dailyBarData}
                  options={dailyBarOptions}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-black">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    Top companies (latest day)
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {latestDate ? `Based on ${latestDate}` : "No data"}
                  </div>
                </div>
                <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-gray-800 dark:text-gray-200">
                  Successful orders
                </div>
              </div>

              <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-auto pr-1">
                {topCompanies.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No company data available.
                  </div>
                ) : (
                  topCompanies.map((company) => (
                    <div
                      key={company.company_id}
                      className="rounded-xl border border-black/5 bg-gray-50 p-3 transition-transform duration-150 ease-in-out hover:-translate-y-0.5 dark:border-white/5 dark:bg-white/5"
                    >
                      <div className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <span>{company.company_name}</span>
                        <span className="text-indigo-600 tabular-nums dark:text-indigo-300">
                          {company.count.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Company ID: {company.company_id}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default WMSHome;
