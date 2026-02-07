import axios from "axios";
import store, {
  selectAccessToken,
  selectIsAuthenticated,
  setAccessToken,
  clearUser,
  resetNetwork,
  resetWorkflow,
  persistor,
} from "../store";
import { saveRefreshTokenFromHeaders, clearRefreshToken } from "./token";
import { enqueueGlobalSnackbar } from "../utils/snackbar";

const URL = "https://deku-a52b1be2.serverless.boltic.app";
// const URL = "http://localhost:8173";

const apiClient = axios.create({
  baseURL: URL,
  withCredentials: true,
});

const WORKFLOW_IDS = ["laneTat", "rvsl", "serviceability", "stores"];
let logoutInProgress = false;

const handleUnauthorized = () => {
  if (logoutInProgress) {
    return;
  }

  const state = store.getState();
  if (!selectIsAuthenticated(state)) {
    return;
  }

  logoutInProgress = true;
  store.dispatch(clearUser());
  store.dispatch(resetNetwork());
  WORKFLOW_IDS.forEach((workflowId) => {
    store.dispatch(resetWorkflow(workflowId));
  });
  clearRefreshToken();
  persistor.purge();
  enqueueGlobalSnackbar("Session expired. Logging you out.", {
    variant: "warning",
  });

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

apiClient.interceptors.request.use((config) => {
  if (config?.skipAuth) {
    return config;
  }
  const accessToken = selectAccessToken(store.getState());
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

const persistTokensFromHeaders = (headers) => {
  if (!headers) return;

  const normalizedHeaders = Object.entries(headers).reduce(
    (acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    },
    {},
  );

  const newAccessToken = normalizedHeaders["x-access-token"];
  if (newAccessToken) {
    const token = Array.isArray(newAccessToken)
      ? newAccessToken[0]
      : newAccessToken;
    store.dispatch(setAccessToken({ accessToken: token }));
  }

  saveRefreshTokenFromHeaders(headers);
};

apiClient.interceptors.response.use(
  (response) => {
    persistTokensFromHeaders(response?.headers);
    if (response?.data?.success === false) {
      const msg =
        response?.data?.error ||
        response?.data?.message ||
        "Request failed. Please try again.";
      enqueueGlobalSnackbar(msg, { variant: "error" });
    }
    return response;
  },
  (error) => {
    persistTokensFromHeaders(error?.response?.headers);
    if (error?.response?.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
