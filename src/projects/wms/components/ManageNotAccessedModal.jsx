import React, { useState, useMemo, useEffect } from "react";
import CustomModal from "../../../components/CustomModal";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { wmsRoles } from "../constants/wmsRoles";
import PrivacyTipOutlinedIcon from "@mui/icons-material/PrivacyTipOutlined";
import apiClient from "../../../api/client";
import { enqueueSnackbar } from "notistack";

const Skeleton = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${className}`}
  />
);

const ManageNotAccessedModal = ({ open, onClose, userId, onAccessGranted }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRoles, setSelectedRoles] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [roleSearches, setRoleSearches] = useState({});
  const [confirmationModal, setConfirmationModal] = useState(null);
  const [isGranting, setIsGranting] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchNotAccessedCompanies();
    }
  }, [open, userId]);

  const fetchNotAccessedCompanies = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        "__deku/api/v1/__wms/fetch/not-accessed-companies",
        { params: { userId: parseInt(userId) } },
      );
      const data = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      setCompanies(data);
    } catch (error) {
      enqueueSnackbar(error?.message || "Failed to fetch companies", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return companies;
    return companies.filter(
      (c) =>
        (c?.organization_name || "").toLowerCase().includes(term) ||
        (c?.organization_id || "").toString().toLowerCase().includes(term),
    );
  }, [companies, search]);

  const getFilteredRoles = (companyId) => {
    const term = (roleSearches[companyId] || "").trim().toLowerCase();
    if (!term) return wmsRoles;
    return wmsRoles.filter(
      (role) =>
        role.name.toLowerCase().includes(term) ||
        role.id.toString().includes(term) ||
        (role.description || "").toLowerCase().includes(term),
    );
  };

  const toggleDropdown = (companyId) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [companyId]: !prev[companyId],
    }));
  };

  const selectRole = (companyId, roleId) => {
    setSelectedRoles((prev) => ({
      ...prev,
      [companyId]: roleId,
    }));
    setOpenDropdowns((prev) => ({
      ...prev,
      [companyId]: false,
    }));
    setRoleSearches((prev) => ({
      ...prev,
      [companyId]: "",
    }));
  };

  const handleGiveAccess = (company) => {
    const roleId = selectedRoles[company.organization_id];
    const role = wmsRoles.find((r) => r.id === roleId);
    setConfirmationModal({
      companyId: company.organization_id,
      companyName: company.organization_name,
      roleId,
      roleName: role ? role.name : "Unknown",
    });
  };

  const handleConfirmGrant = async () => {
    if (!confirmationModal || !userId) return;

    setIsGranting(true);
    try {
      await apiClient.post("__deku/api/v1/__wms/grant-company-access", {
        userId: userId,
        orgId: confirmationModal.companyId,
        roleId: confirmationModal.roleId.toString(),
      });

      enqueueSnackbar(
        `Successfully granted access to ${confirmationModal.companyName}`,
        { variant: "success" },
      );

      setConfirmationModal(null);

      if (onAccessGranted) {
        await onAccessGranted();
      }

      await fetchNotAccessedCompanies();
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to grant access",
        { variant: "error" },
      );
    } finally {
      setIsGranting(false);
    }
  };

  const getSelectedRoleName = (companyId) => {
    const roleId = selectedRoles[companyId];
    const role = wmsRoles.find((r) => r.id === roleId);
    return role ? role.name : "Select Role";
  };

  return (
    <>
      <CustomModal open={open} onClose={onClose} size="lg">
        <div className="flex h-[600px] flex-col p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Manage Company Access
            </h2>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Select companies to grant access to this user
            </p>
          </div>

          <div className="relative mb-4">
            <div className="flex w-1/3 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-200 dark:border-gray-700 dark:bg-black">
              <SearchIcon
                className="text-gray-400 dark:text-gray-500"
                fontSize="small"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company name or ID..."
                className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
            {loading ? (
              <div>
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-gray-100 text-xs font-semibold text-gray-600 uppercase dark:bg-gray-900 dark:text-gray-300">
                    <tr>
                      <th className="w-[35%] px-4 py-3 text-left">
                        Company Name
                      </th>
                      <th className="w-[20%] px-4 py-3 text-left">Org ID</th>
                      <th className="w-[30%] px-4 py-3 text-left">Role</th>
                      <th className="w-[15%] px-4 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="bg-white dark:bg-black">
                        <td className="w-[35%] px-4 py-2">
                          <Skeleton className="h-4 w-full max-w-xs" />
                        </td>
                        <td className="w-[20%] px-4 py-2">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="w-[30%] px-4 py-2">
                          <Skeleton className="h-8 w-full max-w-[200px]" />
                        </td>
                        <td className="w-[15%] px-4 py-2">
                          <Skeleton className="h-8 w-full max-w-[100px]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {companies.length === 0
                  ? "No companies available to assign"
                  : "No companies match your search"}
              </div>
            ) : (
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-100 text-xs font-semibold text-gray-600 uppercase dark:bg-gray-900 dark:text-gray-300">
                  <tr>
                    <th className="w-[35%] px-4 py-3 text-left">
                      Company Name
                    </th>
                    <th className="w-[20%] px-4 py-3 text-left">Org ID</th>
                    <th className="w-[30%] px-4 py-3 text-left">Role</th>
                    <th className="w-[15%] px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredCompanies.map((company) => {
                    const companyId = company.organization_id;
                    const isDropdownOpen = openDropdowns[companyId];
                    const filteredRoles = getFilteredRoles(companyId);
                    const hasSelectedRole = !!selectedRoles[companyId];

                    return (
                      <tr key={companyId} className="bg-white dark:bg-black">
                        <td className="w-[35%] px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {company.organization_name || "-"}
                        </td>
                        <td className="w-[20%] px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                          {company.organization_id ?? "-"}
                        </td>
                        <td className="relative w-[30%] px-4 py-2">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => toggleDropdown(companyId)}
                              className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-black dark:text-gray-100 dark:hover:bg-gray-900"
                            >
                              <span className="truncate">
                                {getSelectedRoleName(companyId)}
                              </span>
                              <KeyboardArrowDownIcon fontSize="small" />
                            </button>

                            {isDropdownOpen && (
                              <div className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-black">
                                <div className="border-b border-gray-200 p-2 dark:border-gray-700">
                                  <input
                                    type="text"
                                    value={roleSearches[companyId] || ""}
                                    onChange={(e) =>
                                      setRoleSearches((prev) => ({
                                        ...prev,
                                        [companyId]: e.target.value,
                                      }))
                                    }
                                    placeholder="Search roles..."
                                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {filteredRoles.length === 0 ? (
                                    <div className="p-2 text-center text-sm text-gray-500 dark:text-gray-400">
                                      No roles found
                                    </div>
                                  ) : (
                                    filteredRoles.map((role) => (
                                      <button
                                        key={role.id}
                                        type="button"
                                        onClick={() =>
                                          selectRole(companyId, role.id)
                                        }
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
                                      >
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                          {role.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          ID: {role.id} • {role.description}
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="w-[15%] px-4 py-2">
                          <button
                            type="button"
                            onClick={() => handleGiveAccess(company)}
                            disabled={!hasSelectedRole}
                            className="h-8 cursor-pointer rounded-md bg-gray-700 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
                          >
                            Give Access
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </CustomModal>

      {confirmationModal && (
        <CustomModal
          open={true}
          onClose={() => setConfirmationModal(null)}
          size="sm"
        >
          <div className="p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <PrivacyTipOutlinedIcon fontSize="large" />

              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                  Confirm Access Grant
                </h3>
              </div>
            </div>

            {/* Access details */}
            <div className="mt-5 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/40">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Company
                </span>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {confirmationModal.companyName}
                </p>
              </div>

              <div className="h-px w-full bg-gray-200 dark:bg-gray-700" />

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Role
                </span>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {confirmationModal.roleName}
                </p>
              </div>

              {/* Optional: description / scope if you have it */}
              {confirmationModal.roleDescription && (
                <>
                  <div className="h-px w-full bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-1">
                    <span className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                      Access Scope
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {confirmationModal.roleDescription}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Helper text */}
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              This action will grant access to the selected company and role.
              Post this share the warehouse access to the user.
            </p>

            {/* Actions */}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => setConfirmationModal(null)}
                disabled={isGranting}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGrant}
                disabled={isGranting}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                {isGranting ? "Granting Access..." : "Grant Access"}
              </button>
            </div>
          </div>
        </CustomModal>
      )}
    </>
  );
};

export default ManageNotAccessedModal;
