import { createSlice } from "@reduxjs/toolkit";

const normalizeProjects = (projects) => {
  if (!projects || typeof projects !== "object") return {};
  return Object.entries(projects).reduce((acc, [projectKey, accessLevel]) => {
    if (!projectKey) return acc;
    const normalizedKey = String(projectKey).trim();
    if (!normalizedKey) return acc;
    let normalizedAccess;
    if (typeof accessLevel === "string") {
      normalizedAccess = accessLevel.trim();
    } else if (accessLevel == null) {
      normalizedAccess = null;
    } else {
      normalizedAccess = String(accessLevel).trim();
    }

    acc[normalizedKey] = normalizedAccess || null;
    return acc;
  }, {});
};

const normalizeFeatureFlag = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return !Number.isNaN(value) && value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (["true", "yes", "y", "allow", "allowed", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "n", "deny", "denied", "off"].includes(normalized)) {
      return false;
    }
    const numericValue = Number(normalized);
    return !Number.isNaN(numericValue) && numericValue !== 0;
  }

  if (value == null) {
    return false;
  }

  return Boolean(value);
};

const normalizeFeatureAccessMap = (features) => {
  if (!features || typeof features !== "object") {
    return {};
  }

  return Object.entries(features).reduce(
    (featureAcc, [featureKey, rawFlag]) => {
      if (!featureKey) {
        return featureAcc;
      }

      const normalizedKey = String(featureKey).trim();
      if (!normalizedKey) {
        return featureAcc;
      }

      featureAcc[normalizedKey] = normalizeFeatureFlag(rawFlag);
      return featureAcc;
    },
    {},
  );
};

const normalizeProjectFeatureAccess = (accessLevels) => {
  if (!accessLevels || typeof accessLevels !== "object") {
    return {};
  }

  return Object.entries(accessLevels).reduce(
    (projectAcc, [projectKey, projectFeatures]) => {
      if (!projectKey) {
        return projectAcc;
      }

      const normalizedKey = String(projectKey).trim();
      if (!normalizedKey) {
        return projectAcc;
      }

      projectAcc[normalizedKey] = normalizeFeatureAccessMap(projectFeatures);
      return projectAcc;
    },
    {},
  );
};

const normalizeUser = (user) => {
  if (!user || typeof user !== "object") return null;
  const email = user.email ?? user.user_email ?? null;
  const projectFeatureAccess = normalizeProjectFeatureAccess(
    user.sidebar_config ?? user.access_level ?? user.projectAccess ?? null,
  );
  return {
    ...user,
    email,
    user_email: user.user_email ?? email ?? null,
    username: user.username ?? user.name ?? user.user_name ?? "",
    projects: normalizeProjects(user.projects),
    projectAccess: projectFeatureAccess,
  };
};

const resolveAccessToken = (payload = {}) => {
  if (!payload || typeof payload !== "object") return null;
  const { accessToken, token, access_token: snakeCaseToken } = payload;
  return accessToken ?? token ?? snakeCaseToken ?? null;
};

const userSlice = createSlice({
  name: "user",
  initialState: {
    user: null,
    accessToken: null,
    activeProject: null,
    activeProjectAccessLevel: null,
  },
  reducers: {
    setUser(state, action) {
      const payload = action.payload ?? {};
      const prevActiveProject = state.activeProject;
      const normalizedUser = normalizeUser(payload.user ?? null);
      state.user = normalizedUser;
      state.accessToken = resolveAccessToken(payload);

      if (!normalizedUser) {
        state.activeProject = null;
        state.activeProjectAccessLevel = null;
        return;
      }

      const userProjects = normalizedUser.projects ?? {};
      let nextActiveProject =
        payload.activeProject ?? prevActiveProject ?? null;

      if (typeof nextActiveProject === "number") {
        nextActiveProject = String(nextActiveProject);
      }
      if (typeof nextActiveProject === "string") {
        nextActiveProject = nextActiveProject.trim() || null;
      }

      if (nextActiveProject && !userProjects[nextActiveProject]) {
        nextActiveProject = null;
      }

      state.activeProject = nextActiveProject;
      state.activeProjectAccessLevel = nextActiveProject
        ? (payload.activeProjectAccessLevel ??
          userProjects[nextActiveProject] ??
          null)
        : null;
    },
    setAccessToken(state, action) {
      state.accessToken = resolveAccessToken(action.payload ?? {});
    },
    setActiveProject(state, action) {
      const { projectKey, accessLevel = null } = action.payload || {};
      if (!projectKey) {
        state.activeProject = null;
        state.activeProjectAccessLevel = null;
        return;
      }

      const normalizedKey = String(projectKey).trim();
      if (!normalizedKey) {
        state.activeProject = null;
        state.activeProjectAccessLevel = null;
        return;
      }
      state.activeProject = normalizedKey;
      state.activeProjectAccessLevel =
        accessLevel ?? state.user?.projects?.[normalizedKey] ?? null;
    },
    clearUser(state) {
      state.user = null;
      state.accessToken = null;
      state.activeProject = null;
      state.activeProjectAccessLevel = null;
    },
  },
});

export const { setUser, setActiveProject, clearUser, setAccessToken } =
  userSlice.actions;

// Selectors
export const selectUser = (state) => state.user.user;
export const selectUserEmail = (state) => state.user.user?.user_email;
export const selectUserProjects = (state) => selectUser(state)?.projects ?? {};
export const selectHasUserProjects = (state) =>
  Object.keys(selectUserProjects(state)).length > 0;
export const selectAccessToken = (state) => state.user.accessToken;
export const selectIsAuthenticated = (state) =>
  Boolean(selectAccessToken(state) && selectHasUserProjects(state));
export const selectUsername = (state) => selectUser(state)?.username;
export const selectActiveProject = (state) => state.user.activeProject;
export const selectActiveProjectAccessLevel = (state) => {
  const activeProject = selectActiveProject(state);
  if (!activeProject) {
    return state.user.activeProjectAccessLevel ?? null;
  }
  return (
    state.user.activeProjectAccessLevel ??
    selectUserProjects(state)[activeProject] ??
    null
  );
};
export const selectAccessLevel = selectActiveProjectAccessLevel;
export const selectProjectFeatureAccessMap = (state) =>
  selectUser(state)?.projectAccess ?? {};
export const selectActiveProjectFeatureAccess = (state) => {
  const activeProject = selectActiveProject(state);
  if (!activeProject) {
    return {};
  }
  const projectAccess = selectProjectFeatureAccessMap(state);
  return projectAccess[activeProject] ?? {};
};

export default userSlice.reducer;
