import React from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchBar from "../../../../components/SearchBar";

const BoolMark = ({ value }) => {
  if (value === true) {
    return <CheckCircleIcon fontSize="small" className="text-emerald-500" />;
  }
  if (value === false) {
    return <CancelIcon fontSize="small" className="text-rose-500" />;
  }
  return null;
};

const Row = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 py-1">
    <span className="text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
      {label}
    </span>
    <span className="text-sm text-gray-800 dark:text-gray-100">{children}</span>
  </div>
);

const PriorityBadge = ({ value }) => {
  const tone =
    value <= 2
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : value <= 4
        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
        : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone}`}
      title={`Priority ${value}`}
    >
      Priority • {value}
    </span>
  );
};

const formatWeight = (value) => {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    return String(value);
  }
  if (Math.abs(value) >= 1000) {
    const kg = value / 1000;
    return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(kg)} kg`;
  }
  return `${new Intl.NumberFormat("en-IN").format(value)} g`;
};

const extractAccountId = (value) => {
  if (!value) return "—";
  const numericMatch = String(value).match(/(\d+)(?!.*\d)/);
  return numericMatch ? numericMatch[1] : String(value);
};

const DeliveryPartnersPanel = ({
  query,
  onQueryChange,
  loading,
  error,
  usingFallback,
  partners,
}) => {
  const handleQueryChange = (event) => {
    onQueryChange?.(event.target.value);
  };

  const visibleCount = partners?.length ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-none space-y-4 pt-1 pr-2">
        <SearchBar
          value={query}
          onChange={handleQueryChange}
          placeholder="Search by name, account or parent id"
          aria-label="Search delivery partners"
        />

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
            {usingFallback ? " Showing default delivery partners." : ""}
          </div>
        )}
      </div>

      <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto pt-4 pr-2">
        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="skeleton-surface h-3 w-24 rounded-full" />
                    <div className="skeleton-surface h-4 w-36 rounded-full" />
                  </div>
                  <div className="skeleton-surface h-5 w-20 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="skeleton-surface h-3 w-full rounded" />
                  <div className="skeleton-surface h-3 w-5/6 rounded" />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="skeleton-surface h-3 rounded" />
                    <div className="skeleton-surface h-3 rounded" />
                    <div className="skeleton-surface h-3 rounded" />
                    <div className="skeleton-surface h-3 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !visibleCount ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No delivery partners found
          </div>
        ) : (
          partners.map((d) => {
            const transportMode = d?.logistics?.transport_mode;
            const operations = Array.isArray(d?.logistics?.operations)
              ? d.logistics.operations.filter(Boolean)
              : [];
            const minWeight = d?.logistics?.min_wt;
            const maxWeight = d?.logistics?.max_wt;
            const hasWeightRange =
              minWeight !== undefined || maxWeight !== undefined;

            return (
              <div
                key={d._id || d.name}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/[0.06]"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                      {d.display_name || "Unnamed partner"}
                    </span>
                    {/* {d.name && (
                      <span className="truncate text-xs font-mono text-gray-500 dark:text-gray-400">
                        {d.name}
                      </span>
                    )} */}
                  </div>
                  {typeof d.priority === "number" && (
                    <PriorityBadge value={d.priority} />
                  )}
                </div>

                {(transportMode || operations.length > 0) && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    {transportMode && (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                        {transportMode.replace(/_/g, " ")}
                      </span>
                    )}
                    {operations.map((op) => (
                      <span
                        key={op}
                        className="rounded-full bg-gray-100 px-2 py-1 text-gray-700 dark:bg-white/10 dark:text-gray-200"
                      >
                        {op.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  {d.name && <Row label="ID">{extractAccountId(d.name)}</Row>}

                  {hasWeightRange && (
                    <Row label="DP weight range">
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        {formatWeight(minWeight)} – {formatWeight(maxWeight)}
                      </span>
                    </Row>
                  )}

                  {typeof d.is_3p_dp === "boolean" && (
                    <Row label="3P partner">
                      <BoolMark value={d.is_3p_dp} />
                    </Row>
                  )}

                  {typeof d.is_fragile === "boolean" && (
                    <Row label="Fragile">
                      <BoolMark value={d.is_fragile} />
                    </Row>
                  )}

                  {typeof d.is_hazmat === "boolean" && (
                    <Row label="Hazmat">
                      <BoolMark value={d.is_hazmat} />
                    </Row>
                  )}

                  {typeof d.is_liquid === "boolean" && (
                    <Row label="Liquid">
                      <BoolMark value={d.is_liquid} />
                    </Row>
                  )}

                  {typeof d.is_hvi === "boolean" && (
                    <Row label="High value">
                      <BoolMark value={d.is_hvi} />
                    </Row>
                  )}

                  {typeof d.is_1p === "boolean" && (
                    <Row label="1P network">
                      <BoolMark value={d.is_1p} />
                    </Row>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DeliveryPartnersPanel;
