import React, { useState, useEffect } from "react";
import CustomModal from "../../../components/CustomModal";
import IOSToggle from "../../../components/IOSToggle";
import apiClient from "../../../api/client";
import { enqueueSnackbar } from "notistack";

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

const ManageAccessModal = ({ open, onClose, company, userId }) => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [companyActive, setCompanyActive] = useState(company?.active || false);

  useEffect(() => {
    if (open && userId && company?.id) {
      fetchWarehouses();
      setCompanyActive(company?.active || false);
    }
  }, [open, userId, company]);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        "__deku/api/v1/__wms/fetch/warehouse-details",
        {
          params: {
            userId: parseInt(userId),
            orgId: company.id,
          },
        },
      );
      const data = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      setWarehouses(data);
    } catch (error) {
      enqueueSnackbar(error?.message || "Failed to fetch warehouse details", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyToggle = async (newValue) => {
    // TODO: Implement API call to toggle company access
    setCompanyActive(newValue);
    enqueueSnackbar(`Company access ${newValue ? "enabled" : "disabled"}`, {
      variant: "info",
    });
  };

  const handleWarehouseToggle = async (warehouseId, currentValue) => {
    setToggling(true);
    const payload = {
      userId: parseInt(userId),
      accountId: warehouseId,
      orgId: company.id,
      status: !currentValue ? "active" : "inactive",
    };

    try {
      const response = await apiClient.post(
        "/__deku/api/v1/__wms/update-user-account-mapping",
        payload,
      );

      if (response.data.success) {
        setWarehouses((prev) =>
          prev.map((w) =>
            w.warehouse_id === warehouseId
              ? { ...w, has_access: !currentValue }
              : w,
          ),
        );
        enqueueSnackbar(
          `Warehouse access ${!currentValue ? "granted" : "revoked"}`,
          { variant: "success" },
        );
      } else {
        enqueueSnackbar(
          response.data.message || "Failed to update warehouse access",
          { variant: "error" },
        );
      }
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update warehouse access",
        { variant: "error" },
      );
    } finally {
      setToggling(false);
    }
  };

  if (!company) return null;

  return (
    <CustomModal open={open} onClose={onClose} size="sm">
      <div className="flex h-[600px] flex-col">
        {/* Fixed Header with company details */}
        <div className="flex-shrink-0 border-b border-gray-200 px-3 py-3 dark:border-gray-700">
          <div className="flex items-center justify-center">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 uppercase dark:text-white">
                {company.name}
              </h2>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  <span className="font-medium">Org ID:</span> {company.id}
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span>
                  <span className="font-medium">Role:</span> {company.role}
                </span>
              </div>
            </div>
          </div>
        </div>
        <h3 className="my-3 px-5 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
          Warehouse ({warehouses.length})
        </h3>

        {/* Scrollable Warehouse list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
                >
                  <div className="flex flex-1 items-center gap-2 pr-3">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="mb-2 h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          ) : warehouses.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
              No warehouses found for this company
            </div>
          ) : (
            <div className="space-y-2">
              {warehouses.map((warehouse) => (
                <div
                  key={warehouse.warehouse_id}
                  className="dark:bg-secondary-dark flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                >
                  <div className="flex flex-1 items-center gap-2 pr-3">
                    <StatusDot active={warehouse.has_access} />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {warehouse.warehouse_name}
                      </h4>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        ID: {warehouse.warehouse_id}
                      </p>
                    </div>
                  </div>
                  <IOSToggle
                    checked={warehouse.has_access}
                    disabled={toggling}
                    onChange={() =>
                      handleWarehouseToggle(
                        warehouse.warehouse_id,
                        warehouse.has_access,
                      )
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomModal>
  );
};

export default ManageAccessModal;
