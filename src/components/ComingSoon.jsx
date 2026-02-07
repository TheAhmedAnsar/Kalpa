import React from "react";

const fontStack =
  "'Poppins','Montserrat','Segoe UI','Arial Black','Inter',system-ui,sans-serif";

const ComingSoon = () => {
  return (
    <section className="flex h-full w-full items-center justify-center bg-[#f7f8fb] px-4 py-10 text-gray-900 dark:bg-[#0d0f12] dark:text-gray-100">
      <div className="flex flex-col items-center justify-center text-center">
        <div
          className="relative mx-auto mb-6 flex flex-col items-center gap-2"
          style={{ fontFamily: fontStack }}
        >
          <div className="relative flex h-[150px] w-full max-w-[520px] items-center justify-center">
            <span className="font-fynd absolute translate-x-3 translate-y-3 text-[150px] leading-none font-black text-gray-200 select-none dark:text-gray-800">
              COMING
            </span>
            <span className="font-fynd absolute text-[150px] leading-none font-black text-gray-900 select-none dark:text-gray-100">
              COMING
            </span>
          </div>
          <div className="relative -mt-4 flex h-[120px] w-full max-w-[380px] items-center justify-center">
            <span className="font-fynd absolute translate-x-2 translate-y-2 text-[120px] leading-none font-black text-gray-200 select-none dark:text-gray-800">
              SOON
            </span>
            <span className="font-fynd absolute text-[120px] leading-none font-black text-gray-900 select-none dark:text-gray-100">
              SOON
            </span>
          </div>
        </div>
        <p
          className="mt-6 text-sm font-medium text-gray-600 dark:text-gray-300"
          style={{ fontFamily: fontStack }}
        >
          We&apos;re crafting this page. Check back again soon.
        </p>
      </div>
    </section>
  );
};

export default ComingSoon;
