import React, { useState, useEffect } from "react";
import OtpModal from "../components/Login/OtpModal";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { enqueueSnackbar } from "notistack";
import LoadingDots from "../assets/LoadingDots";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useDispatch, useSelector } from "react-redux";
import { selectIsAuthenticated, setUser } from "../store";
import { saveRefreshTokenFromHeaders } from "../api/token";

const lightTheme = createTheme({
  palette: { mode: "light" }, // force MUI light mode here
});

const Login = () => {
  const [useOtp, setUseOtp] = useState(true); // OTP vs Password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // for password mode
  const [error, setError] = useState(""); // email error
  const [pwdError, setPwdError] = useState(""); // password error
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Derived disabled state for the submit button
  const isEmailValid = email && emailRegex.test(email);
  const isPasswordValid = useOtp || (password && password.length >= 6);
  const isSubmitDisabled = loading || !isEmailValid || !isPasswordValid;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const activeProject = useSelector((state) => state.user.activeProject);

  // Redirect authenticated users away from the login page
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeProject) {
      navigate("/home", { replace: true });
    } else {
      navigate("/projects", { replace: true });
    }
  }, [isAuthenticated, activeProject, navigate]);

  const validate = () => {
    let ok = true;

    // email validation
    if (!email) {
      setError("Email is required");
      ok = false;
    } else if (!emailRegex.test(email)) {
      setError("Enter a valid email");
      ok = false;
    } else {
      setError("");
    }

    // password validation only in password mode
    if (!useOtp) {
      if (!password) {
        setPwdError("Password is required");
        ok = false;
      } else if (password.length < 6) {
        setPwdError("Password must be at least 6 characters");
        ok = false;
      } else {
        setPwdError("");
      }
    } else {
      setPwdError("");
    }

    return ok;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (useOtp) {
        const response = await apiClient.post("/__deku/api/v1/login", {
          email: email,
          auth_type: "otp",
        });
        if (response.data.success) {
          enqueueSnackbar("OTP sent to your email", { variant: "success" });
          setShowOtpModal(true);
        } else if (response.data.error === "Account does not exists") {
          enqueueSnackbar("Account does not exist", { variant: "error" });
        } else if (response.data.error === "Account is not whitelisted") {
          enqueueSnackbar("Account is not whitelisted", { variant: "error" });
        } else if (response.data.error === "Email is not registered"){
          enqueueSnackbar("Email is not registered", { variant: "error" });
        } else {
          enqueueSnackbar("Something went wrong", { variant: "error" });
        }
      } else {
        const response = await apiClient.post("/__deku/api/v1/login", {
          email: email,
          auth_type: "pass",
          password: password,
        });
        if (response.data.success) {
          dispatch(setUser(response.data));
          saveRefreshTokenFromHeaders(response.headers);
          enqueueSnackbar("Logged in successfully", { variant: "success" });
        } else {
          enqueueSnackbar(response.data.error, { variant: "error" });
        }
      }
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || "Network error", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (otp) => {
    setLoading(true);
    try {
      const response = await apiClient.post("/__deku/api/v1/login", {
        email: email,
        auth_type: "otp",
        otp: otp,
      });
      if (response.data.success) {
        dispatch(setUser(response.data));
        saveRefreshTokenFromHeaders(response.headers);
        enqueueSnackbar("Logged in successfully", { variant: "success" });
      } else {
        enqueueSnackbar(response.data.error, { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || "Network error", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Shared underline styles — fixed for light mode (no theme.mode branching)
  const inputSlotProps = {
    formHelperText: { sx: { minHeight: "1.25rem", m: 0, mt: 0.5 } },
    input: {
      sx: {
        "&:before": {
          borderBottomColor: "rgba(0,0,0,0.23)",
        },
        "&:hover:not(.Mui-disabled, .Mui-error):before": {
          borderBottomWidth: "1px",
        },
        "&:after": {
          borderBottomColor: "#1976d2", // MUI default primary.main (light)
        },
        "&.Mui-error:after": { borderBottomColor: "#d32f2f" },
        "& .MuiInput-input": { fontSize: "1rem", padding: "8px 0" },
      },
    },
  };

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <div
        className="relative min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/background-image.jpg')" }}
        data-theme="light" // force Tailwind light variant inside this page
      >
        {/* Dim background only (no dark variant) */}
        <div className="pointer-events-none absolute inset-0 bg-black/40" />

        {/* Centered content */}
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg bg-white/95 p-8 text-gray-900 shadow-2xl backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center gap-2">
              <img
                src="/assets/fynd_logo_name.png"
                alt="Fynd Logo"
                className="w-32 drop-shadow-lg"
              />
              <h2 className="font-fynd mb-6 text-2xl font-bold text-gray-900">
                Login to continue
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Email */}
              <TextField
                label="Email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="name@gofynd.com"
                autoComplete="email"
                variant="standard"
                fullWidth
                required
                error={Boolean(error)}
                helperText={error || " "}
                slotProps={inputSlotProps}
                disabled={loading}
              />

              {/* Password (smooth expand/collapse; kept mounted) */}
              <div
                className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out ${
                  useOtp ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
                }`}
              >
                <div
                  className={`min-h-0 overflow-hidden transition-opacity duration-300 ${
                    useOtp ? "pointer-events-none opacity-0" : "opacity-100"
                  }`}
                >
                  <TextField
                    label="Password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPwdError("");
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    variant="standard"
                    fullWidth
                    required
                    disabled={useOtp || loading} // prevent tab focus while hidden and while loading
                    error={Boolean(pwdError)}
                    helperText={pwdError || " "}
                    slotProps={{
                      ...inputSlotProps,
                      input: {
                        ...inputSlotProps.input,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword((v) => !v)}
                              aria-label="toggle password visibility"
                              edge="end"
                              size="small"
                              disabled={loading}
                            >
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </div>
              </div>

              {/* Compact right-aligned toggle ABOVE the button */}
              <div className="flex w-full items-center justify-between">
                <div
                  role="radiogroup"
                  aria-label="Login method"
                  className="relative ml-auto w-36 rounded-md border border-gray-300 bg-white p-0.5 shadow-sm sm:w-44"
                >
                  {/* sliding highlight */}
                  <span
                    aria-hidden="true"
                    className="absolute top-[2px] bottom-[2px] rounded-[6px] bg-black/90 transition-all duration-300 ease-in-out"
                    style={{
                      left: useOtp ? "2px" : "calc(50% + 2px)",
                      width: "calc(50% - 4px)",
                    }}
                  />
                  <div className="grid grid-cols-2 text-xs font-semibold">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={useOtp}
                      onClick={() => !loading && setUseOtp(true)}
                      className={`relative z-10 cursor-pointer rounded-[6px] px-2 py-1 transition-colors ${
                        useOtp
                          ? "text-white"
                          : "text-gray-700 hover:text-gray-900"
                      } ${loading ? "pointer-events-none opacity-60" : ""}`}
                      disabled={loading}
                    >
                      OTP
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!useOtp}
                      onClick={() => !loading && setUseOtp(false)}
                      className={`relative z-10 cursor-pointer rounded-[6px] px-2 py-1 transition-colors ${
                        !useOtp
                          ? "text-white"
                          : "text-gray-700 hover:text-gray-900"
                      } ${loading ? "pointer-events-none opacity-60" : ""}`}
                      disabled={loading}
                    >
                      Password
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitDisabled}
                aria-busy={loading}
                aria-disabled={isSubmitDisabled}
                className={`font-fynd mt-2 flex w-full justify-center rounded-md py-2 text-white shadow transition-colors duration-300 ease-in-out focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSubmitDisabled
                    ? "bg-gray-500"
                    : "bg-black hover:cursor-pointer hover:bg-[#008ecc]"
                } focus:ring-black/40`}
              >
                {loading ? (
                  <LoadingDots text={useOtp ? "Sending OTP" : "Logging in"} />
                ) : useOtp ? (
                  "Send OTP"
                ) : (
                  "Login"
                )}
              </button>
            </form>

            <div className="font-fynd mt-5 flex justify-center gap-1 text-xs">
              Don't have account ?
              <Link
                to="/signup"
                className="cursor-pointer transition duration-200 ease-in-out hover:text-[#008ecc]"
              >
                Signup now
              </Link>
            </div>
          </div>
        </div>

        {/* OTP Modal for OTP flow */}
        <OtpModal
          open={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          onVerify={onVerify}
        />
      </div>
    </ThemeProvider>
  );
};

export default Login;
