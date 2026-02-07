import { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import constants from "../constants";
import { setActiveProject } from "../store";
import { OWNERS } from "../constants/owners";

const PROJECTS = [
  { id: "jiomart", label: "JioMart", logo: "/assets/jiomart_logo.svg" },
  {
    id: "jcp_jiomart",
    label: "JCP JioMart",
    logo: "/assets/jcp_jiomart_logo.svg",
  },
  { id: "jiomart_digital", label: "JMD", logo: "/assets/jmd_logo2.png" },
  {
    id: "wms",
    label: "WMS",
    logoDark: "/assets/wms_logo.png",
    logoLight: "/assets/wms_dark.png",
  },
  {
    id: "tms",
    label: "TMS",
    logoLight: "/assets/TMS_Dark.png",
    logoDark: "/assets/TMS_Light.png",
  },
  { id: "tira", label: "Tira", logo: "/assets/tira.svg" },
];

const EMPTY_PROJECTS = Object.freeze({});

const formatAccessLabel = (value, userEmail) => {
  const normalized =
    typeof value === "string"
      ? value.toLowerCase()
      : String(value ?? "").toLowerCase();
  if (!normalized) return "";

  const isOwner = userEmail && OWNERS.includes(userEmail);

  const mappings = {
    user: "Member",
    super_user: "Operations",
    admin: isOwner ? "Owner" : "Admin",
  };

  if (normalized in mappings) return mappings[normalized];
  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const SelectProject = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState("");

  const projects = useSelector(
    (state) => state.user?.user?.projects ?? EMPTY_PROJECTS,
  );
  const userEmail = useSelector((state) => state.user?.user?.user_email);
  const allowedIds = useMemo(() => Object.keys(projects), [projects]);

  const normalizedProjectData = useCallback(
    (projectKey) => {
      const mappedId = constants.project_ids[projectKey];
      const normalizedId =
        mappedId !== undefined && mappedId !== null
          ? String(mappedId)
          : undefined;
      return (
        projects?.[projectKey] ??
        (normalizedId !== undefined ? projects?.[normalizedId] : undefined)
      );
    },
    [projects],
  );

  const hasAccess = useCallback(
    (projectKey) => {
      const mappedId = constants.project_ids[projectKey];
      const normalizedId =
        mappedId !== undefined && mappedId !== null
          ? String(mappedId)
          : undefined;

      return (
        (normalizedId ? allowedIds.includes(normalizedId) : false) ||
        allowedIds.includes(projectKey)
      );
    },
    [allowedIds],
  );

  const getAccessLevel = useCallback(
    (projectKey) => {
      const projectData = normalizedProjectData(projectKey);
      const accessLevel =
        typeof projectData === "string"
          ? projectData
          : (projectData?.access_level ?? projectData?.accessLevel ?? null);
      return formatAccessLabel(accessLevel, userEmail);
    },
    [normalizedProjectData, userEmail],
  );

  const handleSelect = (projectKey) => {
    if (hasAccess(projectKey)) {
      const projectData = normalizedProjectData(projectKey);
      const accessLevel =
        typeof projectData === "string"
          ? projectData
          : (projectData?.access_level ?? projectData?.accessLevel ?? null);

      dispatch(setActiveProject({ projectKey, accessLevel }));
      navigate("/home");
    } else {
      enqueueSnackbar("You don't have access to this project", {
        variant: "warning",
      });
    }
  };

  // NEW: Only include accessible projects
  const accessibleProjects = useMemo(
    () => PROJECTS.filter((p) => hasAccess(p.id)),
    [hasAccess],
  );

  // Search within accessible projects only
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return accessibleProjects;
    return accessibleProjects.filter(
      (project) =>
        project.label.toLowerCase().includes(query) ||
        project.id.toLowerCase().includes(query),
    );
  }, [searchQuery, accessibleProjects]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f6f5ff] px-6 py-12 transition-colors duration-300 dark:bg-black">
      <div className="relative w-full max-w-lg scale-[0.95] overflow-hidden rounded-xl bg-white/90 p-1 shadow-[0_25px_70px_rgba(0,123,255,0.25)] ring-1 ring-white/60 backdrop-blur-xl transition-transform duration-300 dark:bg-neutral-900/80 dark:ring-white/10">
        <div className="rounded-xl bg-white p-8 dark:bg-neutral-900">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-12 w-12">
              <img
                src="/assets/white_fynd.svg"
                alt="Fynd Logo"
                className="block w-auto dark:hidden"
              />
              <img
                src="/assets/dark_fynd.svg"
                alt="Fynd Logo"
                className="hidden w-auto dark:block"
              />
            </div>
            <h1 className="font-fynd text-3xl font-semibold text-gray-900 dark:text-white">
              Choose Project
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select a project to continue
            </p>
          </div>

          {/* Search */}
          <label className="mt-8 flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-600 transition-colors focus-within:border-violet-400 focus-within:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
              />
            </svg>
            <input
              type="text"
              className="w-full bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white"
              placeholder="Search project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>

          {/* Project List (accessible only) */}
          <div className="mt-8 max-h-[45vh] space-y-4 overflow-y-auto pr-1">
            {filteredProjects.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                {accessibleProjects.length === 0
                  ? "No projects available for your account."
                  : `No projects match “${searchQuery}”.`}
              </p>
            ) : (
              filteredProjects.map((project) => {
                const accessLabel = getAccessLevel(project.id);
                const isScm = project.id === "wms" || project.id === "tms";

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleSelect(project.id)}
                    className="flex w-full cursor-pointer items-center gap-4 rounded-xl bg-white px-5 py-4 text-left text-base transition-colors hover:bg-gray-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  >
                    {/* Project Logo */}
                    {isScm ? (
                      <>
                        <img
                          src={project.logoLight}
                          alt={`${project.label} logo`}
                          className="block h-9 w-9 object-contain dark:hidden"
                          draggable={false}
                        />
                        <img
                          src={project.logoDark}
                          alt={`${project.label} logo`}
                          className="hidden h-9 w-9 object-contain dark:block"
                          draggable={false}
                        />
                      </>
                    ) : (
                      <img
                        src={project.logo}
                        alt={`${project.label} logo`}
                        className="h-9 w-9 object-contain"
                        draggable={false}
                      />
                    )}

                    {/* Project Info */}
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {project.label}
                      </span>
                      <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Access: {accessLabel || "Member"}
                      </span>
                    </div>

                    {/* Access Badge */}
                    <span className="rounded-sm bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {accessLabel || "Member"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectProject;
