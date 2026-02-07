import React from "react";
import { useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import FileCopyOutlinedIcon from "@mui/icons-material/FileCopyOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import PageLayout from "../../../components/PageLayout";

const modules = [
  {
    title: "Lane TAT",
    description: "Update TAT of 1P and 3P store",
    icon: <HistoryOutlinedIcon fontSize="large" />,
    path: "lane-tat",
  },
  {
    title: "3P Serviceability",
    description: "Update store and pincode serviceability for reverse VSL",
    icon: <FileCopyOutlinedIcon fontSize="large" />,
    path: "rvsl",
  },
  {
    title: "1P Serviceability",
    description: "Serviceability of 1P stores and pincodes",
    icon: <LocalShippingOutlinedIcon fontSize="large" />,
    path: "serviceability",
  },
  {
    title: "Stores",
    description: "Update Store configurations: TAT, Cutoff & LatLong",
    icon: <StorefrontOutlinedIcon fontSize="large" />,
    path: "stores",
  },
];

const pathToLabel = {
  "bulk-action": "Bulk Action",
  "lane-tat": "Lane TAT",
  rvsl: "RVSL",
  serviceability: "Serviceability",
  stores: "Stores",
};

const BulkAction = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPath = location.pathname === "/bulk-action";

  return (
    <PageLayout
      title={pathToLabel[location.pathname.split("/").pop()]}
      contentClassName="flex flex-1 flex-col overflow-hidden"
    >
      {/* Breadcrumb */}
      {!isRootPath && (
        <div className="mt-1 flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <Link to="/bulk-action" className="hover:underline">
            Bulk Action
          </Link>
          <ArrowForwardIosIcon className="!text-xs" />
          <span className="font-semibold capitalize">
            {pathToLabel[location.pathname.split("/").pop()]}
          </span>
        </div>
      )}

      {/* Main Content */}
      <div className="mt-4 flex-1 overflow-hidden">
        {isRootPath ? (
          <div className="grid h-full grid-cols-1 gap-6 overflow-auto pt-2 pb-10 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
            {modules.map((mod) => (
              <div
                key={mod.title}
                className="dark:bg-primary-dark flex h-60 cursor-pointer flex-col justify-between gap-1 rounded-2xl border-4 border-gray-200 p-6 shadow-md hover:shadow-xl dark:border-gray-600 dark:shadow-gray-800"
                onClick={() => navigate(mod.path)}
              >
                <div>
                  <div className="mb-4 flex items-center justify-start">
                    {mod.icon}
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-gray-50">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-wrap text-gray-500 dark:text-gray-100">
                    {mod.description}
                  </p>
                </div>

                <div className="self-end rounded-md border border-gray-200 p-1 transition-colors duration-200 ease-in-out hover:text-blue-600">
                  <ChevronRightIcon />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full justify-center overflow-auto pb-10">
            <Outlet />
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default BulkAction;
