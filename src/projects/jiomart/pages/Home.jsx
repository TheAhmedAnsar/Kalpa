// FyndOrdersDashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "primereact/chart";
import { defaults as chartDefaults } from "chart.js";
import { Skeleton } from "@mui/material";
import apiClient from "../../../api/client";
import PageLayout from "../../../components/PageLayout";
import samplePayload from "./samplePayload.json";

const palette = {
  blue: "#38bdf8",
  purple: "#a855f7",
  yellow: "#facc15",
  pink: "#f472b6",
};

const DEFAULT_HOURLY_WINDOW = 24;
const DARK_GRID_COLOR = "#1f2937";

/**
 * - UTC → IST everywhere (labels & bucketing)
 * - Daily grouped bars: 1P / 3P / Arong in chronological order (left→right)
 * - Hourly mixed chart: last 24h (IST) → 1P/3P lines + ROMS/MStar bars
 * - Dark mode: high-contrast + safe global defaults with guards
 * - Compact visuals (≈180–220px)
 */

// ==============================
// Default payload (your sample)
// ==============================
const defaultPayload = samplePayload;

// ==============================
// Helpers / transforms (IST)
// ==============================
const IST = "Asia/Kolkata";
const HOUR_MS = 3600000;

const num = (x) => Number(x ?? 0);
const fmtDay = (iso) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
const fmtKey = (iso) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
const monthsShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const pad2 = (value) => String(value ?? "").padStart(2, "0");

// Prefer the first key that resolves to an array (even empty) for flexibility
const pickSeries = (source = {}, keys = []) => {
  for (const key of keys) {
    const candidate = source?.[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

const extractDate = (row = {}) =>
  row.order_date || row.orderDate || row.date || row.day || row.dt;

const extractCount = (row = {}) =>
  row.order_count ??
  row.orderCount ??
  row.count ??
  row.total ??
  row.value ??
  row.orders;

const extractTimestampParts = (raw) => {
  if (typeof raw !== "string") return null;
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
};

const formatTimestampLabel = (raw) => {
  if (!raw) return "";
  const parts = extractTimestampParts(raw);
  if (!parts) {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }
  const monthName = monthsShort[parts.month - 1] || pad2(parts.month);
  return `${monthName} ${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}`;
};

const formatTimestampRange = (fromRaw, toRaw) => {
  if (!fromRaw && !toRaw) return "";
  const start = formatTimestampLabel(fromRaw);
  const end = formatTimestampLabel(toRaw);
  if (!fromRaw || !toRaw) return start || end;
  return start === end ? start : `${start} – ${end}`;
};
const kFmt = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}`;
};

// Daily rows (ascending)
function unifyDaily(weeklyStats = {}) {
  const p1Series = pickSeries(weeklyStats, [
    "onePOrdersWeeklyCount",
    "onePOrdersCount",
    "romsOrderCount", // backend alt name
  ]);
  const p3Series = pickSeries(weeklyStats, [
    "threePOrdersWeeklyCount",
    "threePOrdersWeeklycount",
    "threePOrdersCount",
    "mstarOrderCount", // backend alt name
  ]);
  const arongSeries = pickSeries(weeklyStats, [
    "arongOrders",
    "arong",
    "arongOrderCount",
  ]);

  const map = new Map();
  const patchAt = (iso, patch) => {
    if (!iso) return;
    let key;
    let label;
    try {
      key = fmtKey(iso);
      label = fmtDay(iso);
    } catch {
      return; // ignore invalid dates rather than breaking render
    }
    const cur = map.get(key) || {
      label,
      dkey: key,
      p1: 0,
      p3: 0,
      arong: 0,
    };
    map.set(key, { ...cur, ...patch });
  };

  p1Series.forEach((r) => {
    const date = extractDate(r);
    if (!date) return;
    patchAt(date, { p1: num(extractCount(r)) });
  });
  p3Series.forEach((r) => {
    const date = extractDate(r);
    if (!date) return;
    patchAt(date, { p3: num(extractCount(r)) });
  });
  arongSeries.forEach((r) => {
    const date = extractDate(r);
    if (!date) return;
    patchAt(date, { arong: num(extractCount(r)) });
  });

  return Array.from(map.values()).sort((a, b) => (a.dkey < b.dkey ? -1 : 1));
}

// Last N hours window (uses raw IST timestamps)
function buildHourlyLastNHours(hourlyStats = {}, n = DEFAULT_HOURLY_WINDOW) {
  const hourly1p = pickSeries(hourlyStats, [
    "onePOrdersHourlyCount",
    "onePOrdersHourlycount",
    "romsOrdersHourlyCount",
  ]);
  const hourly3p = pickSeries(hourlyStats, [
    "threePOrdersHourlycount",
    "threePOrdersHourlyCount",
    "mstarOrdersHourlyCount",
  ]);
  const roms = pickSeries(hourlyStats, [
    "failedRomsOrderHourlyCount",
    "romsFailuresHourlyCount",
  ]);
  const mstar = pickSeries(hourlyStats, [
    "failedMStarOrderHourlyCount",
    "mstarFailuresHourlyCount",
  ]);

  const parseEpoch = (raw) => {
    if (!raw) return null;
    const date = new Date(raw);
    const value = date.getTime();
    return Number.isNaN(value) ? null : value;
  };

  const toValueMap = (arr) => {
    const map = new Map();
    (arr || []).forEach((r) => {
      const key = parseEpoch(r.order_hour);
      if (key == null) return;
      const next = Number(r.order_count || 0);
      map.set(key, (map.get(key) || 0) + next);
    });
    return map;
  };

  const m1 = toValueMap(hourly1p);
  const m3 = toValueMap(hourly3p);
  const mr = toValueMap(roms);
  const mm = toValueMap(mstar);

  const timeline = new Map();
  [hourly1p, hourly3p, roms, mstar].forEach((arr) => {
    (arr || []).forEach((r) => {
      const key = parseEpoch(r.order_hour);
      if (key == null || timeline.has(key)) return;
      timeline.set(key, { epoch: key, raw: r.order_hour });
    });
  });

  const sortedTimeline = Array.from(timeline.values()).sort(
    (a, b) => a.epoch - b.epoch,
  );
  const windowEntries =
    sortedTimeline.length > n
      ? sortedTimeline.slice(sortedTimeline.length - n)
      : sortedTimeline;

  const labels = [];
  const s1 = [];
  const s3 = [];
  const sR = [];
  const sM = [];

  windowEntries.forEach(({ epoch, raw }) => {
    labels.push(formatTimestampLabel(raw));
    s1.push(m1.get(epoch) ?? 0);
    s3.push(m3.get(epoch) ?? 0);
    sR.push(mr.get(epoch) ?? 0);
    sM.push(mm.get(epoch) ?? 0);
  });

  const windowText = windowEntries.length
    ? formatTimestampRange(
        windowEntries[0].raw,
        windowEntries[windowEntries.length - 1].raw,
      )
    : "";

  return { labels, p1: s1, p3: s3, roms: sR, mstar: sM, windowText };
}

// ==============================
// Component
// ==============================
export default function FyndOrdersDashboard({ payload = defaultPayload }) {
  const fallbackPayload = payload ?? defaultPayload;
  const fallbackRef = useRef(fallbackPayload);
  const [dashboardPayload, setDashboardPayload] =
    useState(fallbackPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fallbackRef.current = fallbackPayload;
    setDashboardPayload(fallbackPayload);
  }, [fallbackPayload]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.post(
          "__deku/api/v1/fetch/dashboard-data",
          { cluster: "jmrt" },
          {
            signal: controller.signal,
          },
        );
        if (!active) return;
        const nextPayload =
          response && response.data && typeof response.data === "object"
            ? response.data
            : fallbackRef.current;
        fallbackRef.current = nextPayload;
        setDashboardPayload(nextPayload);
      } catch (err) {
        if (controller.signal.aborted || !active) return;
        console.error("Failed to fetch dashboard data:", err);
        setError(err?.message || "Failed to load dashboard data");
        setDashboardPayload(fallbackRef.current);
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
    if (!dashboardPayload || typeof dashboardPayload !== "object") {
      return {};
    }

    if (dashboardPayload.weekly_stats || dashboardPayload.hourly_stats) {
      return dashboardPayload;
    }

    const source = dashboardPayload.data;
    if (Array.isArray(source)) {
      const first = source.find((entry) => entry && typeof entry === "object");
      return first || {};
    }

    if (source && typeof source === "object") {
      return source;
    }

    return {};
  }, [dashboardPayload]);
  const weeklyStats = useMemo(() => {
    const source = record?.weekly_stats;
    return source && typeof source === "object" ? source : {};
  }, [record]);
  const hourlyStats = useMemo(() => {
    const source = record?.hourly_stats;
    return source && typeof source === "object" ? source : {};
  }, [record]);

  // Data
  const daily = useMemo(() => unifyDaily(weeklyStats), [weeklyStats]);
  const hourly = useMemo(
    () => buildHourlyLastNHours(hourlyStats, DEFAULT_HOURLY_WINDOW),
    [hourlyStats],
  );

  // KPIs
  const kpis = useMemo(() => {
    const fallback = { p1: 0, p3: 0, arong: 0 };
    const latest = daily.length ? daily[daily.length - 1] : fallback;
    const previous = daily.length > 1 ? daily[daily.length - 2] : latest;
    const windowOrders =
      (hourly.p1 || []).reduce((a, b) => a + b, 0) +
      (hourly.p3 || []).reduce((a, b) => a + b, 0);
    const windowFailures =
      (hourly.roms || []).reduce((a, b) => a + b, 0) +
      (hourly.mstar || []).reduce((a, b) => a + b, 0);
    const failRate =
      windowOrders > 0 ? (windowFailures / windowOrders) * 100 : 0;

    const weekTotals = daily.reduce(
      (acc, r) => ({
        p1: acc.p1 + r.p1,
        p3: acc.p3 + r.p3,
        arong: acc.arong + r.arong,
      }),
      { p1: 0, p3: 0, arong: 0 },
    );

    const rawWindowHours = hourly?.labels?.length ?? 0;
    const windowHours = rawWindowHours || DEFAULT_HOURLY_WINDOW;
    const windowTitle = `${windowHours}h`;
    const windowDescription = `Last ${windowHours} hours`;

    return {
      lastP1: previous.p1,
      lastP3: previous.p3,
      lastArong: previous.arong,
      weekP1: weekTotals.p1,
      weekP3: weekTotals.p3,
      weekArong: weekTotals.arong,
      windowOrders,
      windowFailures,
      failRate,
      windowHours,
      windowTitle,
      windowDescription,
    };
  }, [daily, hourly]);

  // Theme awareness (Tailwind `dark`)
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    const root = document.documentElement;
    return (
      root.getAttribute("data-theme") === "dark" ||
      root.classList.contains("dark")
    );
  });
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const root = document.documentElement;
    const readTheme = () =>
      root.getAttribute("data-theme") === "dark" ||
      root.classList.contains("dark");
    const update = () =>
      setIsDark((prev) => {
        const next = readTheme();
        return prev !== next ? next : prev;
      });
    const obs = new MutationObserver(update);
    obs.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    update();
    return () => obs.disconnect();
  }, []);

  // Force Chart.js GLOBAL defaults safely (guard all paths)
  useEffect(() => {
    const d = chartDefaults;
    try {
      d.color = isDark ? "#e7eaf0" : "#0f172a";
      d.borderColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
      d.font = {
        ...(d.font || {}),
        family:
          'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial',
        size: 11,
      };

      d.plugins = d.plugins || {};
      d.plugins.legend = d.plugins.legend || {};
      d.plugins.legend.labels = d.plugins.legend.labels || {};
      d.plugins.legend.labels.color = d.color;
      d.plugins.legend.labels.boxWidth = 10;

      d.plugins.tooltip = d.plugins.tooltip || {};
      d.plugins.tooltip.backgroundColor = isDark ? "#111827" : "#ffffff";
      d.plugins.tooltip.borderColor = isDark ? DARK_GRID_COLOR : "#e2e8f0";
      d.plugins.tooltip.borderWidth = 1;
      d.plugins.tooltip.titleColor = d.color;
      d.plugins.tooltip.bodyColor = isDark ? "#cbd5e1" : "#475569";

      // Common scale defaults
      d.scale = d.scale || {};
      d.scale.grid = {
        ...(d.scale.grid || {}),
        color: isDark ? DARK_GRID_COLOR : "#e2e8f0",
        drawBorder: false,
      };
      // d.scale.ticks = { ...(d.scale.ticks || {}), color: d.color };
      d.scale.ticks.color = isDark ? "#e7eaf0" : "#0f172a";
    } catch {
      // ignore — some chart.js versions structure defaults differently
    }
  }, [isDark]);

  // Remount charts on theme change so new defaults apply 100%
  const [chartKey, setChartKey] = useState(0);
  useEffect(() => setChartKey((k) => k + 1), [isDark]);

  // ---------------- Charts ----------------
  const theme = useMemo(
    () => ({
      text: isDark ? "#e7eaf0" : "#0f172a",
      subtext: isDark ? "#cbd5e1" : "#475569",
      grid: isDark ? DARK_GRID_COLOR : "#e2e8f0",
      panel: isDark ? "#111827" : "#ffffff",
    }),
    [isDark],
  );

  const dailyBarData = useMemo(
    () => ({
      labels: daily.map((d) => d.label),
      datasets: [
        {
          type: "bar",
          label: "1P",
          data: daily.map((d) => d.p1),
          backgroundColor: palette.blue,
          borderRadius: 6,
        },
        {
          type: "bar",
          label: "3P",
          data: daily.map((d) => d.p3),
          backgroundColor: palette.purple,
          borderRadius: 6,
        },
        {
          type: "bar",
          label: "Arong",
          data: daily.map((d) => d.arong),
          backgroundColor: palette.yellow,
          borderRadius: 6,
        },
      ],
    }),
    [daily],
  );

  const dailyBarOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      responsive: true,
      layout: { padding: { top: 2, right: 6, bottom: 2, left: 6 } },
      datasets: {
        bar: {
          barPercentage: 0.5,
          categoryPercentage: 0.6,
          maxBarThickness: 14,
        },
      },
      plugins: {
        legend: {
          labels: {
            color: theme.text,
            boxWidth: 10,
            font: { size: 11, weight: "600" },
          },
        },
        tooltip: {
          backgroundColor: theme.panel,
          borderColor: theme.grid,
          borderWidth: 1,
          titleColor: theme.text,
          bodyColor: theme.subtext,
          displayColors: true,
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: theme.grid, drawBorder: false },
          ticks: {
            color: theme.text, // Ensure text color uses theme
            font: { size: 11 },
          },
        },
        y: {
          grid: { color: theme.grid, drawBorder: false },
          ticks: {
            color: theme.text, // Ensure text color uses theme
            font: { size: 11 },
            callback: (v) => kFmt(v),
          },
        },
      },
    }),
    [theme],
  );

  const hourlyMixData = useMemo(
    () => ({
      labels: hourly.labels,
      datasets: [
        {
          type: "line",
          label: "1P",
          data: hourly.p1,
          borderColor: palette.blue,
          pointBackgroundColor: palette.blue,
          backgroundColor: "transparent",
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 3,
          borderWidth: 2,
        },
        {
          type: "line",
          label: "3P",
          data: hourly.p3,
          borderColor: palette.purple,
          pointBackgroundColor: palette.purple,
          backgroundColor: "transparent",
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 3,
          borderWidth: 2,
        },
        {
          type: "bar",
          label: "ROMS Failures",
          data: hourly.roms,
          backgroundColor: palette.pink,
          borderRadius: 4,
          yAxisID: "y1",
        },
        {
          type: "bar",
          label: "MStar Failures",
          data: hourly.mstar,
          backgroundColor: palette.yellow,
          borderRadius: 4,
          yAxisID: "y1",
        },
      ],
    }),
    [hourly],
  );

  const hourlyMixOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { top: 2, right: 6, bottom: 2, left: 6 } },
      datasets: {
        bar: {
          barPercentage: 0.5,
          categoryPercentage: 0.55,
          maxBarThickness: 14,
        },
      },
      plugins: {
        legend: {
          labels: {
            color: theme.text,
            boxWidth: 10,
            font: { size: 11, weight: "600" },
          },
        },
        tooltip: {
          backgroundColor: theme.panel,
          borderColor: theme.grid,
          borderWidth: 1,
          titleColor: theme.text,
          bodyColor: theme.subtext,
          callbacks: {
            title: (items) =>
              items?.[0]?.label ? `Hour: ${items[0].label}` : "",
            label: (ctx) =>
              `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: theme.grid, drawBorder: false },
          ticks: {
            color: theme.text, // Ensure text color uses theme
            maxRotation: 0,
            font: { size: 11 },
          },
        },
        y: {
          grid: { color: theme.grid, drawBorder: false },
          ticks: {
            color: theme.text, // Ensure text color uses theme
            font: { size: 11 },
            callback: (v) => kFmt(v),
          },
          position: "left",
        },
        y1: {
          grid: { drawOnChartArea: false },
          ticks: {
            color: theme.text, // Ensure text color uses theme
            font: { size: 11 },
          },
          position: "right",
        },
      },
    }),
    [theme],
  );

  // ==============================
  // UI
  // ==============================
  const Card = ({ title, value, sub, tone = "blue" }) => {
    const accentMap = {
      blue: "from-sky-400/80 via-sky-400/30 to-transparent",
      purple: "from-violet-500/80 via-violet-500/30 to-transparent",
      yellow: "from-amber-300/80 via-amber-300/30 to-transparent",
      pink: "from-pink-400/80 via-pink-400/30 to-transparent",
    };
    const accent = accentMap[tone] || accentMap.blue;

    return (
      <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111417]">
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
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="relative overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111417]"
          >
            <Skeleton variant="text" width="55%" height={16} />
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="text" width="70%" height={14} />
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className="min-h-0 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111417]"
          >
            <div className="mb-3 space-y-2">
              <Skeleton variant="text" width="60%" height={18} />
              <Skeleton variant="text" width="45%" height={14} />
            </div>
            <div className="h-[200px] min-h-0 md:h-[240px]">
              <Skeleton
                variant="rounded"
                width="100%"
                height="100%"
                style={{ height: "100%" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111417]">
        <Skeleton variant="text" width="35%" height={20} />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3].map((idx) => (
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
    </>
  );

  return (
    <PageLayout
      title="Orders Dashboard"
      titleClassName="font-extrabold"
      contentClassName="flex flex-1 flex-col gap-4 overflow-hidden"
    >
      {!loading && error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Card
              title={`Last ${kpis.windowTitle} Orders`}
              value={kFmt(kpis.windowOrders)}
              sub={`${kpis.windowDescription} • 1P + 3P`}
              tone="blue"
            />
            <Card
              title={`Last ${kpis.windowTitle} Failures`}
              value={kFmt(kpis.windowFailures)}
              sub={`${kpis.windowDescription} • ${kpis.failRate.toFixed(1)}% fail rate`}
              tone="pink"
            />
            <Card
              title="Last Day 1P"
              value={kFmt(kpis.lastP1)}
              sub="Most recent day"
              tone="yellow"
            />
            <Card
              title="Last Day 3P"
              value={kFmt(kpis.lastP3)}
              sub="Most recent day"
              tone="purple"
            />
          </div>

          {/* Charts */}
          <div className="grid flex-1 grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1">
            <div className="min-h-0 rounded-2xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#111417]">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    Hourly — Last {kpis.windowHours} Hours
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Orders vs ROMS &amp; MStar failures
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {hourly.windowText || "—"}
                </div>
              </div>
              <div className="h-[200px] min-h-0 md:h-[240px]">
                {/* key ensures remount on theme flip so globals apply */}
                <Chart
                  key={`hourly-${chartKey}`}
                  type="line"
                  data={hourlyMixData}
                  options={hourlyMixOptions}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>

            <div className="min-h-0 rounded-2xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#111417]">
              <div className="mb-1">
                <div className="text-sm font-semibold">
                  Daily — 1P / 3P / Arong
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Comparative totals for the recent week
                </div>
              </div>
              <div className="h-[200px] min-h-0 md:h-[240px]">
                <Chart
                  key={`daily-${chartKey}`}
                  type="bar"
                  data={dailyBarData}
                  options={dailyBarOptions}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* Daily breakdown */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#111417]">
            {/* <div className="mb-1 flex flex-shrink-0">
              <div className="text-sm font-semibold">Daily Breakdown</div>
            </div> */}
            <div className="hidden grid-cols-[90px_minmax(0,1fr)_130px] gap-3 border-b border-gray-200 px-5 pb-2 text-xs font-semibold tracking-wide text-gray-600 uppercase md:grid dark:border-gray-700 dark:text-gray-300">
              <div className="text-nowrap">Daily Breakdown</div>
              <div></div>
              <div className="text-right">Totals</div>
            </div>
            <ul className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
              {daily.map((r) => {
                const total = r.p1 + r.p3 + r.arong;
                const p1w = total ? Math.round((r.p1 / total) * 100) : 0;
                const p3w = total ? Math.round((r.p3 / total) * 100) : 0;
                const aw = total ? Math.round((r.arong / total) * 100) : 0;
                return (
                  <li
                    key={r.dkey}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-transparent p-3 hover:border-gray-200 hover:bg-gray-50 md:grid-cols-[90px_minmax(0,1fr)_130px] dark:hover:border-gray-700 dark:hover:bg-white/5"
                  >
                    <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {r.label}
                    </div>
                    <div className="min-w-0 space-y-3">
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full"
                          style={{
                            width: `${p1w}%`,
                            backgroundColor: palette.blue,
                          }}
                          title={`1P: ${r.p1.toLocaleString()} (${p1w}%)`}
                        />
                        <div
                          className="h-full"
                          style={{
                            width: `${p3w}%`,
                            backgroundColor: palette.purple,
                          }}
                          title={`3P: ${r.p3.toLocaleString()} (${p3w}%)`}
                        />
                        <div
                          className="h-full"
                          style={{
                            width: `${aw}%`,
                            backgroundColor: palette.yellow,
                          }}
                          title={`Arong: ${r.arong.toLocaleString()} (${aw}%)`}
                        />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-gray-600 dark:text-gray-300">
                        <span>1P: {r.p1.toLocaleString()}</span>
                        <span>3P: {r.p3.toLocaleString()}</span>
                        <span>Arong: {r.arong.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs font-semibold text-gray-900 tabular-nums dark:text-gray-100">
                      {total.toLocaleString()}
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        Total orders
                      </div>
                      {/* <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    1P {p1w}% · 3P {p3w}% · Arong {aw}%
                  </div> */}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </PageLayout>
  );
}
