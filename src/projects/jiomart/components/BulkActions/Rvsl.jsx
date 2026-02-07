import React, { useState } from "react";
import { useDispatch } from "react-redux";
import CsvWorkflow from "../../../../components/CsvWorkflow";
import BulkActionModal from "../BulkActionModal";
import apiClient from "../../../../api/client";
import { resetWorkflow, setSubmitting } from "../../../../store";

const Rvsl = () => {
  const [taskId, setTaskId] = useState("");

  const options = [
    // { value: "pindpmapping", label: "PIN DP Mapping" },
    { value: "rvslpincodeserviceability", label: "Pincode Serviceability" },
    { value: "rvslstoreserviceability", label: "Store Serviceability" },
  ];

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const dispatch = useDispatch();

  const handleCreateTask = async (payload) => {
    dispatch(setSubmitting({ id: "rvsl", value: true }));
    let type = null;
    try {
      if (payload.job_type === "rvslpincodeserviceability") {
        type = {
          type: "rvsl",
          sub_type: "pincode",
        };
      } else {
        type = {
          type: "rvsl",
          sub_type: "store",
        };
      }
      const fd = new FormData();
      fd.append("file", payload.file);
      fd.append("execution_type", payload.execution_type);
      fd.append("job_type", JSON.stringify(type));
      fd.append("scheduled_at", payload.schedule_at);
      const res = await apiClient.post("/__deku/api/v1/job/create", fd);
      const data = await res.data;
      if (data.success) {
        const taskId = data.task_id;
        setTaskId(taskId);
        setShowConfirmationModal(true);
        dispatch(resetWorkflow("rvsl"));
      }
    } catch (error) {
      console.error("RVSL task creation error:", error);
    } finally {
      dispatch(setSubmitting({ id: "rvsl", value: false }));
    }
  };
  return (
    <div className="flex h-full justify-center">
      <CsvWorkflow
        workflowId="rvsl"
        options={options}
        sampleFileUrl="/sample-rvsl.csv"
        onSubmit={handleCreateTask}
        descriptionsByOption={{
          rvslpincodeserviceability: [
            "RVSL Serviceability determines whether a delivery partner is serviceable at customer, store and store pincodes.",
            "Format:",
            "-*pincode/store*",
            "-*lsp*",
            "-*fm_priority*",
            "-*lm_priority*",
            "-*rvp_priority*",
            "-*rqc_priority*",
            "-*area_code*",
            "These four parameters fm, lm, rvp and rqc determine an LSP's serviceability on a store or a pincode. So, for a lsp to be serviceable on a store, its fm should be positive on both store and store pincode. Similarly, a lsp is serviceable on a customer's pincode if its lm are positive on that very pincode.",
            "rvp and rqc priorities come into play in case of return/reverse serviceability, where a postive rvp reflects that a lsp is serviceable to pick at the customer pincode and a positive rqc retraces which lsps are available for a doing a quality check at customer's doorstep.",
            "All the four parameters are strict integers, which can either be positive or negative.",
          ],
          rvslstoreserviceability: [
            "RVSL Serviceability determines whether a delivery partner is serviceable at customer, store and store pincodes.",
            "Format:",
            "-*pincode/store*",
            "-*lsp*",
            "-*fm_priority*",
            "-*lm_priority*",
            "-*rvp_priority*",
            "-*rqc_priority*",
            "-*area_code*",
            "These four parameters fm, lm, rvp and rqc determine an LSP's serviceability on a store or a pincode. So, for a lsp to be serviceable on a store, its fm should be positive on both store and store pincode. Similarly, a lsp is serviceable on a customer's pincode if its lm are positive on that very pincode.",
            "rvp and rqc priorities come into play in case of return/reverse serviceability, where a postive rvp reflects that a lsp is serviceable to pick at the customer pincode and a positive rqc retraces which lsps are available for a doing a quality check at customer's doorstep.",
            "All the four parameters are strict integers, which can either be positive or negative.",
          ],
        }}
        sampleHeadersByOption={{
          rvslpincodeserviceability: [
            "pincode/store",
            "lsp",
            "fm_priority",
            "lm_priority",
            "rvp_priority",
            "rqc_priority",
            "area_code",
          ],
          rvslstoreserviceability: [
            "pincode/store",
            "lsp",
            "fm_priority",
            "lm_priority",
            "rvp_priority",
            "rqc_priority",
            "area_code",
          ],
        }}
      />
      <BulkActionModal
        taskId={taskId}
        open={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
      />
    </div>
  );
};

export default Rvsl;
