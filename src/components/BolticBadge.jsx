import React, { useState } from "react";

const BOLTIC_ICON = "/assets/boltic.png";
const ERROR_ICON = "/assets/image-error.svg";

const BolticBadge = () => {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 rounded-4xl">
      <a
        href="http://boltic.io/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Powered by Boltic (opens in a new tab)"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-4xl px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg shadow-gray-400/40 backdrop-blur hover:opacity-90 dark:text-gray-300 dark:shadow-gray-900/60"
      >
        <img
          src={hasError ? ERROR_ICON : BOLTIC_ICON}
          alt="Boltic logo"
          onError={() => setHasError(true)}
          className="h-6 w-6 rounded-xl object-contain"
        />
        <span>Powered by Boltic</span>
      </a>
    </div>
  );
};

export default BolticBadge;
