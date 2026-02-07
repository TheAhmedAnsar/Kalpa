import React, { useEffect, useMemo, useState } from "react";
import CustomModal from "../components/CustomModal";
import apiClient from "../api/client";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import { DateTime } from "luxon";
import constants from "../constants";
import { useSelector } from "react-redux";
import { selectUserEmail } from "../store/user";

/* ---------------- Icons (inline SVG, no libraries) ---------------- */

const CopyIcon = ({ className = "h-4 w-4" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1Zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2Zm0 16H8V7h11v14Z" />
  </svg>
);

const EditIcon = ({ className = "h-4 w-4" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

/* Eye / Eye-off */
const EyeIcon = ({ className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = ({ className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94M9.9 4.24A10.73 10.73 0 0 1 12 4c7 0 11 7 11 7a21.9 21.9 0 0 1-3.23 4.49" />
    <path d="M1 1l22 22" />
  </svg>
);

/* ---------------- Helpers ---------------- */
const pillClass = (access) => {
  const v = String(access || "").toLowerCase();
  if (v === "admin")
    return "bg-green-100 text-green-700 ring-1 ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-800";
  if (v === "operations")
    return "bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800";
  return "bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10";
};

const inputBase =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 " +
  "placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 " +
  "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-700 " +
  "dark:border-gray-700 dark:bg-[#15171a] dark:text-gray-100 dark:placeholder-gray-400 " +
  "dark:focus:border-blue-400 dark:focus:ring-blue-400/30";

/* ---------------- Component ---------------- */
const defaultProfile = {
  username: "",
  email: "",
  accessLevel: "",
  projects: [],
  joined: "-",
  joinedRelative: "",
};

const parseCreatedAt = (value) => {
  if (!value) return null;
  if (DateTime.isDateTime(value)) return value;

  if (typeof value === "number") {
    if (value > 1e12) return DateTime.fromMillis(value, { zone: "utc" });
    if (value > 1e9) return DateTime.fromSeconds(value, { zone: "utc" });
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) return parseCreatedAt(numeric);

    const iso = DateTime.fromISO(trimmed, { zone: "utc" });
    if (iso.isValid) return iso;

    const rfc2822 = DateTime.fromRFC2822(trimmed, { zone: "utc" });
    if (rfc2822.isValid) return rfc2822;

    const jsDate = DateTime.fromJSDate(new Date(trimmed));
    if (jsDate.isValid) return jsDate;
  }

  return null;
};

const formatMembership = (createdAt) => {
  const parsed = parseCreatedAt(createdAt);
  if (!parsed) {
    return { since: "-", relative: "" };
  }

  const createdLocal = parsed.toLocal();
  const now = DateTime.local();

  if (!createdLocal.isValid || !now.isValid) {
    return {
      since: createdLocal.isValid ? createdLocal.toISO() : "-",
      relative: "",
    };
  }

  const diff = now
    .diff(createdLocal, ["days", "hours", "minutes", "seconds"])
    .toObject();

  const parts = [];

  if (diff.days)
    parts.push(
      `${Math.floor(diff.days)} day${Math.floor(diff.days) > 1 ? "s" : ""}`,
    );
  if (diff.hours)
    parts.push(
      `${Math.floor(diff.hours)} hour${Math.floor(diff.hours) > 1 ? "s" : ""}`,
    );
  if (diff.minutes)
    parts.push(
      `${Math.floor(diff.minutes)} minute${Math.floor(diff.minutes) > 1 ? "s" : ""}`,
    );

  const relative = parts.length > 0 ? `${parts.join(", ")}` : "Just now";

  return {
    since: createdLocal.toFormat("MMM dd, yyyy • hh:mm a"),
    relative,
  };
};

const Profile = () => {
  const [profile, setProfile] = useState(() => ({ ...defaultProfile }));
  const [loading, setLoading] = useState(true);

  // Password modal + form
  const [modalOpen, setModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Eye toggles
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Custom toast
  const [toast, setToast] = useState({ open: false, msg: "", type: "success" }); // success | error | warning

  const user_email = useSelector(selectUserEmail);

  useEffect(() => {
    if (!user_email) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await apiClient.post("/__deku/api/v1/users/email", {
          user_email: user_email,
        });
        const data = res.data?.data || res.data;
        if (!data) {
          if (!cancelled) setProfile({ ...defaultProfile });
          return;
        }
        const result = Object.entries(data.projects).map(
          ([key, value]) => `${key}-${value}`,
        );
        const membership = formatMembership(data.created_at);
        if (!cancelled && data) {
          setProfile({
            username: data.username ?? "",
            email: data.email ?? data.user_email ?? "",
            projects: result,
            joined: membership.since,
            joinedRelative: membership.relative,
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        if (!cancelled) setProfile({ ...defaultProfile });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user_email]);

  useEffect(() => {
    if (newPassword && confirmPassword && newPassword === confirmPassword) {
      setPasswordError("");
    }
  }, [newPassword, confirmPassword]);

  const pwdStrong = useMemo(() => newPassword.length >= 8, [newPassword]);
  const pwdMatch = useMemo(
    () => newPassword === confirmPassword && confirmPassword.length > 0,
    [newPassword, confirmPassword],
  );

  const openToast = (msg, type = "success") => {
    setToast({ open: true, msg, type });
    window.clearTimeout(openToast._t);
    openToast._t = window.setTimeout(
      () => setToast((t) => ({ ...t, open: false })),
      3000,
    );
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      openToast("Email copied", "success");
    } catch {
      openToast("Could not copy email", "warning");
    }
  };

  const handleSavePassword = async () => {
    if (!pwdMatch) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (!pwdStrong) {
      setPasswordError("Password should be at least 8 characters");
      return;
    }
    try {
      await apiClient.post("/api/v1/reset-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setModalOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      openToast("Password updated", "success");
    } catch (err) {
      console.error("Failed to reset password:", err);
      openToast("Failed to update password", "error");
    }
  };

  // Add right padding for the eye button inside inputs
  const passwordInputCls = inputBase + " pr-10";

  return (
    <div className="flex w-full flex-col gap-2 font-sans">
      {/* Header */}
      {/* <div className="flex h-[60px] items-center px-6 md:px-10">
        <h1 className="font-fynd text-2xl text-gray-900 dark:text-white">
          Profile
        </h1>
      </div>

      <div className="mx-4 mb-4 border-b border-gray-200 dark:border-white/10" /> */}

      {/* Card */}
      <div className="mx-4 my-4">
        <div className="backdrop-blur">
          {loading ? (
            <div className="space-y-3 px-2 pb-2" aria-busy="true">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/10" />
                  <div className="h-3 w-48 rounded bg-gray-200 dark:bg-white/10" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-10 rounded-lg bg-gray-100 dark:bg-white/5"
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <span
                    key={idx}
                    className="inline-block h-6 w-24 rounded-full bg-gray-100 dark:bg-white/10"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-2 pb-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-inner">
                    <PersonOutlineOutlinedIcon fontSize="large" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                      {profile.username || "-"}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="truncate">{profile.email || "-"}</span>
                      <button
                        type="button"
                        onClick={copyEmail}
                        disabled={!profile.email}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white/70 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:ring-2 focus:ring-blue-400/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 dark:focus:ring-blue-400/40"
                        title={
                          profile.email ? "Copy email" : "Email unavailable"
                        }
                      >
                        <CopyIcon />
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                {/* <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${pillClass(profile.accessLevel)}`}
                  >
                    {profile.accessLevel || "-"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300/70 bg-white/70 px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:ring-2 focus:ring-blue-400/70 focus:outline-none dark:border-white/10 dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/20 dark:focus:ring-blue-400/40"
                  >
                    <EditIcon />
                    Change Password
                  </button>
                </div> */}
              </div>

              <div className="border-b border-gray-200 dark:border-white/10" />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium tracking-wide text-gray-600 uppercase dark:text-gray-300">
                    Username
                  </label>
                  <input
                    className={inputBase}
                    value={profile.username || "-"}
                    disabled
                    readOnly
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium tracking-wide text-gray-600 uppercase dark:text-gray-300">
                    Email
                  </label>
                  <input
                    className={inputBase}
                    value={profile.email || "-"}
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium tracking-wide text-gray-600 uppercase dark:text-gray-300">
                    With Us Since
                  </label>
                  <input
                    className={inputBase}
                    value={profile.joinedRelative || "-"}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
                  Projects
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.projects?.length ? (
                    profile.projects.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-gray-200"
                      >
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      No projects
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Modal */}
      <CustomModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="xs"
      >
        <div className="space-y-4 p-2">
          <div className="text-center text-base font-semibold text-gray-900 dark:text-white">
            Change Password
          </div>

          {/* Old Password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Old Password
            </label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className={passwordInputCls}
                placeholder="Enter old password"
              />
              <button
                type="button"
                onClick={() => setShowOld((v) => !v)}
                aria-label={showOld ? "Hide old password" : "Show old password"}
                title={showOld ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700 focus:ring-2 focus:ring-blue-300 focus:outline-none dark:text-gray-300 dark:hover:text-gray-100"
              >
                {showOld ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={passwordInputCls}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? "Hide new password" : "Show new password"}
                title={showNew ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700 focus:ring-2 focus:ring-blue-300 focus:outline-none dark:text-gray-300 dark:hover:text-gray-100"
              >
                {showNew ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Re-enter New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={passwordInputCls}
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={
                  showConfirm
                    ? "Hide confirmation password"
                    : "Show confirmation password"
                }
                title={showConfirm ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700 focus:ring-2 focus:ring-blue-300 focus:outline-none dark:text-gray-300 dark:hover:text-gray-100"
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {passwordError && (
              <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                {passwordError}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSavePassword}
              disabled={!pwdMatch || !pwdStrong}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              title={!pwdStrong ? "At least 8 characters" : ""}
            >
              Save
            </button>
          </div>
        </div>
      </CustomModal>

      {/* Toast */}
      {toast.open && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div
            className={[
              "pointer-events-auto rounded-lg px-4 py-2 text-sm shadow-lg ring-1",
              toast.type === "success" &&
                "bg-green-600 text-white ring-green-500/50",
              toast.type === "error" && "bg-red-600 text-white ring-red-500/50",
              toast.type === "warning" &&
                "bg-amber-500 text-black ring-amber-500/50",
            ].join(" ")}
          >
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
