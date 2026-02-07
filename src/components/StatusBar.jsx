// components/StatusBar.jsx
import React, { memo, useEffect, useState } from "react";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import { useSelector } from "react-redux";
import constants from "../constants";
import { OWNERS } from "../constants/owners";
import { selectAccessLevel, selectUserEmail } from "../store";
import CustomModal from "./CustomModal";
import SshLatencyModalContent from "./SshLatencyModalContent";

const formatDateTime = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const time = `${hours}:${minutes}:${seconds}`;
  return `${day} ${month} ${year} [ ${time} ]`;
};

const TimeText = memo(function TimeText() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="w-38 text-center font-sans font-semibold transition-colors duration-100 dark:text-cyan-200">
      {formatDateTime(now)}
    </div>
  );
});

const SshBadge = memo(function SshBadge({ onClick }) {
  return (
    <span
      className="cursor-pointer font-semibold text-red-500 hover:text-black dark:hover:text-white"
      onClick={onClick}
    >
      SSH <TimelineOutlinedIcon fontSize="small" />
    </span>
  );
});

const RoleBadge = memo(function RoleBadge({ role }) {
  return (
    <div className="rounded bg-gray-200 px-3 py-2 font-sans font-bold dark:bg-gray-700">
      {role}
    </div>
  );
});

function StatusBar() {
  const accessLevelRaw = useSelector(selectAccessLevel);
  const userEmail = useSelector(selectUserEmail);
  const accessLevelNum =
    typeof accessLevelRaw === "number"
      ? accessLevelRaw
      : parseInt(accessLevelRaw, 10);
  const derivedAccessLevel = Number.isNaN(accessLevelNum)
    ? null
    : constants.access_level[accessLevelNum];
  const baseAccessLevel =
    derivedAccessLevel ??
    (typeof accessLevelRaw === "string" && accessLevelRaw.length > 0
      ? accessLevelRaw
      : null);
  let formattedAccessLevel = baseAccessLevel
    ? baseAccessLevel
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Guest";

  if (
    formattedAccessLevel === "Admin" &&
    userEmail &&
    OWNERS.includes(userEmail)
  ) {
    formattedAccessLevel = "Owner";
  }

  const [sshOpen, setSshOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-4 px-4 pt-2 text-[11px] transition-colors duration-100 dark:text-white">
      <TimeText />
      {(formattedAccessLevel === "Admin" ||
        formattedAccessLevel === "Owner") && (
        <SshBadge onClick={() => setSshOpen(true)} />
      )}
      <RoleBadge role={formattedAccessLevel} />
      <CustomModal open={sshOpen} onClose={() => setSshOpen(false)} size="md">
        {sshOpen ? <SshLatencyModalContent /> : null}
      </CustomModal>
    </div>
  );
}

export default memo(StatusBar);
