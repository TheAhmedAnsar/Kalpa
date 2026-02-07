import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { SnackbarProvider } from "notistack";
import { PersistGate } from "redux-persist/integration/react";
import "./index.css";
import App from "./App.jsx";
import store, { persistor } from "./store";
import SnackbarBridge from "./components/SnackbarBridge";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: "center", horizontal: "top" }}
          preventDuplicate
        >
          <SnackbarBridge />
          <App />
        </SnackbarProvider>
      </PersistGate>
    </Provider>
  </StrictMode>,
);
