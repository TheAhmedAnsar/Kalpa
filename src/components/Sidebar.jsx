import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  toggleTheme,
  clearUser,
  resetNetwork,
  resetWorkflow,
  persistor,
  selectUsername,
  selectAccessLevel,
  selectActiveProject,
  selectActiveProjectFeatureAccess,
} from "../store";
import { clearRefreshToken } from "../api/token";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import { enqueueSnackbar } from "notistack";
import { LightMode, DarkMode, ExpandMore } from "@mui/icons-material";
import { IconButton, Avatar, Divider, Button } from "@mui/material";
import Logo from "../assets/Logo";
import CustomModal from "./CustomModal";
import Profile from "./Profile";
import { isAdminAccessLevel } from "../utils/accessLevels";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import PROJECT_FEATURES from "../constants/projectFeatures";
import Kalpa from "/assets/kalpa3.svg";
import KalpaWhite from "/assets/kalpa_white.svg";

const ADMIN_MENU_ITEM = {
  name: "Users",
  icon: <PeopleAltOutlinedIcon />,
  path: "/users",
  adminOnly: true,
};

const Sidebar = ({ isOpen, setIsOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useSelector((state) => state.theme.value);
  const location = useLocation();
  const username = useSelector(selectUsername);
  const accessLevel = useSelector(selectAccessLevel);
  const isAdminUser = isAdminAccessLevel(accessLevel);
  const activeProject = useSelector(selectActiveProject);
  const projectFeatureAccess = useSelector(selectActiveProjectFeatureAccess);
  const projectFeatureConfig =
    (activeProject && PROJECT_FEATURES[activeProject]) || [];
  const hasFeatureFlags =
    projectFeatureAccess &&
    typeof projectFeatureAccess === "object" &&
    Object.keys(projectFeatureAccess).length > 0;

  const [sectionState, setSectionState] = useState({});
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(
    /** @type {null | "profile" | "logout"} */ (""),
  );

  const userMenuContainerRef = useRef(null);

  const closeActiveModal = () => {
    setActiveModal(null);
    setUserMenuOpen(false);
  };

  const handleLogoutClick = () => {
    setUserMenuOpen(false);
    setActiveModal("logout");
  };

  const handleProfileOpen = () => {
    setUserMenuOpen(false);
    setActiveModal("profile");
  };

  const handleLogoutConfirm = () => {
    dispatch(clearUser());
    dispatch(resetNetwork());
    dispatch(resetWorkflow("laneTat"));
    dispatch(resetWorkflow("rvsl"));
    dispatch(resetWorkflow("serviceability"));
    clearRefreshToken();
    persistor.purge();
    navigate("/login");
    closeActiveModal();
    enqueueSnackbar("Logged Out Successfully", { variant: "success" });
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  const resolveFeatureEntries = (feature, key) => {
    if (!feature || !feature[key]) {
      return [];
    }
    const entries = feature[key];

    if (!hasFeatureFlags) {
      return entries;
    }

    const isAllowed = (pathOrKey) => {
      const value = projectFeatureAccess[pathOrKey];
      if (value === false) return false;
      return value === true || value === undefined;
    };

    return entries
      .map((entry) => {
        // Handle sections with sub-items
        if (entry.items && Array.isArray(entry.items)) {
          const filteredItems = entry.items.filter(
            (item) =>
              item.path &&
              (isAllowed(item.path) || isAllowed(feature.featureKey)),
          );
          if (filteredItems.length === 0) return null;
          return { ...entry, items: filteredItems };
        }

        // Handle direct items (menuItems or link sections)
        if (entry.path) {
          if (isAllowed(entry.path) || isAllowed(feature.featureKey)) {
            return entry;
          }
          return null;
        }

        return entry;
      })
      .filter(Boolean);
  };

  const baseMenuItems = Array.isArray(projectFeatureConfig)
    ? projectFeatureConfig.flatMap((feature) =>
        resolveFeatureEntries(feature, "menuItems"),
      )
    : [];
  const combinedMenuItems = [
    ...baseMenuItems,
    ...(isAdminUser ? [ADMIN_MENU_ITEM] : []),
  ];

  const uniqueMenuItems = combinedMenuItems.filter(
    (item, index, array) =>
      item?.path &&
      array.findIndex((candidate) => candidate?.path === item.path) === index,
  );

  const visibleMenuItems = uniqueMenuItems.filter(
    (item) => item && (!item.adminOnly || isAdminUser),
  );

  const sectionConfigs = Array.isArray(projectFeatureConfig)
    ? projectFeatureConfig.flatMap((feature) =>
        resolveFeatureEntries(feature, "sections"),
      )
    : [];

  const toggleSection = (sectionKey, nextState) => {
    if (!sectionKey) {
      return;
    }
    if (!isOpen) {
      setIsOpen(true);
      setTimeout(() => {
        setSectionState((prev) => ({
          ...prev,
          [activeProject || "default"]: {
            ...(prev[activeProject || "default"] || {}),
            [sectionKey]: nextState ?? true,
          },
        }));
      }, 310);
      return;
    }
    setSectionState((prev) => ({
      ...prev,
      [activeProject || "default"]: {
        ...(prev[activeProject || "default"] || {}),
        [sectionKey]:
          nextState ?? !(prev[activeProject || "default"] || {})?.[sectionKey],
      },
    }));
  };

  return (
    <>
      <div
        className={`bg-gray-200 text-gray-800 dark:bg-black dark:text-gray-200 ${
          isOpen ? "w-56" : "w-20"
        } fixed inset-y-0 left-0 z-20 flex h-screen flex-col overflow-y-auto shadow-lg transition-all duration-300 dark:shadow-lg dark:shadow-gray-300`}
      >
        {/* Header */}
        <div
          className={`flex gap-2 ${
            isOpen ? "items-center justify-end" : "items-center justify-end"
          } px-2 py-2 transition-all duration-300`}
          onClick={toggleSidebar}
        >
          <div className="flex w-full items-center justify-center">
            <span
              className={`font-fynd overflow-hidden text-2xl whitespace-nowrap transition-all duration-300 ease-in-out ${
                isOpen
                  ? "max-w-2xl scale-110 opacity-100"
                  : "max-w-0 scale-90 opacity-0"
              }`}
            >
              <img
                src={theme === "dark" ? KalpaWhite : Kalpa}
                alt="Kalpa"
                className="mr-2 inline w-21 object-contain"
              />
            </span>
          </div>

          <IconButton>
            <div
              className={`flex transform items-center gap-3 transition-all duration-300 ease-in-out ${
                isOpen ? "scale-110" : "scale-100"
              }`}
            >
              <Logo theme={theme} />
            </div>
          </IconButton>
        </div>

        <Divider className="!mx-4 !mb-4 !bg-gray-300 dark:!bg-gray-700" />

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              title={item.name}
              className={({ isActive }) =>
                `mx-2 flex items-center rounded-lg py-2 transition-all duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-700 ${
                  isActive ? "bg-gray-300 font-medium dark:bg-gray-800" : ""
                }`
              }
            >
              <div
                className={`flex items-center ${
                  isOpen ? "pr-2 pl-5" : "pl-5"
                } transition-all duration-300 ease-in-out`}
              >
                <span className="text-xl">{item.icon}</span>
                <span
                  className={`ml-3 origin-left overflow-hidden text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${
                    isOpen
                      ? "max-w-[160px] scale-100 opacity-100"
                      : "max-w-0 scale-95 opacity-0"
                  }`}
                >
                  {item.name}
                </span>
              </div>
            </NavLink>
          ))}

          {visibleMenuItems.length === 0 && (
            <div className="mx-4 mt-4 rounded-md border border-dashed border-gray-400/70 bg-white/60 p-3 text-center text-xs text-gray-600 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300">
              Menu will be available once this project configuration is ready.
            </div>
          )}

          {sectionConfigs.map((section, index) => {
            if (!section) {
              return null;
            }
            const sectionKey =
              section.key || `${section.type || "section"}-${index}`;
            const dividerBefore = section.dividerBefore ?? false;
            const dividerAfter = section.dividerAfter ?? false;
            const projectSectionState =
              sectionState[activeProject || "default"] || {};

            if (section.type === "collapsible") {
              const isChildActive = (section.items || []).some((item) =>
                item?.path ? location.pathname.startsWith(item.path) : false,
              );
              const hasManualState = Object.prototype.hasOwnProperty.call(
                projectSectionState,
                sectionKey,
              );
              const sectionOpen = hasManualState
                ? Boolean(projectSectionState[sectionKey])
                : isChildActive;

              // Debug log to check sidebar items
              console.log('Sidebar section.items:', section.items);
              return (
                <React.Fragment key={sectionKey}>
                  {dividerBefore && (
                    <Divider className="!mx-4 !bg-gray-300 dark:!bg-gray-700" />
                  )}
                  <div className="relative mx-2 my-1">
                    <button
                      className={`flex w-full cursor-pointer items-center rounded-lg py-2 transition-all duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-700 ${
                        isChildActive
                          ? "bg-gray-300 font-medium hover:bg-gray-300 dark:bg-gray-800"
                          : ""
                      }`}
                      onClick={() => toggleSection(sectionKey, !sectionOpen)}
                    >
                      <div
                        className={`flex items-center ${
                          isOpen ? "pr-2 pl-5" : "pl-5"
                        } transition-all duration-300 ease-in-out`}
                      >
                        <span className="text-xl">{section.icon}</span>
                        <span
                          className={`ml-3 origin-left overflow-hidden text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${
                            isOpen
                              ? "max-w-[160px] scale-100 opacity-100"
                              : "max-w-0 scale-95 opacity-0"
                          }`}
                        >
                          {section.title}
                        </span>
                      </div>
                      {isOpen && (
                        <ExpandMore
                          className={`mr-4 ml-auto transition-transform duration-300 ${
                            sectionOpen ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      )}
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        sectionOpen && isOpen ? "max-h-[1000px]" : "max-h-0"
                      } flex flex-col gap-y-1 px-5 pt-1`}
                    >
                      {(section.items || []).map((item) => (
                        <NavLink
                          key={`${sectionKey}-${item.path}`}
                          to={item.path}
                          className={({ isActive }) =>
                            `block rounded-md px-3 py-2 text-sm transition-all duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-700 ${
                              isActive
                                ? "bg-gray-300 font-medium dark:bg-gray-800"
                                : ""
                            }`
                          }
                        >
                          {item.name}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                  {dividerAfter && (
                    <Divider className="!mx-4 !bg-gray-300 dark:!bg-gray-700" />
                  )}
                </React.Fragment>
              );
            }

            if (!section.path) {
              return null;
            }

            return (
              <React.Fragment key={sectionKey}>
                {dividerBefore && (
                  <Divider className="!mx-4 !my-2 !bg-gray-300 dark:!bg-gray-700" />
                )}
                <NavLink
                  to={section.path}
                  title={section.name}
                  className={({ isActive }) =>
                    `mx-2 flex items-center rounded-lg py-2 transition-all duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-700 ${
                      isActive ? "bg-gray-300 font-medium dark:bg-gray-800" : ""
                    }`
                  }
                >
                  <div
                    className={`flex items-center ${
                      isOpen ? "pr-2 pl-5" : "pl-5"
                    } transition-all duration-300 ease-in-out`}
                  >
                    <span className="text-xl">{section.icon}</span>
                    <span
                      className={`ml-3 origin-left overflow-hidden text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${
                        isOpen
                          ? "max-w-[160px] scale-100 opacity-100"
                          : "max-w-0 scale-95 opacity-0"
                      }`}
                    >
                      {section.name}
                    </span>
                  </div>
                </NavLink>
                {dividerAfter && (
                  <Divider className="!mx-4 !my-2 !bg-gray-300 dark:!bg-gray-700" />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer: Avatar + User Menu */}
        <div
          ref={userMenuContainerRef}
          className="relative"
          tabIndex={0}
          onBlur={(e) => {
            // Close ONLY if the next focused element is outside the container
            const next = e.relatedTarget;
            if (!e.currentTarget.contains(next)) {
              setUserMenuOpen(false);
            }
          }}
        >
          {/* Avatar + Username */}
          <button
            onClick={() => {
              if (!isOpen) {
                setIsOpen(true);
                setTimeout(() => setUserMenuOpen(true), 310); // wait for sidebar open transition
              } else {
                setUserMenuOpen((prev) => !prev);
              }
            }}
            className="flex w-full cursor-pointer items-center justify-start border-t border-gray-300 px-4 py-4 transition-all duration-300 dark:border-gray-700"
          >
            <Avatar className="h-9 w-9" />
            <span
              className={`ml-3 origin-left overflow-hidden text-sm font-semibold whitespace-nowrap transition-all duration-300 ease-in-out ${
                isOpen
                  ? "max-w-[160px] scale-100 opacity-100"
                  : "max-w-0 scale-95 opacity-0"
              }`}
            >
              {username || "Guest"}
            </span>
          </button>

          {/* Dropdown — only shown when sidebar is open AND userMenuOpen is true */}
          {userMenuOpen && isOpen && (
            <div
              className="animate-slide-in-left dark:bg-primary-dark absolute bottom-14 left-4 z-50 w-48 rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-700"
              tabIndex={-1}
            >
              <ul className="py-2 text-sm text-gray-700 dark:text-gray-100">
                <li>
                  <button
                    className="dark:hover:bg-secondary-dark block w-full cursor-pointer px-4 py-2 text-left hover:bg-gray-100"
                    type="button"
                    // Use onMouseDown to fire before blur
                    onMouseDown={handleProfileOpen}
                  >
                    Profile <PersonOutlinedIcon />
                  </button>
                </li>

                <li>
                  <div
                    className="dark:hover:bg-secondary-dark block w-full cursor-pointer px-4 text-left hover:bg-gray-100"
                    onClick={() => dispatch(toggleTheme())}
                  >
                    {theme == "dark" ? "Light " : "Dark "}
                    <IconButton
                      aria-label={
                        theme === "dark"
                          ? "Switch to light mode"
                          : "Switch to dark mode"
                      }
                      title={
                        theme === "dark"
                          ? "Switch to light mode"
                          : "Switch to dark mode"
                      }
                      className="cursor-pointer text-gray-800 dark:text-gray-200"
                    >
                      {theme === "dark" ? (
                        <LightMode className="text-gray-200" />
                      ) : (
                        <DarkMode />
                      )}
                    </IconButton>
                  </div>
                </li>
                <li>
                  <button
                    className="dark:hover:bg-secondary-dark block w-full cursor-pointer px-4 py-2 text-left hover:bg-gray-100"
                    type="button"
                    // Use onMouseDown to fire before blur
                    onMouseDown={handleLogoutClick}
                  >
                    Logout <LogoutOutlinedIcon />
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Logout Modal */}
      <CustomModal
        open={activeModal === "logout"}
        onClose={closeActiveModal}
        size="xs"
      >
        <div className="flex flex-col items-center gap-6 p-6 text-center">
          <h3 className="text-md font-semibold">
            Are you sure you want to logout ?
          </h3>
          <div className="flex gap-4">
            <Button
              variant="contained"
              color="error"
              onClick={handleLogoutConfirm}
              size="medium"
            >
              Logout
            </Button>
            <Button variant="outlined" size="medium" onClick={closeActiveModal}>
              Cancel
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* Profile Modal */}
      <CustomModal
        open={activeModal === "profile"}
        onClose={closeActiveModal}
        size="md"
      >
        <Profile />
      </CustomModal>
    </>
  );
};

export default Sidebar;
