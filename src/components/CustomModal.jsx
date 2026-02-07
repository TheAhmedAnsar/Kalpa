import React from "react";
import { Dialog, DialogContent, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import useTailwindDark from "../hooks/useTailwindDark";

const cx = (...parts) => parts.filter(Boolean).join(" ");

const CustomModal = ({ open, onClose, children, size, isDark: forcedDark }) => {
  // If `isDark` is passed, use it. Otherwise auto-detect.
  const autoDark = useTailwindDark();
  const isDark = typeof forcedDark === "boolean" ? forcedDark : autoDark;

  const handleClose = (event, reason) => {
    if (reason === "backdropClick" || reason === "escapeKeyDown") return;
    onClose();
  };

  const backdropCls = cx(
    "backdrop-blur-sm",
    isDark ? "bg-black/50" : "bg-black/30",
  );

  // sx fallback for dark/light surfaces
  const paperSx = {
    borderRadius: 3,
    bgcolor: isDark ? "#0f0f0f" : "#fff",
    color: isDark ? "#e5e7eb" : "inherit",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`,
    boxShadow: isDark
      ? "0 10px 15px -3px rgba(0,0,0,.7), 0 4px 6px -4px rgba(0,0,0,.7)"
      : undefined,
  };

  const closeBtnCls = cx(
    "!absolute !top-2 !right-2 !z-[1]",
    forcedDark === true && "text-white hover:text-white hover:bg-slate-700/70",
    forcedDark === false && "text-black hover:text-black hover:bg-slate-200/70",
    forcedDark === undefined &&
      (isDark
        ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/70"),
  );

  const btnCls = cx(
    forcedDark === true && "text-white ",
    forcedDark === false && "text-black ",
    forcedDark === undefined &&
      (isDark ? "text-slate-400 " : "text-slate-500 "),
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      disableEscapeKeyDown
      fullWidth
      maxWidth={size}
      scroll="paper"
      slotProps={{
        backdrop: {
          className: backdropCls,
          sx: { backdropFilter: "blur(2px)" },
        },
        paper: {
          sx: paperSx,
          elevation: 0,
        },
      }}
    >
      <IconButton
        aria-label="close"
        onClick={onClose}
        className={closeBtnCls}
        size="medium"
      >
        <CloseIcon fontSize="medium" className={btnCls} />
      </IconButton>

      <DialogContent className="overflow-visible p-2">{children}</DialogContent>
    </Dialog>
  );
};

export default CustomModal;
