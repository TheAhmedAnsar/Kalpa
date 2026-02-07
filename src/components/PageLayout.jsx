import React from "react";
import { Divider } from "@mui/material";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const DEFAULT_ROOT_CLASSES =
  "dark:bg-primary-dark flex h-[calc(100vh-41px)] flex-col bg-gray-50 font-sans";
const DEFAULT_HEADER_CLASSES =
  "flex min-h-[36px] flex-wrap items-top justify-between px-6  sm:px-8 lg:px-10";
const DEFAULT_TITLE_CLASSES =
  "font-fynd text-2xl text-gray-800 sm:text-[26px] lg:text-3xl dark:text-white";
const DEFAULT_DIVIDER_CLASSES = "!mx-4 !mb-4 !bg-gray-300 dark:!bg-gray-700";
const DEFAULT_CONTENT_CLASSES = "flex-1 px-6 pb-6 sm:px-8 lg:px-10";

const PageLayout = ({
  title,
  subtitle,
  headerContent = null,
  children,
  rootClassName = "",
  headerClassName = "",
  titleClassName = "",
  contentClassName = "",
  disableDivider = false,
  contentPadding = true,
}) => {
  const contentClasses = contentPadding ? DEFAULT_CONTENT_CLASSES : "flex-1";

  const navigate = useNavigate();

  // const { projects } = useSelector((state) => {
  //   const projectMap = state.user?.user?.projects || {};
  //   return {
  //     allowedIds: Object.keys(projectMap),
  //     projects: projectMap,
  //   };
  // });
  const projects = useSelector((state) => state.user?.user?.projects || {});

  const projectCount = Object.keys(projects).length;

  return (
    <div className={joinClasses(DEFAULT_ROOT_CLASSES, rootClassName)}>
      <div className={joinClasses(DEFAULT_HEADER_CLASSES, headerClassName)}>
        <div className="min-w-0">
          <h1 className={joinClasses(DEFAULT_TITLE_CLASSES, titleClassName)}>
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
              {subtitle}
            </p>
          ) : null}
        </div>
        {headerContent}
        {projectCount > 1 && (
          <div
            className="flex cursor-pointer items-center rounded-full transition-colors duration-100 ease-in-out hover:text-blue-600"
            title="Switch Project"
            onClick={() => navigate("/projects")}
          >
            <SwapHorizRoundedIcon />
          </div>
        )}
      </div>
      {!disableDivider && <Divider className={DEFAULT_DIVIDER_CLASSES} />}
      <div className={joinClasses(contentClasses, contentClassName)}>
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
