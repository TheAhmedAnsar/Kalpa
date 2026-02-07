import React, { useEffect, useRef, useState } from "react";
import CustomModal from "../CustomModal";

// 4-box OTP modal with fixed-size inputs, arrow/backspace navigation, paste support,
// and auto-verify when 4 digits are entered
const OtpModal = ({ open, onClose, onVerify }) => {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const lastSubmittedRef = useRef(""); // avoid duplicate submissions of same OTP

  const inputsRef = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const focusIndex = (idx) => {
    const el = inputsRef[idx]?.current;
    if (el) el.focus();
  };

  const combined = digits.join("");

  const handleChange = (idx, value) => {
    const v = value.replace(/\D/g, "");
    if (!v) {
      const next = [...digits];
      next[idx] = "";
      setDigits(next);
      setError("");
      return;
    }
    const next = [...digits];
    next[idx] = v.slice(-1);
    setDigits(next);
    setError("");
    if (idx < inputsRef.length - 1) focusIndex(idx + 1);
  };

  const handleKeyDown = (idx, e) => {
    const key = e.key;
    if (key === "Backspace") {
      if (digits[idx]) {
        const next = [...digits];
        next[idx] = "";
        setDigits(next);
      } else if (idx > 0) {
        focusIndex(idx - 1);
        const next = [...digits];
        next[idx - 1] = "";
        setDigits(next);
      }
      e.preventDefault();
    } else if (key === "ArrowLeft" && idx > 0) {
      focusIndex(idx - 1);
      e.preventDefault();
    } else if (key === "ArrowRight" && idx < inputsRef.length - 1) {
      focusIndex(idx + 1);
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!text) return;
    const next = ["", "", "", ""];
    for (let i = 0; i < text.length && i < 4; i++) next[i] = text[i];
    setDigits(next);
    const lastIndex = Math.min(text.length, 4) - 1;
    if (lastIndex >= 0) focusIndex(lastIndex);
    e.preventDefault();
  };

  // Auto-verify whenever we have 4 digits
  useEffect(() => {
    const tryVerify = async () => {
      if (combined.length !== 4) return;
      if (isVerifying) return;
      if (lastSubmittedRef.current === combined) return; // prevent re-submitting same OTP

      setError("");
      setIsVerifying(true);
      lastSubmittedRef.current = combined;

      try {
        await Promise.resolve(onVerify?.(combined));
        setIsVerifying(false);
        setDigits(["", "", "", ""]);
      } catch (err) {
        const message =
          (err && (err.message || err.error || err.toString())) ||
          "Verification failed. Please try again.";
        setError(message);
        setIsVerifying(false);
        setDigits(["", "", "", ""]);
      }
    };

    tryVerify();
  }, [combined, isVerifying, onClose, onVerify]);

  const inputBase =
    "h-12 w-12 sm:h-14 sm:w-14 text-center text-xl rounded border px-0 py-0 outline-none focus:ring-2 transition disabled:opacity-50 border-gray-300 bg-white";

  return (
    <CustomModal open={open} onClose={onClose} size={"xs"} isDark={false}>
      <div className="font-fynd flex flex-col gap-5 p-5 text-gray-900">
        <h2 className="self-center text-xl font-semibold">OTP Verification</h2>
        <p className="text-sm text-gray-600">
          Enter the one-time password sent to your email to continue.
        </p>

        <div
          className="flex items-center justify-center gap-3"
          onPaste={handlePaste}
        >
          {digits.map((d, idx) => (
            <input
              key={idx}
              ref={inputsRef[idx]}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`${inputBase} ${
                error ? "border-red-500 focus:ring-red-400" : "focus:ring-black"
              }`}
              aria-label={`OTP digit ${idx + 1}`}
              disabled={isVerifying}
            />
          ))}
        </div>

        <div className="min-h-[1.25rem]">
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </CustomModal>
  );
};

export default OtpModal;
