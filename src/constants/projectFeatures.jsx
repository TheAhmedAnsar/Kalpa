import React from "react";
import Home from "../projects/jiomart/pages/Home";
import TaskStatus from "../projects/jiomart/pages/TaskStatus";
import BulkAction from "../projects/jiomart/pages/BulkAction";
import OrderAction from "../projects/jiomart/pages/OrderAction";
import LaneTat from "../projects/jiomart/components/BulkActions/LaneTat";
import Rvsl from "../projects/jiomart/components/BulkActions/Rvsl";
import Serviceability from "../projects/jiomart/components/BulkActions/Serviceability";
import NetworkUpdate from "../projects/jiomart/pages/NetworkUpdate";
import FyndStores from "../projects/jiomart/pages/FyndStores";
import Logistics from "../projects/jiomart/pages/Logistics";
import Products from "../projects/jiomart/pages/Products";
import Stores from "../projects/jiomart/components/BulkActions/Stores";
import Orders from "../projects/jiomart/pages/Orders";
import OrderDetails from "../projects/jiomart/pages/OrderDetails";
import AWBGeneration from "../projects/jiomart/pages/AwbGeneration";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import JmdHome from "../projects/jiomart_digital/pages/JmdHome";
import Configuration from "../projects/jiomart_digital/pages/Configuration";
import WeAreWorking from "../projects/jiomart_digital/pages/WeAreWorking";
import EdcDevice from "../projects/jiomart_digital/pages/edc_device";
import UpdateUserType from "../projects/jiomart_digital/pages/update_user_type";
import GTDeletion from "../projects/jiomart_digital/pages/gt_deletion";
import WMSHome from "../projects/wms/pages/WMSHome";
import WMSUsers from "../projects/wms/pages/WMSUsers";
import WMSUserDetails from "../projects/wms/pages/WMSUserDetails";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import StoreMallDirectoryOutlinedIcon from "@mui/icons-material/StoreMallDirectoryOutlined";
import ScreenSearchDesktopOutlinedIcon from "@mui/icons-material/ScreenSearchDesktopOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SubscriptionsOutlinedIcon from "@mui/icons-material/SubscriptionsOutlined";
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined";
import Tutorial from "../pages/Tutorial";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import TmsHome from "../projects/tms/pages/TmsHome";
import TmsKlydoDashboard from "../projects/tms/pages/TmsKlydoDashboard";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import TmsSaltyDashboard from "../projects/tms/pages/TmsSaltyDashboard";
import TmsAsterDashboard from "../projects/tms/pages/TmsAsterDashboard";
import TmsLucasDashboard from "../projects/tms/pages/TmsLucasDashboard";
import JcpNetwork from "../projects/jcp_jiomart/pages/Network";
import MobileUpdate from "../projects/jiomart_digital/pages/mobile_update";

const createBulkActionChildren = (projectKey = "jiomart") => {
  const projects = Array.isArray(projectKey) ? projectKey : [projectKey];
  return [
    { path: "lane-tat", element: <LaneTat />, projects },
    { path: "rvsl", element: <Rvsl />, projects },
    {
      path: "serviceability",
      element: <Serviceability />,
      projects,
    },
    { path: "stores", element: <Stores />, projects },
  ];
};

const PROJECT_FEATURES = {
  jiomart: [
    {
      featureKey: "home",
      routes: [{ path: "/home", element: <Home />, projects: ["jiomart"] }],
      menuItems: [{ name: "Home", icon: <HomeOutlinedIcon />, path: "/home" }],
    },
    {
      featureKey: "orders",
      routes: [
        {
          path: "/orders",
          element: <Orders />,
          projects: ["jiomart"],
          children: createBulkActionChildren("jiomart"),
        },
        {
          path: "/orders/:shipmentId",
          element: <OrderDetails />,
          projects: ["jiomart"],
        },
        {
          path: "/order-action",
          element: <OrderAction />,
          projects: ["jiomart"],
          children: createBulkActionChildren("jiomart"),
        },
      ],
      menuItems: [],
      sections: [
        {
          type: "collapsible",
          key: "orders",
          title: "Orders",
          icon: <ViewListOutlinedIcon />,
          items: [
            { name: "My Orders", path: "/orders" },
            { name: "Bulk Action", path: "/order-action" },
          ],
          dividerBefore: true,
        },
      ],
    },
    {
      featureKey: "configurations",
      routes: [
        {
          path: "/network-update",
          element: <NetworkUpdate />,
          projects: ["jiomart"],
        },
        {
          path: "/bulk-action",
          element: <BulkAction />,
          projects: ["jiomart"],
          children: createBulkActionChildren("jiomart"),
        },
        {
          path: "/task-status",
          element: <TaskStatus />,
          projects: ["jiomart"],
          children: createBulkActionChildren("jiomart"),
        },
        {
          path: "/awb-generation",
          element: <AWBGeneration />,
          projects: ["jiomart"],
        },
      ],
      menuItems: [],
      sections: [
        {
          type: "collapsible",
          key: "jiomart-configurations",
          title: "Configuration",
          icon: <SettingsOutlinedIcon />,
          items: [
            { name: "Bulk Action", path: "/bulk-action" },
            { name: "Task Status", path: "/task-status" },
            { name: "Network", path: "/network-update" },
            { name: "AWB Generation", path: "/awb-generation" },
          ],
          dividerBefore: true,
          dividerAfter: true,
        },
      ],
    },
    {
      featureKey: "stores",
      routes: [
        { path: "/stores", element: <FyndStores />, projects: ["jiomart"] },
      ],
      menuItems: [
        {
          name: "Stores",
          icon: <StoreMallDirectoryOutlinedIcon />,
          path: "/stores",
        },
      ],
    },
    {
      featureKey: "products",
      routes: [
        { path: "/products", element: <Products />, projects: ["jiomart"] },
      ],
      menuItems: [
        {
          name: "Products",
          icon: <ScreenSearchDesktopOutlinedIcon />,
          path: "/products",
        },
      ],
    },
    {
      featureKey: "logistics",
      routes: [
        { path: "/logistics", element: <Logistics />, projects: ["jiomart"] },
      ],
      menuItems: [
        {
          name: "Logistics",
          icon: <LocalShippingOutlinedIcon />,
          path: "/logistics",
        },
      ],
    },
    {
      featureKey: "tutorial",
      routes: [
        { path: "/tutorial", element: <Tutorial />, projects: ["jiomart"] },
      ],
      menuItems: [],
      sections: [
        {
          name: "Tutorial",
          icon: <SubscriptionsOutlinedIcon />,
          path: "/tutorial",
        },
      ],
    },
  ],
  jiomart_digital: [
    {
      featureKey: "home",
      routes: [
        { path: "/home", element: <JmdHome />, projects: ["jiomart_digital"] },
      ],
      menuItems: [{ name: "Home", icon: <HomeOutlinedIcon />, path: "/home" }],
    },
    {
      featureKey: "configurations",
      routes: [
        {
          path: "/configuration",
          element: <Configuration />,
          projects: ["jiomart_digital"],
        },
        {
          path: "/we-are-working",
          element: <WeAreWorking />,
          projects: ["jiomart_digital"],
        },
        {
          path: "/mobile-update",
          element: <MobileUpdate />,
          projects: ["jiomart_digital"],
        },
        {
          path: "/edc-device",
          element: <EdcDevice />,
          projects: ["jiomart_digital"],
        },
        {
          path: "/update-user-type",
          element: <UpdateUserType />,
          projects: ["jiomart_digital"],
        },
        {
          path: "/gt-deletion",
          element: <GTDeletion />,
          projects: ["jiomart_digital"],
        },
      ],
      menuItems: [],
      sections: [
        {
          type: "collapsible",
          key: "jiomart-digital-configurations",
          title: "Configuration",
          icon: <SettingsOutlinedIcon />,
          items: [
            { name: "Update User Type", path: "/update-user-type" },
            { name: "Configuration", path: "/configuration" },
            { name: "We Are Working", path: "/we-are-working" },
            { name: "Mobile Update", path: "/mobile-update" },
            { name: "EDC Device", path: "/edc-device" },
            { name: "GT Deletion", path: "/gt-deletion" },
            // {name:"mobile update", path:"/mobile-update"}
          ],
          dividerBefore: true,
          dividerAfter: true,
        },
      ],
    },
  ],
  jcp_jiomart: [
    {
      featureKey: "home",
      routes: [{ path: "/home", element: <div />, projects: ["jcp_jiomart"] }],
      menuItems: [{ name: "Home", icon: <HomeOutlinedIcon />, path: "/home" }],
    },
    {
      featureKey: "configurations",
      routes: [
        {
          path: "/bulk-action",
          element: <div />,
          projects: ["jcp_jiomart"],
        },
        {
          path: "/network",
          element: <JcpNetwork />,
          projects: ["jcp_jiomart"],
        },
      ],
      menuItems: [],
      sections: [
        {
          type: "collapsible",
          key: "jcp-jiomart-configurations",
          title: "Configuration",
          icon: <SettingsOutlinedIcon />,
          items: [{ name: "Network", path: "/network" }],
          dividerBefore: true,
          dividerAfter: true,
        },
      ],
    },
  ],
  wms: [
    {
      featureKey: "home",
      routes: [{ path: "/home", element: <WMSHome />, projects: ["wms"] }],
      menuItems: [{ name: "Home", icon: <HomeOutlinedIcon />, path: "/home" }],
    },
    {
      featureKey: "configurations",
      routes: [
        { path: "/wms-users", element: <WMSUsers />, projects: ["wms"] },
        {
          path: "/wms-user-details",
          element: <WMSUserDetails />,
          projects: ["wms"],
        },
      ],
      menuItems: [
        {
          name: "User Management",
          icon: <PersonSearchOutlinedIcon />,
          path: "/wms-users",
        },
      ],
    },
  ],
  tms: [
    {
      featureKey: "home",
      routes: [{ path: "/home", element: <TmsHome />, projects: ["tms"] }],
      menuItems: [{ name: "Home", icon: <HomeOutlinedIcon />, path: "/home" }],
    },
    {
      featureKey: "klydo",
      routes: [
        { path: "/klydo", element: <TmsKlydoDashboard />, projects: ["tms"] },
      ],
      menuItems: [
        {
          name: "Klydo Dashboard",
          icon: <DashboardOutlinedIcon />,
          path: "/klydo",
        },
      ],
    },
    {
      featureKey: "salty",
      routes: [
        { path: "/salty", element: <TmsSaltyDashboard />, projects: ["tms"] },
      ],
      menuItems: [
        {
          name: "Salty Dashboard",
          icon: <DashboardOutlinedIcon />,
          path: "/salty",
        },
      ],
    },
    {
      featureKey: "aster",
      routes: [
        { path: "/aster", element: <TmsAsterDashboard />, projects: ["tms"] },
      ],
      menuItems: [
        {
          name: "Aster Dashboard",
          icon: <DashboardOutlinedIcon />,
          path: "/aster",
        },
      ],
    },
    {
      featureKey: "lucas",
      routes: [
        { path: "/lucas", element: <TmsLucasDashboard />, projects: ["tms"] },
      ],
      menuItems: [
        {
          name: "Lucas Dashboard",
          icon: <DashboardOutlinedIcon />,
          path: "/lucas",
        },
      ],
    },
  ],
};

export default PROJECT_FEATURES;
