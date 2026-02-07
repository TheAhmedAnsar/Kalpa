import { createSlice } from "@reduxjs/toolkit";

const getInitialWorkflow = () => ({
  panel1Selection: "",
  panel1Complete: false,
  uploadedFile: null,
  fileVerified: false,
  panel2Complete: false,
  updateOption: "",
  scheduleDateTime: null,
  isSubmitting: false,
});

const workflowSlice = createSlice({
  name: "workflow",
  initialState: {
    laneTat: getInitialWorkflow(),
    rvsl: getInitialWorkflow(),
    serviceability: getInitialWorkflow(),
    stores: getInitialWorkflow(),
  },
  reducers: {
    setPanel1Selection(state, action) {
      const { id, value } = action.payload;
      state[id].panel1Selection = value;
    },
    completePanel1(state, action) {
      const id = action.payload;
      state[id].panel1Complete = true;
    },
    setUploadedFile(state, action) {
      const { id, file } = action.payload;
      state[id].uploadedFile = file;
    },
    verifyFile(state, action) {
      const id = action.payload;
      state[id].fileVerified = true;
    },
    resetUploadedFile(state, action) {
      const id = action.payload;
      state[id].uploadedFile = null;
      state[id].fileVerified = false;
    },
    completePanel2(state, action) {
      const id = action.payload;
      state[id].panel2Complete = true;
    },
    setUpdateOption(state, action) {
      const { id, value } = action.payload;
      state[id].updateOption = value;
    },
    setScheduleDateTime(state, action) {
      const { id, value } = action.payload;
      state[id].scheduleDateTime = value;
    },
    setSubmitting(state, action) {
      const { id, value } = action.payload;
      state[id].isSubmitting = value;
    },
    goBackToPanel1(state, action) {
      const id = action.payload;
      state[id].panel1Complete = false;
    },
    goBackToPanel2(state, action) {
      const id = action.payload;
      state[id].panel2Complete = false;
    },
    resetWorkflow(state, action) {
      const id = action.payload;
      state[id] = getInitialWorkflow();
    },
  },
});

export const {
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
} = workflowSlice.actions;

export default workflowSlice.reducer;
