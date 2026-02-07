import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import PageLayout from "../../../components/PageLayout";
import apiClient from "../../../api/client";
import ManageNotAccessedModal from "../components/ManageNotAccessedModal";
import ManageAccessModal from "../components/ManageAccessModal";

const InfoTile = ({ label, value }) => (
  <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-black">
    <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
      {label}
    </div>
    <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
      {value ?? "-"}
    </div>
  </div>
);

const Skeleton = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${className}`}
  />
);

const StatusDot = ({ active }) => (
  <span
    className={`relative inline-flex h-3 w-3 rounded-full ${
      active ? "bg-green-400" : "bg-red-400"
    }`}
  >
    <span
      className={`absolute inline-flex h-full w-full rounded-full ${
        active
          ? "animate-ping bg-green-400 opacity-75"
          : "bg-red-400 opacity-75"
      }`}
    />
  </span>
);

const inputClasses =
  "h-11 w-1/3 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-gray-700 dark:bg-black dark:text-gray-100";

const WMSUserDetails = () => {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [notAccessedCompanies, setNotAccessedCompanies] = useState([]);
  const [accessStats, setAccessStats] = useState({
    companyCount: 0,
    warehouseCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Local search states for the two lists
  const [searchAccessed, setSearchAccessed] = useState("");
  // const [searchNotAccessed, setSearchNotAccessed] = useState(""); // Removed

  // Modal states
  const [manageCompaniesOpen, setManageCompaniesOpen] = useState(false);
  const [manageAccessModal, setManageAccessModal] = useState(null); // { id, name, role, active }

  const userId = searchParams.get("userId");
  const emailParam = searchParams.get("email");

  const fetchUser = async (signal) => {
    if (!userId) {
      setError("Missing user ID.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(
        "__deku/api/v1/__wms/fetch/user-details",
        {
          params: { userId: parseInt(userId) },
          signal,
        },
      );
      const payload = response?.data?.data;
      const userDetail = payload?.user;

      if (!userDetail) {
        throw new Error("User details not found.");
      }

      // Process user data
      const processedUser = {
        _id: userDetail._id,
        email: userDetail.email,
        active: userDetail.active,
        phoneNumber: userDetail.phoneNumber,
        firstName: userDetail.full_name?.split(" ")[0] || "",
        lastName: userDetail.full_name?.split(" ").slice(1).join(" ") || "",
        emailVerified: userDetail.emailVerified || false,
      };

      // Process accessed companies
      const accessedCompanies = Array.isArray(payload?.accessed_companies)
        ? payload.accessed_companies.map((company) => ({
            id: company.orgId,
            name: company.organization_name || "-",
            role: company.role_name || "-",
            active: company.active,
          }))
        : [];

      setUser(processedUser);
      setCompanies(accessedCompanies);
      setNotAccessedCompanies([]); // Will need separate endpoint for this
      setAccessStats({
        companyCount: parseInt(userDetail.organization_count) || 0,
        warehouseCount: parseInt(userDetail.warehouse_count) || 0,
      });
    } catch (err) {
      if (!signal?.aborted) {
        setError(err?.message || "Failed to load user details");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchUser(controller.signal);
    return () => controller.abort();
  }, [userId]);

  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : "";

  // Filtered lists (by company name)
  const filteredAccessed = useMemo(() => {
    const term = searchAccessed.trim().toLowerCase();
    if (!term) return companies;
    return companies.filter((c) =>
      (c?.name || "").toLowerCase().includes(term),
    );
  }, [companies, searchAccessed]);

  // const filteredNotAccessed = useMemo(() => {
  //   const term = searchNotAccessed.trim().toLowerCase();
  //   if (!term) return notAccessedCompanies;
  //   return notAccessedCompanies.filter((c) =>
  //     (c?.name || "").toLowerCase().includes(term),
  //   );
  // }, [notAccessedCompanies, searchNotAccessed]);

  return (
    <PageLayout
      title="WMS User Details"
      titleClassName="font-extrabold text-xl sm:text-2xl lg:text-3xl"
      // hide outer overflow so inner panes manage scroll independently
      contentClassName="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pb-6"
    >
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        // Skeleton loading state
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {/* Header skeleton */}
          <div className="rounded-2xl border border-black/5 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent p-5 shadow-sm dark:border-white/10 dark:from-gray-800/50 dark:via-transparent dark:to-transparent">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <Skeleton className="mb-2 h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-20 rounded-full" />
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-black"
                >
                  <Skeleton className="mb-2 h-3 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
          {/* Table skeleton */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-black">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <div className="mt-3">
              <Skeleton className="h-11 w-1/3 rounded-md" />
            </div>
            <div className="mt-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Actual content
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {/* Header card (User Details) */}
          <div className="rounded-2xl border border-black/5 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent p-5 shadow-sm dark:border-white/10 dark:from-gray-800/50 dark:via-transparent dark:to-transparent">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {fullName || "Loading..."}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {user?.email || "Fetching profile"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-white/10 dark:text-gray-100 dark:ring-white/10">
                  {user?.active ? (
                    <>
                      <CheckCircleRoundedIcon className="h-4 w-4 text-emerald-500" />{" "}
                      Active
                    </>
                  ) : (
                    <>
                      <CancelRoundedIcon className="h-4 w-4 text-rose-500" />{" "}
                      Inactive
                    </>
                  )}
                </div>
                <button
                  onClick={() => setManageCompaniesOpen(true)}
                  className="h-10 cursor-pointer rounded-full bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Add Companies
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoTile label="Phone" value={user?.phoneNumber || "-"} />
              <InfoTile
                label="Email verified"
                value={user?.emailVerified ? "Yes" : "No"}
              />
              <InfoTile
                label="Accessible Companies"
                value={accessStats.companyCount}
              />
              <InfoTile
                label="Accessible Warehouses"
                value={accessStats.warehouseCount}
              />
            </div>
          </div>

          {/* Accessed companies panel */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-black">
            {/* Panel header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Accessible Companies
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-100 px-4 py-3 text-xs font-semibold text-indigo-700 dark:bg-gray-800 dark:text-gray-200">
                  {companies.length} linked
                </span>
              </div>
            </div>

            {/* Search (fixed) */}
            <div className="mt-3">
              <input
                type="text"
                value={searchAccessed}
                onChange={(e) => setSearchAccessed(e.target.value)}
                placeholder="Search companies by name…"
                className={inputClasses}
                aria-label="Search accessed companies"
              />
            </div>

            {/* Scrollable table container */}
            <div className="mt-3 min-h-0 flex-1 overflow-auto dark:border-gray-800">
              {filteredAccessed.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  {companies.length === 0
                    ? "No company access recorded for this user."
                    : "No companies match your search."}
                </div>
              ) : (
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 text-xs font-semibold tracking-wide text-gray-600 uppercase backdrop-blur dark:border-gray-800 dark:bg-black/95 dark:text-gray-300">
                    <tr>
                      <th className="w-[1%] px-3 py-2"></th>
                      <th className="w-[30%] px-3 py-2">Company name</th>
                      <th className="w-[20%] px-3 py-2">Org ID</th>
                      <th className="w-[25%] px-3 py-2">Role</th>
                      <th className="w-[20%] px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredAccessed.map((company) => (
                      <tr key={company.id || company.name}>
                        <td className="w-[1%] px-3 py-2">
                          <StatusDot active={company.active} />
                        </td>
                        <td className="w-[30%] px-3 py-2 text-gray-900 dark:text-gray-100">
                          {company.name || "-"}
                        </td>
                        <td className="w-[20%] px-3 py-2 text-gray-700 dark:text-gray-200">
                          {company.id ?? "-"}
                        </td>
                        <td className="w-[25%] px-3 py-2 text-gray-700 dark:text-gray-200">
                          <span className="inline-block rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-gray-800 dark:text-gray-200">
                            {company.role || "-"}
                          </span>
                        </td>
                        <td className="w-[20%] px-3 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setManageAccessModal({
                                id: company.id,
                                name: company.name,
                                role: company.role,
                                active: company.active,
                              })
                            }
                            className="h-8 cursor-pointer rounded-md bg-gray-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <ManageNotAccessedModal
        open={manageCompaniesOpen}
        onClose={() => setManageCompaniesOpen(false)}
        userId={userId}
        onAccessGranted={() => fetchUser()}
      />

      <ManageAccessModal
        open={!!manageAccessModal}
        onClose={() => setManageAccessModal(null)}
        company={manageAccessModal}
        userId={userId}
      />
    </PageLayout>
  );
};

export default WMSUserDetails;
