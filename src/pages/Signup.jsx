import React, { useState, useEffect } from "react";
import OtpModal from "../components/Login/OtpModal";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";
import TaskAlt from "@mui/icons-material/TaskAlt";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Input,
  FormHelperText,
  FormControlLabel,
  InputAdornment,
  IconButton,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CustomModal from "../components/CustomModal";
import ConfimationModal from "../components/Login/ConfimationModal";
import apiClient from "../api/client";
import { enqueueSnackbar } from "notistack";
import LoadingDots from "../assets/LoadingDots";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../store";
import { useNavigate } from "react-router-dom";

const lightTheme = createTheme({
  palette: { mode: "light" }, // force MUI light mode on this page
});

const Signup = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    projects: [],
    requestAccess: "",
  });

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const projectOptions = [
    { value: "jiomart", label: "JioMart" },
    { value: "jiomart_digital", label: "JMD" },
    { value: "tira", label: "Tira" },
    { value: "wms", label: "WMS" },
    { value: "tms", label: "TMS" },
  ];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const isUsernameValid = Boolean(formData.username);
  const isEmailValid =
    Boolean(formData.email) && emailRegex.test(formData.email);
  const isPasswordValid =
    Boolean(formData.password) && formData.password.length >= 6;
  const isProjectsValid =
    Array.isArray(formData.projects) && formData.projects.length > 0;
  const isAccessValid = Boolean(formData.requestAccess);
  const isTermsValid = acceptedTerms;

  const isFormValid =
    isUsernameValid &&
    isEmailValid &&
    isPasswordValid &&
    isProjectsValid &&
    isAccessValid &&
    isTermsValid;

  const isSubmitDisabled = loading || !isFormValid;

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const activeProject = useSelector((state) => state.user.activeProject);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeProject) {
      navigate("/home", { replace: true });
    } else {
      navigate("/projects", { replace: true });
    }
  }, [isAuthenticated, activeProject, navigate]);

  const validate = () => {
    const err = {};

    if (!isUsernameValid) err.username = "Username is required";
    if (!formData.email) err.email = "Email is required";
    else if (!isEmailValid) err.email = "Enter a valid email";

    if (!formData.password) err.password = "Password is required";
    else if (!isPasswordValid)
      err.password = "Password must be at least 6 characters";

    if (!isProjectsValid) err.projects = "Select at least one project";
    if (!isAccessValid) err.requestAccess = "Select access type";
    if (!isTermsValid)
      err.acceptedTerms = "You must accept the Terms & Conditions";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "projects") {
      const selected = typeof value === "string" ? value.split(",") : value;
      setFormData((prev) => ({ ...prev, projects: selected }));
      setErrors((prev) => ({ ...prev, projects: "" }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const projectsPayload = formData.projects.reduce((acc, project) => {
        acc[project] = formData.requestAccess;
        return acc;
      }, {});

      const response = await apiClient.post("/__deku/api/v1/signup", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        projects: projectsPayload,
      });
      if (response.data.success) {
        enqueueSnackbar("OTP sent to your email", { variant: "success" });
        setShowOtpModal(true);
      } else if (response.data.error === "email is already registered") {
        enqueueSnackbar("Email is already registered", { variant: "error" });
      } else {
        const error = response.data.error || "Something went wrong";
        enqueueSnackbar(error, { variant: "error" });
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
    try {
      const projectsPayload = formData.projects.reduce((acc, project) => {
        acc[project] = formData.requestAccess;
        return acc;
      }, {});

      const response = await apiClient.post("/__deku/api/v1/signup", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        projects: projectsPayload,
        otp: otp,
      });
      if (response.data.success) {
        enqueueSnackbar("Signup successful", { variant: "success" });
        setShowOtpModal(false);
        setShowConfirmationModal(true);
        navigate("/login");
      } else {
        enqueueSnackbar(response.data.error, { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || "Network error", {
        variant: "error",
      });
    }
  };

  // MUI underline/styles fixed for light mode (no theme.mode branching)
  const inputSlotProps = {
    input: {
      sx: {
        "&:before": {
          borderBottomColor: "rgba(0,0,0,0.23)",
        },
        "&:hover:not(.Mui-disabled, .Mui-error):before": {
          borderBottomWidth: "1px",
        },
        "&:after": {
          borderBottomColor: "#1976d2", // default MUI primary.main (light)
        },
        "&.Mui-error:after": { borderBottomColor: "#d32f2f" },
        "& .MuiInput-input": { fontSize: "1rem", padding: "2px 0" },
      },
    },
    formHelperText: { sx: { minHeight: "0.25rem", m: 0, mt: 0.25 } },
  };

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <div
        className="relative min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/background-image.jpg')" }}
        data-theme="light"
      >
        {/* dim overlay (no dark variant) */}
        <div className="pointer-events-none absolute inset-0 bg-black/40" />

        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
          {/* card (no dark variants) */}
          <div className="w-full max-w-lg rounded-lg bg-white/95 px-5 py-5 text-gray-900 shadow-xl backdrop-blur-sm sm:px-6 sm:py-5">
            {/* header */}
            <div className="justify-left mb-2 flex w-full flex-col items-center gap-4">
              <img
                src="/assets/fynd_logo_name.png"
                alt="Fynd Logo"
                className="w-32 drop-shadow-lg"
              />
              <div className="font-fynd flex w-full flex-col items-start gap-1">
                <h2 className="mt-1 text-2xl text-gray-900">Signup Today</h2>
                <p className="text-sm">Get started,</p>
                <p className="text-sm">
                  Make operations and management a breeze!
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-1">
              {/* Username */}
              <TextField
                label="Username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="Your name"
                variant="standard"
                fullWidth
                required
                margin="dense"
                error={Boolean(errors.username)}
                helperText={errors.username || " "}
                slotProps={inputSlotProps}
                disabled={loading}
              />

              {/* Email */}
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                variant="standard"
                fullWidth
                required
                margin="dense"
                error={Boolean(errors.email)}
                helperText={errors.email || " "}
                slotProps={inputSlotProps}
                disabled={loading}
              />

              {/* Password */}
              <TextField
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter a strong password"
                autoComplete="new-password"
                variant="standard"
                fullWidth
                required
                margin="dense"
                error={Boolean(errors.password)}
                helperText={errors.password || " "}
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
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                disabled={loading}
              />

              {/* Projects (multiple) */}
              <FormControl
                fullWidth
                error={Boolean(errors.projects)}
                variant="standard"
                margin="dense"
                sx={{ "& .MuiInputBase-root": { fontSize: "1rem", py: 0 } }}
                disabled={loading}
              >
                <InputLabel id="projects-label">Projects*</InputLabel>
                <Select
                  labelId="projects-label"
                  multiple
                  name="projects"
                  value={formData.projects}
                  onChange={handleChange}
                  variant="standard"
                  input={<Input />}
                  sx={{ "& .MuiSelect-select": { py: 0.25 } }}
                  renderValue={(selected) =>
                    projectOptions
                      .filter((o) => selected.includes(o.value))
                      .map((o) => o.label)
                      .join(", ")
                  }
                  disabled={loading}
                >
                  {projectOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      sx={{ fontSize: "1.05rem", py: 0.75 }}
                    >
                      <Checkbox
                        checked={formData.projects.indexOf(option.value) > -1}
                        size="small"
                        sx={{
                          mr: 1,
                          p: 0.25,
                          "& .MuiSvgIcon-root": { fontSize: 20 },
                        }}
                        disabled={loading}
                      />
                      <ListItemText
                        primary={option.label}
                        primaryTypographyProps={{ fontSize: "1.05rem" }}
                      />
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText sx={{ minHeight: "0.25rem", m: 0, mt: 0.25 }}>
                  {errors.projects || " "}
                </FormHelperText>
              </FormControl>

              {/* Request Access */}
              <TextField
                select
                label="Request Access"
                name="requestAccess"
                value={formData.requestAccess}
                onChange={handleChange}
                variant="standard"
                fullWidth
                required
                margin="dense"
                error={Boolean(errors.requestAccess)}
                helperText={errors.requestAccess || " "}
                slotProps={inputSlotProps}
                sx={{ "& .MuiInputBase-root": { fontSize: "1rem", py: 0 } }}
                disabled={loading}
              >
                <MenuItem value="user">Viewer</MenuItem>
                <MenuItem value="super_user">Operations</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>

              {/* Terms & Conditions */}
              <div className="mt-2">
                <FormControl
                  error={Boolean(errors.acceptedTerms)}
                  component="fieldset"
                  variant="standard"
                  sx={{ m: 0 }}
                >
                  <FormControlLabel
                    sx={{
                      m: 0,
                      ml: 0,
                      alignItems: "center",
                      "& .MuiFormControlLabel-label": { fontSize: "0.875rem" },
                    }}
                    control={
                      <Checkbox
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          setErrors((prev) => ({ ...prev, acceptedTerms: "" }));
                        }}
                        size="small"
                        icon={<RadioButtonUnchecked fontSize="medium" />}
                        checkedIcon={<TaskAlt fontSize="medium" />}
                        sx={{
                          p: 0,
                          mr: 1,
                          "& .MuiSvgIcon-root": { fontSize: 22 },
                          "&.Mui-checked": { color: "success.main" },
                        }}
                        disabled={loading}
                      />
                    }
                    label={
                      <span className="font-fynd">
                        I agree to{" "}
                        <button
                          type="button"
                          className="cursor-pointer rounded text-[#176fc6] underline hover:text-[#0d62b6] focus:ring-2 focus:ring-[#176fc6]/30 focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTermsModal(true);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={loading}
                        >
                          Terms & Conditions
                        </button>
                      </span>
                    }
                  />
                  <FormHelperText>
                    {errors.acceptedTerms ? errors.acceptedTerms : " "}
                  </FormHelperText>
                </FormControl>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitDisabled}
                aria-busy={loading}
                aria-disabled={isSubmitDisabled}
                className={`font-fynd mt-3 flex w-full justify-center rounded-md py-2 text-white shadow transition-colors duration-300 ease-in-out focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSubmitDisabled
                    ? "bg-gray-500"
                    : "bg-black hover:cursor-pointer hover:bg-[#008ecc]"
                } focus:ring-black/40`}
              >
                {loading ? <LoadingDots text="Sending OTP" /> : "Signup"}
              </button>
            </form>
          </div>
        </div>

        {/* Terms modal */}
        <CustomModal
          open={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          size={"md"}
          isDark={false}
        >
          <div className="font-fynd flex flex-col text-gray-900">
            <h1>Terms & Conditions</h1>
            <p>point</p>
          </div>
        </CustomModal>

        <ConfimationModal
          open={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
        />
        <OtpModal
          open={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          onVerify={onVerify}
        />
      </div>
    </ThemeProvider>
  );
};

export default Signup;
