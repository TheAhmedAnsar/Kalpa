import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setTheme,
  selectActiveProject,
  selectAccessLevel,
  selectIsAuthenticated,
  selectActiveProjectFeatureAccess,
} from "./store";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import StatusBar from "./components/StatusBar";
import SelectProject from "./pages/SelectProject";
import { Users } from "./pages/Users";
import {
  ADMIN_ACCESS_LEVEL,
  isAdminAccessLevel,
  normalizeAccessLevel,
} from "./utils/accessLevels";
import PROJECT_FEATURES from "./constants/projectFeatures";
import BolticBadge from "./components/BolticBadge";
import NotFound from "./pages/NotFound";

const AppRoutes = () => {
  const location = useLocation();
  const activeProject = useSelector(selectActiveProject);
  const accessLevel = useSelector(selectAccessLevel);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const projectFeatureAccess = useSelector(selectActiveProjectFeatureAccess);
  const authPaths = ["/signup", "/login", "/projects"];
  const showSidebar = !authPaths.includes(location.pathname);
  const showStatusBar = !authPaths.includes(location.pathname);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const normalizedAccessLevel = normalizeAccessLevel(accessLevel);
  const isAdminUser = isAdminAccessLevel(accessLevel);
  const handleMainClick = () => {
    if (isSidebarOpen) {
      setSidebarOpen(false);
    }
  };

  const projectFeatureConfig =
    (activeProject && PROJECT_FEATURES[activeProject]) || [];
  const hasFeatureFlags =
    projectFeatureAccess &&
    typeof projectFeatureAccess === "object" &&
    Object.keys(projectFeatureAccess).length > 0;
  const activeProjectRoutes = Array.isArray(projectFeatureConfig)
    ? projectFeatureConfig.flatMap((feature) => {
        if (!feature?.routes) {
          return [];
        }
        if (!feature.featureKey || !hasFeatureFlags) {
          return feature.routes;
        }
        return projectFeatureAccess?.[feature.featureKey] ? feature.routes : [];
      })
    : [];
  const hasProjectRoutes = activeProjectRoutes.length > 0;

  const getProtectedElement = (
    element,
    { requireProject = true, allowedProjects, requiredAccessLevels } = {},
  ) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (requireProject && !activeProject) {
      return <Navigate to="/projects" replace />;
    }

    if (
      allowedProjects &&
      allowedProjects.length > 0 &&
      (!activeProject || !allowedProjects.includes(activeProject)) &&
      !isAdminUser
    ) {
      return <Navigate to="/home" replace />;
    }

    if (requiredAccessLevels && requiredAccessLevels.length > 0) {
      const normalizedRequiredLevels = requiredAccessLevels
        .map((level) => normalizeAccessLevel(level))
        .filter((level) => level != null);

      const hasRequiredAccess = normalizedRequiredLevels.length
        ? normalizedAccessLevel != null &&
          normalizedRequiredLevels.includes(normalizedAccessLevel)
        : requiredAccessLevels.includes(accessLevel);

      if (!hasRequiredAccess) {
        return <Navigate to="/home" replace />;
      }
    }

    return element;
  };

  const renderProjectRoutes = () => {
    if (!activeProject || !hasProjectRoutes) return null;

    return activeProjectRoutes.map((route) => (
      <Route
        key={route.path}
        path={route.path}
        element={getProtectedElement(route.element, {
          allowedProjects: route.projects,
          requiredAccessLevels: route.requiredAccessLevels,
        })}
      >
        {route.children?.map((child) => (
          <Route
            key={`${route.path}-${child.path}`}
            path={child.path}
            element={getProtectedElement(child.element, {
              allowedProjects: child.projects ?? route.projects,
              requiredAccessLevels:
                child.requiredAccessLevels ?? route.requiredAccessLevels,
            })}
          />
        ))}
      </Route>
    ));
  };

  const redirectAuthenticatedUser = () => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (!activeProject) {
      return <Navigate to="/projects" replace />;
    }
    if (!hasProjectRoutes) {
      return <Navigate to="/projects" replace />;
    }
    return <Navigate to="/home" replace />;
  };

  return (
    <>
      <div
        className={`dark:bg-primary-dark flex h-screen overflow-hidden bg-gray-50 transition-all duration-300 ${
          showSidebar ? (isSidebarOpen ? "pl-56" : "pl-20") : ""
        }`}
      >
        {/* Sidebar remains on the left, not pushed down */}
        {showSidebar && (
          <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
        )}

        {/* Right side: StatusBar on top, Routes below */}
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onClick={handleMainClick}
        >
          {showStatusBar && <StatusBar />}
          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route
                path="/signup"
                element={
                  isAuthenticated ? (
                    activeProject ? (
                      <Navigate to="/home" replace />
                    ) : (
                      <Navigate to="/projects" replace />
                    )
                  ) : (
                    <Signup />
                  )
                }
              />
              <Route
                path="/login"
                element={
                  isAuthenticated ? (
                    activeProject ? (
                      <Navigate to="/home" replace />
                    ) : (
                      <Navigate to="/projects" replace />
                    )
                  ) : (
                    <Login />
                  )
                }
              />
              <Route
                path="/projects"
                element={
                  !isAuthenticated ? (
                    <Navigate to="/login" replace />
                  ) : (
                    <SelectProject />
                  )
                }
              />
              <Route
                path="/users"
                element={getProtectedElement(<Users />, {
                  requireProject: false,
                  requiredAccessLevels: [ADMIN_ACCESS_LEVEL],
                })}
              />
              <Route path="/" element={redirectAuthenticatedUser()} />
              {renderProjectRoutes()}
              <Route
                path="*"
                element={
                  isAuthenticated ? <NotFound /> : redirectAuthenticatedUser()
                }
              />
            </Routes>
          </div>
        </div>
      </div>
      {isAuthenticated && <BolticBadge />}
    </>
  );
};

const App = () => {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.theme.value);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (savedTheme) {
      dispatch(setTheme(savedTheme));
    } else if (systemPrefersDark) {
      dispatch(setTheme("dark"));
    }
  }, [dispatch]);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const prefix = "/kalpa";
    const { pathname, search, hash } = window.location;
    if (!pathname.startsWith(prefix)) {
      window.location.replace(`${prefix}${pathname}${search}${hash}`);
    }
  }, []);

  return (
    <Router basename="/kalpa">
      <AppRoutes />
    </Router>
  );
};

export default App;
