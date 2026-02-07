import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tooltip } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CustomModal from "../components/CustomModal";
import { enqueueSnackbar } from "notistack";
import apiClient from "../api/client";
import constants from "../constants";
import PageLayout from "../components/PageLayout";
import SearchBar from "../components/SearchBar";
import { useSelector } from "react-redux";
import { selectActiveProject, selectUserEmail } from "../store/user";

import PROJECT_FEATURES from "../constants/projectFeatures";
import CustomDropdown from "../components/CustomDropdown";
import { OWNERS } from "../constants/owners";

// ---- Constants ----
const ALL_PROJECTS = Object.keys(constants.project_ids);
const ACCESS_OPTIONS = [
  { value: "user", label: "Viewer" },
  { value: "super_user", label: "Operations" },
  { value: "admin", label: "Admin" },
];

// ==============================================
// Single-flight fetch to avoid duplicate calls
// (React 18 StrictMode mounts effects twice in dev)
// ==============================================
let _usersFetchPromise = null;
async function fetchUsersOnce() {
  if (!_usersFetchPromise) {
    _usersFetchPromise = apiClient
      .get("/__deku/api/v1/users")
      .then((res) => res.data?.data || res.data || [])
      .catch((err) => {
        _usersFetchPromise = null;
        throw err;
      });
  }
  return _usersFetchPromise;
}

const normalizeProjects = (projects) => {
  if (!projects || typeof projects !== "object") return {};
  return Object.fromEntries(
    Object.entries(projects).map(([projectKey, access]) => [
      projectKey,
      typeof access === "string" ? access : String(access || ""),
    ]),
  );
};

const normalizeUser = (user) => {
  if (!user) return null;
  const email = user.email ?? user.user_email ?? "";
  const fallbackId =
    user.id || email || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id: fallbackId,
    username: user.username ?? "",
    email,
    whitelisted:
      typeof user.whitelisted === "boolean"
        ? user.whitelisted
        : Boolean(user.is_whitelisted),
    projects: normalizeProjects(user.projects),
    // normalize sidebar_config values to numeric 1/0 per project/feature
    // prioritize sidebar_config; fallback to access_level if sidebar_config is empty
    sidebar_config: (() => {
      const sidebarRaw = user.sidebar_config;
      const accessLevelRaw = user.access_level;
      const raw = sidebarRaw || accessLevelRaw || {};
      if (!raw || typeof raw !== "object") return {};
      const byProject = {};
      Object.entries(raw).forEach(([proj, cfg]) => {
        if (!cfg || typeof cfg !== "object") return;
        byProject[proj] = Object.fromEntries(
          Object.entries(cfg).map(([k, v]) => [
            k,
            v === 1 || v === "1" || v === true ? 1 : 0,
          ]),
        );
      });
      return byProject;
    })(),
    createdAt: user.created_at ?? user.createdAt ?? null,
  };
};

const isEmailLike = (value) => {
  if (!value) return false;
  // Simple heuristic, not a full RFC validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim());
};

const formatAccessLabel = (value) => {
  const normalized =
    typeof value === "string" ? value : String(value ?? "").toLowerCase();
  if (!normalized) return "";
  const match = ACCESS_OPTIONS.find((opt) => opt.value === normalized);
  if (match) return match.label;
  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

// ---- Status Pill (derived from whitelisted) ----
const StatusPill = ({ whitelisted }) => {
  const isActive = !!whitelisted;
  const classes = isActive
    ? "bg-green-100 text-green-700 ring-1 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800"
    : "bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800";
  const Icon = isActive ? CheckCircleIcon : CancelIcon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${classes}`}
    >
      <Icon fontSize="inherit" />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

// ---- Update API helper (replace with your endpoint) ----
async function updateUserApi(payload) {
  try {
    const res = await apiClient.post("/__deku/api/v1/users/update", payload);
    const data = res.data;
    if (data?.success === false) {
      throw new Error(
        data?.error || data?.message || "Update failed. Please try again.",
      );
    }
    return { ok: true, data };
  } catch (err) {
    console.error("Failed to update user:", err);
    return { ok: false, error: err };
  }
}

async function updateAccessApi(payload) {
  try {
    const res = await apiClient.post(
      "/__deku/api/v1/users/access-update",
      payload,
    );
    const data = res.data;
    if (data?.success === false) {
      throw new Error(
        data?.error ||
          data?.message ||
          "Access update failed. Please try again.",
      );
    }
    return { ok: true, data };
  } catch (err) {
    console.error("Failed to update user access:", err);
    return { ok: false, error: err };
  }
}

// ---- Simple Skeleton block ----
const Skel = ({ className = "" }) => (
  <div className={`skeleton-surface animate-pulse ${className}`} />
);

const UserModalSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-start justify-between">
      <div className="min-w-0 space-y-2">
        <Skel className="h-4 w-40 rounded-sm" />
        <Skel className="h-3 w-48 rounded-sm" />
        <Skel className="h-3 w-56 rounded-sm" />
      </div>
      <Skel className="h-6 w-20 rounded-md" />
    </div>

    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skel className="h-4 w-24 rounded-sm" />
        <Skel className="h-4 w-16 rounded-sm" />
      </div>

      <div className="space-y-3">
        <Skel className="h-4 w-28 rounded-sm" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`modal-skel-row-${idx}`}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <Skel className="h-4 w-20 rounded-sm" />
                <Skel className="h-4 w-16 rounded-sm" />
              </div>
              <Skel className="h-8 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="flex justify-end gap-3 pt-2">
      <Skel className="h-9 w-20 rounded-md" />
      <Skel className="h-9 w-28 rounded-md" />
    </div>
  </div>
);

const SidebarConfigurator = ({ projectKey, config = {}, onChange }) => {
  const features = PROJECT_FEATURES[projectKey] || [];

  // When toggling, store numeric 1/0 as backend expects
  const toggle = (featureKey, checked) => {
    const value = checked ? 1 : 0;
    onChange({ ...config, [featureKey]: value });
  };

  if (!features.length) {
    return (
      <div className="text-sm text-gray-400 italic">
        No configurable features for this project.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {features.map((feature, idx) => {
        const featureKey = feature.featureKey;
        if (!featureKey) return null;

        // Use the first menu item's icon/name as the representative for the feature
        // If menuItems is empty, use the first section's title and icon
        const representativeItem =
          feature.menuItems?.[0] ||
          (feature.sections?.[0]
            ? {
                name: feature.sections[0].title || feature.sections[0].name,
                icon: feature.sections[0].icon,
              }
            : { name: featureKey, icon: null });

        // Interpret config values: 1 or '1' or true are checked; missing or 0 is unchecked
        const rawVal = config[featureKey];
        const isChecked = rawVal === 1 || rawVal === "1" || rawVal === true;

        return (
          <label
            key={featureKey || idx}
            className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 ${
              isChecked
                ? "bg-gray-100 dark:bg-gray-800"
                : "hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => toggle(featureKey, e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
            />
            <div className="flex items-center gap-3">
              <span className="text-xl text-gray-500 dark:text-gray-400">
                {representativeItem.icon}
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {representativeItem.name}
              </span>
            </div>
          </label>
        );
      })}
    </div>
  );
};

export const Users = () => {
  const activeProject = useSelector(selectActiveProject);
  // activeProjectAccessLevel not used here; omit selector to avoid lint noise
  const currentUserEmail = useSelector(selectUserEmail);
  const isCurrentUserOwner =
    currentUserEmail && OWNERS.includes(currentUserEmail);

  const [allUsers, setAllUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedProject, setSelectedProject] = useState(ALL_PROJECTS[0]);

  // Modal state
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const modalRequestId = useRef(0);

  const normalizedDraftProjects = useMemo(
    () => normalizeProjects(draft?.projects),
    [draft],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const raw = await fetchUsersOnce(); // <-- single-flight promise
        if (cancelled) return;
        const mapped = raw.map((u) => normalizeUser(u)).filter(Boolean);
        setAllUsers(mapped);
        setUsers(mapped);
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch users:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = searchValue.trim();
    const lowercaseQuery = q.toLowerCase();
    const applyLocal = (list) => {
      // Filter by active project if user is not owner
      let filteredList = list;
      if (!isCurrentUserOwner && activeProject) {
        filteredList = list.filter((u) => {
          return Object.prototype.hasOwnProperty.call(
            u.projects || {},
            activeProject,
          );
        });
      }

      return filteredList.filter((u) => {
        const derivedStatus = u.whitelisted ? "active" : "inactive";
        const matchesStatus =
          statusFilter === "all" || derivedStatus === statusFilter;
        if (!matchesStatus) return false;

        if (!lowercaseQuery) return true;

        const matchesUsername = u.username
          .toLowerCase()
          .includes(lowercaseQuery);
        const matchesEmail = u.email.toLowerCase().includes(lowercaseQuery);
        const matchesProjects = Object.entries(u.projects || {}).some(
          ([projectKey, access]) => {
            const key = projectKey.toLowerCase();
            const accessValue = String(access || "").toLowerCase();
            return (
              key.includes(lowercaseQuery) ||
              accessValue.includes(lowercaseQuery)
            );
          },
        );

        return matchesUsername || matchesEmail || matchesProjects;
      });
    };

    if (!q) {
      setSearchError("");
      setSearching(false);
      setUsers(applyLocal(allUsers));
      return;
    }

    if (!isEmailLike(q)) {
      setSearchError("");
      setSearching(false);
      setUsers(applyLocal(allUsers));
      return;
    }

    let cancelled = false;
    setSearching(true);
    setSearchError("");

    const handleSearch = async () => {
      try {
        const res = await apiClient.post("/__deku/api/v1/users/email", {
          user_email: q,
        });
        if (cancelled) return;
        if (res?.data?.success === false) {
          const apiMessage =
            res?.data?.error || res?.data?.message || "Search failed.";
          setUsers([]);
          setSearchError(apiMessage);
          enqueueSnackbar(apiMessage, { variant: "error" });
          return;
        }
        const data = res.data?.data || res.data;
        if (!data) {
          setUsers([]);
          setSearchError("No user found for the provided email.");
          return;
        }
        const mapped = normalizeUser(data);
        if (!mapped) {
          setUsers([]);
          setSearchError("No user found for the provided email.");
          return;
        }
        const derivedStatus = mapped.whitelisted ? "active" : "inactive";
        const matchesStatus =
          statusFilter === "all" || derivedStatus === statusFilter;
        setUsers(matchesStatus ? [mapped] : []);
        if (!matchesStatus) {
          setSearchError(`No ${statusFilter} users match the email “${q}”.`);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Email search failed:", err);
          setUsers([]);
          const apiMessage =
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to search by email. Please try again.";
          setSearchError(apiMessage);
          enqueueSnackbar(apiMessage, { variant: "error" });
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    };

    const timeout = setTimeout(handleSearch, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchValue, statusFilter, allUsers, isCurrentUserOwner, activeProject]);

  const emptyMsg = useMemo(() => {
    if (searchError) return searchError;
    const q = searchValue.trim();
    const hasQ = q.length > 0;
    const hasFilter = statusFilter !== "all";

    if (hasQ && hasFilter) return `No ${statusFilter} users match “${q}”.`;
    if (hasQ) return `No users match “${q}”.`;
    if (hasFilter) return `No ${statusFilter} users.`;
    return "No users.";
  }, [searchValue, statusFilter, searchError]);

  const openModal = async (user) => {
    if (loading) return;

    // Check if target user is Owner and current user is not Owner
    const targetUserEmail = user?.email || user?.user_email;
    const isTargetUserOwner =
      targetUserEmail && OWNERS.includes(targetUserEmail);

    if (isTargetUserOwner && !isCurrentUserOwner) {
      enqueueSnackbar("Admin cannot change the access of Owners", {
        variant: "error",
      });
      return;
    }

    const requestId = modalRequestId.current + 1;
    modalRequestId.current = requestId;
    const fallback = normalizeUser(user);
    setDraft(null);
    setErrorMsg("");
    setOpen(true);
    setModalLoading(true);
    try {
      const res = await apiClient.post("/__deku/api/v1/users/email", {
        user_email: fallback?.email,
      });
      if (res?.data?.success === false) {
        const apiMessage =
          res?.data?.error || res?.data?.message || "Failed to fetch user.";
        enqueueSnackbar(apiMessage, { variant: "error" });
        throw new Error(apiMessage);
      }
      const data = res.data?.data || res.data;
      const detailed = normalizeUser(data) ?? fallback;
      if (modalRequestId.current === requestId) {
        setDraft(detailed);
      }
    } catch (err) {
      console.error("Failed to fetch user details:", err);
      if (modalRequestId.current === requestId) {
        const apiMessage =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message;
        if (apiMessage) {
          enqueueSnackbar(apiMessage, { variant: "error" });
          setErrorMsg(apiMessage);
        }
        setDraft(fallback);
      }
    } finally {
      if (modalRequestId.current === requestId) {
        setModalLoading(false);
      }
    }
  };

  const closeModal = () => {
    modalRequestId.current += 1;
    setOpen(false);
    setSaving(false);
    setErrorMsg("");
    setModalLoading(false);
    setDraft(null);
  };

  const toggleProject = (key) => {
    setDraft((d) => {
      if (!d) return d;
      const currentProjects = normalizeProjects(d.projects);
      const exists = Object.prototype.hasOwnProperty.call(currentProjects, key);
      if (exists) {
        const { [key]: _, ...rest } = currentProjects;
        return { ...d, projects: rest };
      }
      return {
        ...d,
        projects: {
          ...currentProjects,
          [key]: ACCESS_OPTIONS[0]?.value ?? "user",
        },
      };
    });
  };

  const onSave = async () => {
    if (!draft || modalLoading) return;
    setSaving(true);
    setErrorMsg("");

    const payload = {
      user_email: draft.email,
      projects: normalizeProjects(draft.projects),
      is_whitelisted: draft.whitelisted ? 1 : 0,
      sidebar_config: draft.sidebar_config,
    };

    const optimistic = normalizeUser({
      ...draft,
      projects: payload.projects,
      is_whitelisted: payload.is_whitelisted,
    });

    const updateList = (list) =>
      list.map((u) => (u.email === optimistic.email ? optimistic : u));

    const prevAll = allUsers;
    const prevUsers = users;

    setAllUsers((prev) => updateList(prev));
    setUsers((prev) => updateList(prev));

    // Call existing update API for projects and whitelist
    const res = await updateUserApi(payload);

    if (!res.ok) {
      setErrorMsg(
        res.error?.message ||
          res.error?.response?.data?.error ||
          res.error?.response?.data?.message ||
          "Failed to save changes. Please try again.",
      );
      setAllUsers(prevAll);
      setUsers(prevUsers);
      setSaving(false);
      enqueueSnackbar(
        res.error?.response?.data?.error ||
          res.error?.response?.data?.message ||
          res.error?.message ||
          "Failed to update user access levels.",
        {
          variant: "error",
        },
      );
      return;
    }

    // Call new access-update API for sidebar config
    // Build access_level from what is currently shown in the modal (draft.sidebar_config)
    // For every project feature defined in PROJECT_FEATURES, if the draft has an explicit
    // value use it; otherwise infer the displayed value (checked unless explicitly false).
    const mergedAccess = {};

    // consider union of projects defined in PROJECT_FEATURES and those present in draft
    const projectKeys = new Set([
      ...Object.keys(PROJECT_FEATURES || {}),
      ...Object.keys(draft.sidebar_config || {}),
    ]);

    projectKeys.forEach((project) => {
      mergedAccess[project] = {};
      const features = (PROJECT_FEATURES[project] || [])
        .map((f) => f.featureKey)
        .filter(Boolean);

      // First, for each feature defined by PROJECT_FEATURES, determine displayed value
      features.forEach((featureKey) => {
        const explicit = draft.sidebar_config?.[project]?.[featureKey];
        // Treat explicit 1/true as checked; explicit 0/false as unchecked.
        // If not present (undefined), consider it false (unchecked) per requirement.
        const shownChecked =
          explicit === 1 || explicit === "1" || explicit === true;
        mergedAccess[project][featureKey] = shownChecked ? 1 : 0;
      });

      // Then include any extra keys present in draft.sidebar_config that aren't in PROJECT_FEATURES
      Object.keys(draft.sidebar_config?.[project] || {}).forEach((k) => {
        if (mergedAccess[project][k] === undefined) {
          mergedAccess[project][k] = draft.sidebar_config[project][k] ? 1 : 0;
        }
      });
    });

    const accessPayload = {
      user: draft.email,
      project: selectedProject,
      access_level: mergedAccess,
    };

    const accessRes = await updateAccessApi(accessPayload);

    if (!accessRes.ok) {
      setErrorMsg(
        accessRes.error?.response?.data?.error ||
          accessRes.error?.response?.data?.message ||
          accessRes.error?.message ||
          "Failed to update sidebar configuration. Please try again.",
      );
      setSaving(false);
      enqueueSnackbar(
        accessRes.error?.response?.data?.error ||
          accessRes.error?.response?.data?.message ||
          accessRes.error?.message ||
          "Failed to update sidebar configuration.",
        {
          variant: "error",
        },
      );
      return;
    }

    enqueueSnackbar("User access levels updated successfully.", {
      variant: "success",
    });
    setSaving(false);
    closeModal();
  };

  return (
    <PageLayout title="Users" contentClassName="flex flex-1 flex-col">
      <div className="mt-4 mb-4">
        {/* Search + Status Filter */}
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:max-w-sm">
            <SearchBar
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search ..."
              disabled={loading}
              aria-busy={loading || searching}
              size="sm"
              rightSection={
                searching ? (
                  <span className="text-[11px] text-gray-400">Searching…</span>
                ) : null
              }
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="mt-2 text-sm font-medium text-gray-600 sm:mt-1 sm:text-right dark:text-gray-300">
              Users:{" "}
              <span className="tabular-nums">
                {loading ? "…" : users.length}
              </span>
            </div>

            <div className="w-full sm:w-auto">
              <CustomDropdown
                value={
                  [
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ].find((opt) => opt.value === statusFilter) || {
                    value: "all",
                    label: "All",
                  }
                }
                onChange={(opt) => setStatusFilter(opt.value)}
                options={[
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
                disabled={loading}
                className="w-36"
                searchable={false}
              />
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex max-h-[72vh] flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#111]">
          <div className="flex-1 overflow-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:bg-[#1a1d21] dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Projects</th>
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skel-${i}`} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800" />
                          <div className="space-y-2">
                            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                            <div className="h-2 w-32 rounded bg-gray-200 dark:bg-gray-800" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-16 rounded bg-gray-200 dark:bg-gray-800" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <div className="h-5 w-12 rounded bg-gray-200 dark:bg-gray-800" />
                          <div className="h-5 w-16 rounded bg-gray-200 dark:bg-gray-800" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="ml-auto h-8 w-16 rounded bg-gray-200 dark:bg-gray-800" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center dark:border-gray-800 dark:bg-transparent">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                          <PersonOutlineIcon className="text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          No users found
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {emptyMsg}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openModal(u)}
                      className="group cursor-pointer bg-white transition-colors hover:bg-gray-50 dark:bg-transparent dark:hover:bg-white/5"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700">
                            <PersonOutlineIcon fontSize="small" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                              <span>{u.username}</span>
                              {OWNERS.includes(u.email) && (
                                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800">
                                  OWNER
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill whitelisted={u.whitelisted} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {Object.keys(u.projects || {}).length > 0 ? (
                            Object.entries(u.projects || {}).map(
                              ([projectKey, access]) => (
                                <Tooltip
                                  key={`${u.id}-${projectKey}`}
                                  title={`${projectKey.toUpperCase()} • ${formatAccessLabel(access)}`}
                                >
                                  <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 uppercase transition-colors group-hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:group-hover:bg-black">
                                    {projectKey}
                                  </span>
                                </Tooltip>
                              ),
                            )
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-600">
                              -
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(u);
                          }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---- Custom Modal ---- */}
      <CustomModal open={open} onClose={closeModal} size="sm">
        <div className="flex h-[600px] flex-col overflow-hidden">
          {modalLoading && (
            <div className="w-full p-6">
              <UserModalSkeleton />
            </div>
          )}

          {!modalLoading && draft && (
            <>
              {/* Top: User Info */}
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700">
                    <PersonOutlineIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-gray-900 dark:text-white">
                      {draft.username}
                    </div>
                    <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                      {draft.email}
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Whitelisted
                    </span>
                    <input
                      type="checkbox"
                      checked={draft.whitelisted}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          whitelisted: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                  </label>
                </div>
              </div>

              {/* Middle: 1/2 Split - Projects (Left) & Features (Right) */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left: Projects */}
                <div className="w-1/2 overflow-y-auto border-r border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-3 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                    Projects
                  </div>
                  <div className="space-y-1">
                    {ALL_PROJECTS.map((p) => {
                      const hasAccess = Object.prototype.hasOwnProperty.call(
                        normalizedDraftProjects,
                        p,
                      );
                      return (
                        <button
                          key={p}
                          onClick={() => setSelectedProject(p)}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                            selectedProject === p
                              ? "bg-blue-50 text-blue-600 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-800"
                              : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
                          }`}
                        >
                          <span className="uppercase">{p}</span>
                          {hasAccess && (
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <div className="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                      Access Level
                    </div>
                    <CustomDropdown
                      value={
                        [
                          { value: "no_access", label: "No Access" },
                          ...ACCESS_OPTIONS,
                        ].find(
                          (opt) =>
                            opt.value ===
                            (normalizedDraftProjects[selectedProject] ||
                              "no_access"),
                        ) || { value: "no_access", label: "No Access" }
                      }
                      onChange={(opt) => {
                        const val = opt.value;
                        if (val === "no_access") {
                          toggleProject(selectedProject);
                        } else {
                          setDraft((d) => {
                            const current = normalizeProjects(d.projects);
                            return {
                              ...d,
                              projects: { ...current, [selectedProject]: val },
                            };
                          });
                        }
                      }}
                      options={[
                        { value: "no_access", label: "No Access" },
                        ...ACCESS_OPTIONS,
                      ]}
                      searchable={false}
                    />
                  </div>
                </div>

                {/* Right: Features */}
                <div className="w-1/2 overflow-y-auto bg-gray-50 p-4 dark:bg-black">
                  <div className="mb-3 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                    {selectedProject.toUpperCase()} Config
                  </div>
                  {normalizedDraftProjects[selectedProject] ? (
                    <SidebarConfigurator
                      projectKey={selectedProject}
                      config={draft.sidebar_config?.[selectedProject] || {}}
                      onChange={(newConfig) =>
                        setDraft((d) => ({
                          ...d,
                          sidebar_config: {
                            ...d.sidebar_config,
                            [selectedProject]: newConfig,
                          },
                        }))
                      }
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-8 text-center dark:border-gray-700 dark:bg-white/5">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No access to this project.
                      </p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Select an access level on the left.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom: Action Buttons */}
              <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                <div className="flex justify-between gap-3">
                  <button
                    onClick={onSave}
                    className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
                {errorMsg && (
                  <div className="mt-2 text-right text-xs text-red-600 dark:text-red-400">
                    {errorMsg}
                  </div>
                )}
              </div>
            </>
          )}

          {!modalLoading && !draft && (
            <div className="p-6 text-center text-sm text-gray-600 dark:text-gray-300">
              Unable to load user details.
            </div>
          )}
        </div>
      </CustomModal>
    </PageLayout>
  );
};
