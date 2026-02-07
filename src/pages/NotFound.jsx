import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/home", { replace: true });
  };

  const fontStack =
    "'Poppins','Montserrat','Segoe UI','Arial Black','Inter',system-ui,sans-serif";

  return (
    <section className="flex h-full w-full items-center justify-center px-4 py-10 text-gray-900 transition-colors dark:text-gray-100">
      <div className="text-center">
        <p
          className="mb-4 text-[11px] font-semibold tracking-[0.22em] text-gray-500 dark:text-gray-400"
          style={{ fontFamily: fontStack }}
        >
          OOPS! PAGE NOT FOUND
        </p>
        <div
          className="relative mx-auto mb-3 h-[150px] w-full max-w-[320px]"
          style={{ fontFamily: fontStack }}
        >
          <span className="font-fynd absolute inset-0 translate-x-2 translate-y-2 text-[150px] leading-none font-black text-gray-200 select-none dark:text-gray-800">
            404
          </span>
          <span className="font-fynd absolute inset-0 text-[150px] leading-none font-black text-gray-900 select-none dark:text-gray-100">
            404
          </span>
        </div>
        <p
          className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300"
          style={{ fontFamily: fontStack }}
        >
          WE ARE SORRY, BUT THE PAGE YOU REQUESTED WAS
          <br />
          NOT FOUND
        </p>
        <button
          type="button"
          onClick={handleGoHome}
          className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          style={{ fontFamily: fontStack }}
        >
          Go to Home
        </button>
      </div>
    </section>
  );
};

export default NotFound;
