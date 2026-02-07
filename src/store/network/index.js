import { createSlice } from "@reduxjs/toolkit";

const networkSlice = createSlice({
  name: "network",
  initialState: {
    vertical: "",
    file: null, // { name, size }
    pincodes: [],
    stores: [],
  },
  reducers: {
    setVertical(state, action) {
      state.vertical = action.payload;
    },
    setFile(state, action) {
      state.file = action.payload;
    },
    setPincodes(state, action) {
      state.pincodes = action.payload;
    },
    setStores(state, action) {
      state.stores = action.payload;
    },
    resetNetwork(state) {
      state.vertical = "";
      state.file = null;
      state.pincodes = [];
      state.stores = [];
    },
  },
});

export const {
  setVertical,
  setFile,
  setPincodes,
  setStores,
  resetNetwork,
} = networkSlice.actions;

export default networkSlice.reducer;
