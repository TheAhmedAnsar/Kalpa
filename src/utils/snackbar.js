let enqueueRef = null;

export const setGlobalEnqueueSnackbar = (enqueueFn) => {
  enqueueRef = typeof enqueueFn === "function" ? enqueueFn : null;
};

export const enqueueGlobalSnackbar = (message, options) => {
  if (enqueueRef) {
    enqueueRef(message, options);
  }
};



