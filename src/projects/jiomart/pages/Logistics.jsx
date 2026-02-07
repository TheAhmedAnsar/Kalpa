import React, { useEffect, useMemo, useState } from "react";
import { Divider, Drawer, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import apiClient from "../../../api/client";
import VaultWorkspace from "../components/vault/VaultWorkspace";
import DeliveryPartnersPanel from "../components/vault/DeliveryPartnersPanel";
import { enqueueSnackbar } from "notistack";
import PageLayout from "../../../components/PageLayout";

const DEFAULT_DPS = [
  {
    _id: "663a625b16bf636c5f3a8ce4",
    name: "dp_account|42",
    display_name: "Ecom_H&B",
    parent_id: "dp:1",
    is_3p_dp: true,
    is_fragile: true,
    is_hazmat: true,
    is_liquid: undefined,
    is_hvi: true,
    is_1p: undefined,
    priority: 6,
    logistics: {
      transport_mode: "air",
      operations: ["inter_city"],
      min_wt: 0,
      max_wt: 5000,
    },
  },
  {
    _id: "x1",
    name: "dp_account|19",
    display_name: "delivery_jio",
    parent_id: "dp:11",
    is_3p_dp: true,
    is_fragile: true,
    is_hazmat: false,
    is_liquid: false,
    is_hvi: false,
    is_1p: true,
    priority: 3,
    logistics: {
      transport_mode: "surface",
      operations: ["inter_city", "intra_city"],
      min_wt: 250,
      max_wt: 12000,
    },
  },
  {
    _id: "x2",
    name: "dp_account|21",
    display_name: "delhivery_1p",
    parent_id: "dp:9",
    is_3p_dp: false,
    is_fragile: true,
    is_hazmat: false,
    is_liquid: false,
    is_hvi: undefined,
    is_1p: undefined,
    priority: 1,
    logistics: {
      transport_mode: "rail",
      operations: ["line_haul"],
      min_wt: 0,
      max_wt: 8000,
    },
  },
];

const Logistics = () => {
  const [query, setQuery] = useState("");
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return undefined;

    let isMounted = true;

    const fetchDeliveryPartners = async () => {
      setLoading(true);
      setError(null);
      setUsingFallback(false);
      try {
        const res = await apiClient.get("/__deku/api/v1/__jiomart/dp-data");
        if (res?.data?.success === false) {
          const apiMessage =
            res?.data?.error ||
            res?.data?.message ||
            "Failed to load delivery partners.";
          throw new Error(apiMessage);
        }
        let payload = res?.data;

        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
          if (payload.data !== undefined) payload = payload.data;
          else if (payload.results !== undefined) payload = payload.results;
          else if (payload.items !== undefined) payload = payload.items;
        }

        const finalData = Array.isArray(payload)
          ? payload
          : payload && typeof payload === "object"
            ? [payload]
            : [];

        if (isMounted) {
          setPartners(finalData);
          setUsingFallback(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load delivery partners:", err);
          const message =
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load delivery partners.";
          enqueueSnackbar(message, {
            variant: "error",
          });
          setError(message);
          setPartners(DEFAULT_DPS);
          setUsingFallback(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDeliveryPartners();

    return () => {
      isMounted = false;
    };
  }, [drawerOpen]);

  const data = partners;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((d) => {
      const name = (d.display_name || "").toLowerCase();
      const account = (d.name || "").toLowerCase();
      const parent = (d.parent_id || "").toLowerCase();
      return name.includes(q) || account.includes(q) || parent.includes(q);
    });
  }, [data, query]);

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <PageLayout
      title="Logistics"
      contentClassName="flex flex-1 flex-col overflow-hidden"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-hidden">
          <VaultWorkspace
            onOpenDeliveryPartners={openDrawer}
            enabledTabs={["verifyPromise", "fyndDump"]}
          />
        </div>
      </div>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        ModalProps={{ keepMounted: true }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 360, md: 420 },
              borderRight: (theme) => `1px solid ${theme.palette.divider}`,
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "#0f1115" : "#ffffff",
            },
          },
        }}
      >
        <section className="dark:bg-primary-dark flex h-full w-full flex-col">
          <div className="flex min-h-[40px] items-center justify-between px-6 pb-1">
            <div className="min-w-0">
              <h2 className="font-fynd pt-5 text-2xl text-gray-800 sm:text-[26px] lg:text-2xl dark:text-white">
                Delivery Partners
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {filtered.length} of {data.length} partners shown
              </p>
            </div>
            <div className="flex items-center gap-2">
              {usingFallback && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-medium tracking-wide text-amber-700 uppercase dark:bg-amber-500/10 dark:text-amber-300">
                  Offline data
                </span>
              )}
              <IconButton
                edge="end"
                onClick={closeDrawer}
                size="small"
                aria-label="Close delivery partners drawer"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>
          </div>

          <Divider className="!mx-4 !mb-4 !bg-gray-300 dark:!bg-gray-700" />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6">
            <DeliveryPartnersPanel
              query={query}
              onQueryChange={setQuery}
              loading={loading}
              error={error}
              usingFallback={usingFallback}
              partners={filtered}
            />
          </div>
        </section>
      </Drawer>
    </PageLayout>
  );
};

export default Logistics;
