import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton, CircularProgress } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchBar from "../../../components/SearchBar";
import PageLayout from "../../../components/PageLayout";
import CustomModal from "../../../components/CustomModal";
import apiClient from "../../../api/client";
import { enqueueSnackbar } from "notistack";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { isdCodes } from "../../../constants/isdCodes";
import CustomDropdown from "../../../components/CustomDropdown";

const fieldClasses =
  "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-gray-700 dark:bg-black dark:text-gray-100";

const AddUserModal = ({ open, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    isdCode: "91",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (key) => (event) => {
    setFormData((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.email || !formData.firstName || !formData.lastName) {
      enqueueSnackbar("Email, first name, and last name are required.", {
        variant: "error",
      });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      enqueueSnackbar("Passwords do not match.", { variant: "error" });
      return;
    }

    const payload = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password,
      phoneNumber: formData.phoneNumber,
      isdCode: formData.isdCode,
    };

    setLoading(true);
    apiClient
      .post("/__deku/api/v1/__wms/onboard-user", payload)
      .then((response) => {
        if (response.data.success) {
          enqueueSnackbar(
            response.data.message || "User onboarded successfully",
            { variant: "success" },
          );
          onSuccess();
          onClose();
          if (response.data.data?._id) {
            navigate(
              `/wms-user-details?userId=${response.data.data._id}&email=${response.data.data.email}`,
            );
          }
        } else {
          enqueueSnackbar(response.data.message || "Failed to onboard user", {
            variant: "error",
          });
        }
      })
      .catch((err) => {
        enqueueSnackbar(
          err?.response?.data?.message || err.message || "Something went wrong",
          { variant: "error" },
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <CustomModal open={open} onClose={onClose} size="md">
      <div className="flex h-[350px] w-full flex-col space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-fynd text-2xl font-bold text-gray-900 dark:text-gray-50">
            User Onboarding
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Basic fields */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Email
              <input
                type="email"
                className={fieldClasses}
                placeholder="user@example.com"
                value={formData.email}
                onChange={updateField("email")}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Phone number
              <div className="flex gap-2">
                {/* ISD Code Selector */}
                <div className="w-20">
                  <CustomDropdown
                    options={isdCodes}
                    value={
                      isdCodes.find((c) => c.code === formData.isdCode) || {
                        code: formData.isdCode,
                      }
                    }
                    onChange={(option) => {
                      setFormData((prev) => ({
                        ...prev,
                        isdCode: option.code,
                      }));
                    }}
                    getOptionLabel={(option) => `+${option.code}`}
                    getOptionValue={(option) => option.code}
                    renderOption={(option) => (
                      <>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          +{option.code}
                        </span>
                      </>
                    )}
                    searchable={false}
                    buttonClassName="h-11 px-2 border-gray-200 shadow-inner dark:bg-black"
                    dropdownClassName="w-48"
                  />
                </div>
                {/* Phone Number Input */}
                <input
                  type="tel"
                  className={[fieldClasses, "flex-1"].join(" ")}
                  placeholder="9876543210"
                  value={formData.phoneNumber}
                  onChange={updateField("phoneNumber")}
                />
              </div>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              First name
              <input
                type="text"
                className={fieldClasses}
                placeholder="John"
                value={formData.firstName}
                onChange={updateField("firstName")}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Last name
              <input
                type="text"
                className={fieldClasses}
                placeholder="Doe"
                value={formData.lastName}
                onChange={updateField("lastName")}
                required
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Password
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={[fieldClasses, "pr-20"].join(" ")}
                  value={formData.password}
                  onChange={updateField("password")}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-white/10"
                >
                  {showPassword ? (
                    <VisibilityOffOutlinedIcon />
                  ) : (
                    <VisibilityOutlinedIcon />
                  )}
                </button>
              </div>
            </label>

            <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Confirm password
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={[fieldClasses, "pr-20"].join(" ")}
                  value={formData.confirmPassword}
                  onChange={updateField("confirmPassword")}
                  placeholder="Confirm password"
                  required
                />
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-transparent"
            >
              {loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <AddRoundedIcon fontSize="small" />
              )}
              Add user
            </button>
          </div>
        </form>
      </div>
    </CustomModal>
  );
};

const WMSUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchEmail, setSearchEmail] = useState("");
  // const [debouncedEmail, setDebouncedEmail] = useState(""); // Removed debouncing
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const navigate = useNavigate();

  const normalizeUserRecord = (entry) => {
    if (!entry) return null;

    const baseUser = entry.user ? entry.user : entry;
    const cData = entry.c_data;
    const warehouseCount = Array.isArray(cData)
      ? cData.length
      : Number(entry?.warehouse_count) || 0;
    const companyCount = Array.isArray(cData)
      ? new Set(
          cData
            .map((item) => item?.company_id)
            .filter(
              (companyId) => companyId !== undefined && companyId !== null,
            ),
        ).size
      : Number(entry?.distinct_company_count) || 0;

    return {
      ...baseUser,
      distinct_company_count: companyCount,
      warehouse_count: warehouseCount,
    };
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(
        "__deku/api/v1/__wms/fetch/user-data",
      );
      const data = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      const normalized = data
        .map((entry) => normalizeUserRecord(entry))
        .filter(Boolean);
      setUsers(normalized);
    } catch (err) {
      setError(err?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Removed debouncing useEffects

  const handleSearch = async () => {
    const trimmed = searchEmail.trim();
    if (!trimmed) {
      setFilteredUsers([]);
      setSearchError("");
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setSearchError("");
    setHasSearched(true);

    try {
      const response = await apiClient.get(
        "__deku/api/v1/__wms/search/user-data",
        { params: { search_email: trimmed } },
      );
      const userData = response?.data?.data;

      if (userData && userData._id) {
        // New response format: direct user object
        const normalizedUser = {
          _id: userData._id,
          email: userData.email,
          firstName: userData.full_name?.split(" ")[0] || "",
          lastName: userData.full_name?.split(" ").slice(1).join(" ") || "",
          distinct_company_count: userData.organization_count || "0",
          warehouse_count: userData.warehouse_count || "0",
        };
        setFilteredUsers([normalizedUser]);
      } else {
        setFilteredUsers([]);
        setSearchError("No users found for that email.");
      }
    } catch (err) {
      setSearchError(err?.message || "Search failed");
      setFilteredUsers([]);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const visibleUsers = hasSearched ? filteredUsers : users;

  const handleRowClick = (user) => {
    if (!user?._id) return;
    const params = new URLSearchParams({ userId: user._id, email: user.email });
    navigate(`/wms-user-details?${params.toString()}`);
  };

  // Skeleton rows only (controls are real UI)
  const skeletonStyles = { sx: { bgcolor: "rgba(148,163,184,0.2)" } };
  const TableSkeleton = () => (
    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
      {[...Array(12)].map((_, idx) => (
        <tr key={idx} className="bg-white dark:bg-[#111417]">
          <td className="w-[25%] px-4 py-3">
            <Skeleton
              variant="text"
              width="70%"
              height={16}
              {...skeletonStyles}
            />
            <Skeleton
              variant="text"
              width="50%"
              height={14}
              {...skeletonStyles}
            />
          </td>
          <td className="w-[35%] px-4 py-3">
            <Skeleton
              variant="text"
              width="90%"
              height={14}
              {...skeletonStyles}
            />
          </td>
          <td className="w-[20%] px-4 py-3">
            <Skeleton
              variant="text"
              width="60%"
              height={14}
              {...skeletonStyles}
            />
          </td>
          <td className="w-[20%] px-4 py-3">
            <Skeleton
              variant="rounded"
              width={84}
              height={28}
              {...skeletonStyles}
            />
          </td>
        </tr>
      ))}
    </tbody>
  );

  // When search is done (not loading/searching) and user typed something, auto-fit height to content
  const autoHeight = !loading && !searching && hasSearched;

  return (
    <PageLayout
      title="WMS User Management"
      titleClassName="font-extrabold text-xl sm:text-2xl lg:text-3xl"
      contentClassName="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-6"
    >
      <AddUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchUsers}
      />

      {/* Controls — always visible; no skeleton here */}
      <div className="flex flex-col gap-2 px-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="w-full sm:w-80">
            <SearchBar
              placeholder="Search by email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Search WMS users by email"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="h-11 w-28 cursor-pointer rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {searching ? "Searching" : "Search"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-white focus:outline-none dark:focus:ring-offset-transparent"
        >
          <AddRoundedIcon fontSize="small" />
          Add User
        </button>
      </div>

      {/* Table */}
      <div
        className={[
          "dark:bg-primary-dark relative mx-2 flex max-h-[76vh] flex-1 flex-col overflow-hidden rounded-lg border border-black/5 bg-white shadow-inner dark:border-white/10",
          // autoHeight ? "" : "",
        ].join(" ")}
      >
        <div
          className={[
            "flex-1 overflow-x-hidden rounded-b-2xl",
            autoHeight
              ? "max-h-[76vh] overflow-y-visible"
              : "min-h-none overflow-y-auto",
          ].join(" ")}
        >
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-100 text-xs font-semibold tracking-wide text-gray-600 uppercase shadow-sm dark:bg-black dark:text-gray-300">
              <tr>
                <th className="w-[25%] px-4 py-4">Name</th>
                <th className="w-[35%] px-4 py-4">Email</th>
                <th className="w-[20%] px-4 py-4">Accessed Organizations</th>
                <th className="w-[20%] px-4 py-4">Accessed Warehouses</th>
              </tr>
            </thead>

            {loading || searching ? (
              <TableSkeleton />
            ) : visibleUsers.length === 0 ? (
              <tbody>
                <tr>
                  <td
                    className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                    colSpan={4}
                  >
                    {error || searchError || "No users to display."}
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleUsers.map((user) => (
                  <tr
                    key={user._id}
                    className="cursor-pointer bg-white transition-colors hover:bg-indigo-50/70 dark:bg-transparent dark:hover:bg-white/5"
                    onClick={() => handleRowClick(user)}
                  >
                    <td className="w-[25%] px-4 py-4 text-gray-900 dark:text-gray-100">
                      <div className="font-semibold capitalize">
                        {`${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                          "-"}
                      </div>
                    </td>
                    <td className="w-[35%] px-4 py-4 text-gray-700 dark:text-gray-200">
                      {user.email}
                    </td>
                    <td className="w-[20%] px-4 py-4 text-gray-700 dark:text-gray-200">
                      {user.distinct_company_count ?? "-"}
                    </td>
                    <td className="w-[20%] px-4 py-4 text-gray-700 dark:text-gray-200">
                      {user.warehouse_count ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>
    </PageLayout>
  );
};

export default WMSUsers;
