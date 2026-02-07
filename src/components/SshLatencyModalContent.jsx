import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@mui/material";
import { Chart } from "primereact/chart";
import apiClient from "../api/client";
import useTailwindDark from "../hooks/useTailwindDark";
import CustomDropdown from "./CustomDropdown";

const LATENCY_ENDPOINT = "/__deku/api/v1/ssh/metrics";
const LATENCY_COLOR = "#38bdf8";
const LATENCY_FILL_LIGHT = "rgba(56, 189, 248, 0.22)";
const LATENCY_FILL_DARK = "rgba(56, 189, 248, 0.12)";
const DARK_GRID_COLOR = "#1f2937";

const CLUSTERS = [
  { id: "jmrt", label: "Jiomart" },
  { id: "tira", label: "Tira" },
];

const FALLBACK_LATENCIES = [
  259.449387, 258.790387, 213.070469, 211.255188, 217.751797, 204.724784,
  259.342817, 258.922987, 209.792523, 212.854929, 208.317563, 258.367946,
  212.956546, 258.086737, 260.081307, 258.526587, 214.455259, 253.313681,
  257.881908, 260.924488, 259.791217, 213.246948, 261.023297, 211.433919,
  260.306437, 259.300467, 253.189191, 259.499497, 260.670618, 207.994544,
  256.113881, 206.252935, 258.838597, 260.912768, 255.485101, 206.116184,
  259.285848, 213.223339, 211.973039, 210.290423, 212.054729, 212.967779,
  214.692029, 258.373007, 205.260073, 258.758416, 252.740261, 205.164494,
  258.049257, 260.189027, 254.667251, 258.276585, 259.360946, 254.69807,
  255.300601, 205.744504, 253.352241, 209.174323, 211.5381, 268.290947,
  254.786871, 207.462753, 260.499357, 214.365774, 275.740087, 259.728169,
  260.154647, 218.984857, 272.116177, 206.722903, 205.113834, 202.913264,
];

const parseLatencyPayload = (payload) => {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.map((value, index) => ({
      value,
      label: `H${index + 1}`,
    }));
  }

  if (typeof payload === "object") {
    return Object.entries(payload)
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  return [];
};

const sanitizeLatencySeries = (series) =>
  (Array.isArray(series) ? series : []).reduce((acc, entry, index) => {
    const value = Number(entry?.value ?? entry);
    if (!Number.isFinite(value)) return acc;

    acc.push({
      value,
      timestamp: entry?.timestamp,
      label: entry?.label ?? entry?.timestamp,
      fallbackLabel: `H${index + 1}`,
    });
    return acc;
  }, []);

const formatTimestampLabel = (entry, index) => {
  if (entry?.label) return entry.label;
  if (!entry?.timestamp) return entry?.fallbackLabel ?? `T${index + 1}`;

  const parsedDate = new Date(entry.timestamp);
  if (Number.isNaN(parsedDate.getTime())) {
    return entry.timestamp;
  }

  return parsedDate.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatLatency = (value) =>
  Number.isFinite(value)
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ms`
    : "—";

const LatencySkeleton = () => (
  <div className="space-y-3 py-1">
    <Skeleton variant="text" width="45%" height={25} />
    <Skeleton variant="text" width="65%" height={16} />
    <Skeleton variant="rounded" width="100%" height={270} />
  </div>
);

const LatencyStat = ({ label, value }) => (
  <div className="rounded-xl border border-black/5 bg-gray-100 p-3 text-center dark:border-white/10 dark:bg-[#15191e]">
    <div className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
      {label}
    </div>
    <div className="mt-1 text-sm font-semibold text-gray-900 tabular-nums dark:text-gray-100">
      {value}
    </div>
  </div>
);

const SshLatencyModalContent = () => {
  const isDark = useTailwindDark();
  const fallbackRef = useRef({
    jmrt: sanitizeLatencySeries(parseLatencyPayload(FALLBACK_LATENCIES)),
  });

  const [cluster, setCluster] = useState("jmrt");
  const [series, setSeries] = useState(fallbackRef.current.jmrt);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const fetchLatency = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.post(
          LATENCY_ENDPOINT,
          { cluster },
          { signal: controller.signal },
        );
        if (!active) return;
        const rawSeries = parseLatencyPayload(response?.data?.latency);
        const cleanSeries = sanitizeLatencySeries(rawSeries);
        if (cleanSeries.length) {
          fallbackRef.current = {
            ...fallbackRef.current,
            [cluster]: cleanSeries,
          };
          setSeries(cleanSeries);
        } else {
          setSeries([]);
        }
      } catch (err) {
        if (controller.signal.aborted || !active) return;
        console.error("Failed to fetch SSH latency:", err);
        setError(err?.message || "Failed to load SSH latency data");
        setSeries(fallbackRef.current[cluster] ?? []);
      } finally {
        if (!controller.signal.aborted && active) {
          setLoading(false);
        }
      }
    };

    fetchLatency();

    return () => {
      active = false;
      controller.abort();
    };
  }, [cluster]);

  useEffect(() => setChartKey((prev) => prev + 1), [isDark]);

  const theme = useMemo(
    () => ({
      text: isDark ? "#e7eaf0" : "#0f172a",
      subtext: isDark ? "#cbd5e1" : "#475569",
      grid: isDark ? DARK_GRID_COLOR : "#e2e8f0",
      panel: isDark ? "#111827" : "#ffffff",
    }),
    [isDark],
  );

  const chartData = useMemo(
    () => ({
      labels: series.map((entry, idx) => formatTimestampLabel(entry, idx)),
      datasets: [
        {
          type: "line",
          label: "Latency (ms)",
          data: series.map((entry) => entry.value),
          borderColor: LATENCY_COLOR,
          backgroundColor: isDark ? LATENCY_FILL_DARK : LATENCY_FILL_LIGHT,
          pointBackgroundColor: LATENCY_COLOR,
          tension: 0.35,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 3,
          borderWidth: 2,
        },
      ],
    }),
    [series, isDark],
  );

  const chartOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      responsive: true,
      layout: { padding: { top: 8, right: 12, bottom: 8, left: 12 } },
      plugins: {
        legend: {
          labels: {
            color: theme.text,
            font: { size: 11, weight: "600" },
            usePointStyle: true,
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: theme.panel,
          borderColor: theme.grid,
          borderWidth: 1,
          titleColor: theme.text,
          bodyColor: theme.subtext,
          callbacks: {
            label: (ctx) => {
              const value = Number(ctx.raw);
              if (!Number.isFinite(value))
                return ctx.dataset.label || "Latency";
              return `${ctx.dataset.label || "Latency"}: ${value.toLocaleString(
                undefined,
                { maximumFractionDigits: 2 },
              )} ms`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: theme.grid, drawBorder: false },
          ticks: {
            color: theme.subtext,
            font: { size: 10 },
            maxRotation: 0,
            autoSkip: true,
          },
        },
        y: {
          grid: { color: theme.grid, drawBorder: false },
          ticks: {
            color: theme.text,
            font: { size: 11 },
            callback: (value) =>
              Number(value).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              }),
          },
          title: {
            display: true,
            text: "Milliseconds",
            color: theme.subtext,
            font: { size: 11 },
          },
        },
      },
    }),
    [theme],
  );

  const summary = useMemo(() => {
    if (!series.length) return null;
    const values = series.map((entry) => entry.value);
    const max = Math.max(...values);
    const average = values.reduce((a, v) => a + v, 0) / values.length;
    const latest = values[values.length - 1];
    return { max, average, latest };
  }, [series]);

  const subtitle = series.length
    ? `${formatTimestampLabel(series[0], 0)} → ${formatTimestampLabel(
        series[series.length - 1],
        series.length - 1,
      )}`
    : "Latency samples";

  const activeClusterIndex = CLUSTERS.findIndex((item) => item.id === cluster);
  const selectedCluster = CLUSTERS[activeClusterIndex];

  return (
    <div className="w-full px-1 py-2 sm:px-2">
      <div className="flex flex-col gap-2 pr-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            SSH Latency · {CLUSTERS[activeClusterIndex]?.label || ""}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </div>
          {error && (
            <div className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Custom cluster selector */}
        {/* Custom cluster selector */}
        <div className="w-32">
          <CustomDropdown
            options={CLUSTERS}
            value={selectedCluster}
            onChange={(option) => setCluster(option.id)}
            getOptionLabel={(option) => option.label}
            getOptionValue={(option) => option.id}
            searchable={false}
            buttonClassName="!h-8 !text-xs !py-1"
          />
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <LatencySkeleton />
        ) : series.length ? (
          <>
            <div className="mt-1 h-[240px] min-h-0 w-full">
              <Chart
                key={`ssh-latency-${chartKey}`}
                type="line"
                data={chartData}
                options={chartOptions}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {summary && (
              <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                <LatencyStat
                  label="Latest"
                  value={formatLatency(summary.latest)}
                />
                <LatencyStat
                  label="Average"
                  value={formatLatency(summary.average)}
                />
                <LatencyStat label="Peak" value={formatLatency(summary.max)} />
              </div>
            )}
          </>
        ) : (
          <div className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
            No latency data available.
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(SshLatencyModalContent);
