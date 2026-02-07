import { createSlice } from "@reduxjs/toolkit";

const initialTheme = (() => {
  if (typeof localStorage !== "undefined") {
    return (
      localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    );
  }
  return "light";
})();

const themeSlice = createSlice({
  name: "theme",
  initialState: { value: initialTheme },
  reducers: {
    toggleTheme: (state) => {
      state.value = state.value === "light" ? "dark" : "light";
    },
    setTheme: (state, action) => {
      state.value = action.payload;
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
