import { useEffect } from "react";
import { useSnackbar } from "notistack";
import { setGlobalEnqueueSnackbar } from "../utils/snackbar";

const SnackbarBridge = () => {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    setGlobalEnqueueSnackbar(enqueueSnackbar);
    return () => setGlobalEnqueueSnackbar(null);
  }, [enqueueSnackbar]);

  return null;
};

export default SnackbarBridge;
