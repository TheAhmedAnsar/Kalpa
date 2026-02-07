import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistReducer,
  persistStore,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import themeReducer, { toggleTheme, setTheme } from "./theme";
import workflowReducer, {
  setPanel1Selection,
  completePanel1,
  setUploadedFile,
  verifyFile,
  resetUploadedFile,
  completePanel2,
  setUpdateOption,
  setScheduleDateTime,
  setSubmitting,
  goBackToPanel1,
  goBackToPanel2,
  resetWorkflow,
} from "./workflow";
import networkReducer, {
  setVertical,
  setFile,
  setPincodes,
  setStores,
  resetNetwork,
} from "./network";
import userReducer, {
  setUser,
  setAccessToken,
  setActiveProject,
  clearUser,
  selectUser,
  selectUserProjects,
  selectHasUserProjects,
  selectAccessToken,
  selectIsAuthenticated,
  selectUsername,
  selectAccessLevel,
  selectActiveProject,
  selectActiveProjectAccessLevel,
  selectProjectFeatureAccessMap,
  selectActiveProjectFeatureAccess,
  selectUserEmail,
} from "./user";
import { encryptPersistData, decryptPersistData } from "../utils/secureStorage";

const rootReducer = combineReducers({
  theme: themeReducer,
  workflow: workflowReducer,
  network: networkReducer,
  user: userReducer,
});

const userTransform = createTransform(
  (inboundState) => {
    if (!inboundState || typeof inboundState !== "object") {
      return inboundState;
    }

    const payload = {
      user: inboundState.user ?? null,
      activeProject: inboundState.activeProject ?? null,
      activeProjectAccessLevel: inboundState.activeProjectAccessLevel ?? null,
    };

    return {
      encrypted: encryptPersistData(payload),
      accessToken: inboundState.accessToken ?? null,
    };
  },
  (outboundState) => {
    if (!outboundState || typeof outboundState !== "object") {
      return {
        user: null,
        activeProject: null,
        accessToken: null,
      };
    }

    // Handle legacy persisted state that stored plain objects
    if (outboundState.user && typeof outboundState.user === "object") {
      return {
        user: outboundState.user,
        activeProject: outboundState.activeProject ?? null,
        activeProjectAccessLevel:
          outboundState.activeProjectAccessLevel ?? null,
        accessToken: outboundState.accessToken ?? null,
      };
    }

    const encryptedPayload =
      outboundState.encrypted ||
      outboundState.encryptedUser ||
      outboundState.encryptedUserData ||
      null;

    const decrypted = decryptPersistData(encryptedPayload);

    return {
      user: decrypted?.user ?? null,
      activeProject: decrypted?.activeProject ?? null,
      activeProjectAccessLevel: decrypted?.activeProjectAccessLevel ?? null,
      accessToken: outboundState.accessToken ?? null,
    };
  },
  { whitelist: ["user"] },
);

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["user"],
  transforms: [userTransform],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredPaths: ["register"],
      },
    }),
});

const persistor = persistStore(store);

// Persist theme changes to localStorage
store.subscribe(() => {
  const theme = store.getState().theme.value;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("theme", theme);
  }
});

export {
  toggleTheme,
  setTheme,
  setPanel1Selection,
  completePanel1,
  setUploadedFile,
  verifyFile,
  resetUploadedFile,
  completePanel2,
  setUpdateOption,
  setScheduleDateTime,
  setSubmitting,
  goBackToPanel1,
  goBackToPanel2,
  resetWorkflow,
  setVertical,
  setFile,
  setPincodes,
  setStores,
  resetNetwork,
  setUser,
  setAccessToken,
  setActiveProject,
  clearUser,
  selectUser,
  selectUserProjects,
  selectHasUserProjects,
  selectAccessToken,
  selectIsAuthenticated,
  selectUsername,
  selectAccessLevel,
  selectActiveProject,
  selectActiveProjectAccessLevel,
  selectProjectFeatureAccessMap,
  selectActiveProjectFeatureAccess,
  selectUserEmail,
};
export { persistor };
export default store;
