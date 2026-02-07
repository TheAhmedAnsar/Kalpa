import React, { useState } from "react";
import { useDispatch } from "react-redux";
import CsvWorkflow from "../../../../components/CsvWorkflow";
import BulkActionModal from "../BulkActionModal";
import apiClient from "../../../../api/client";
import { resetWorkflow, setSubmitting } from "../../../../store";

const Serviceability = () => {
  const [taskId, setTaskId] = useState("");

  const options = [
    { value: "pincodeserviceability", label: "Pincode serviceability" },
    { value: "storeserviceability", label: "Store Serviceability" },
  ];
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const dispatch = useDispatch();

  const handleCreateTask = async (payload) => {
    dispatch(setSubmitting({ id: "serviceability", value: true }));
    let type = null;
    try {
      if (payload.job_type === "pincodeserviceability") {
        type = {
          type: "serviceability",
          sub_type: "pincode",
        };
      } else {
        type = {
          type: "serviceability",
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
        dispatch(resetWorkflow("serviceability"));
      }
    } catch (error) {
      console.error("Serviceability task creation error:", error);
    } finally {
      dispatch(setSubmitting({ id: "serviceability", value: false }));
    }
  };
  return (
    <div className="flex h-full justify-center">
      <CsvWorkflow
        workflowId="serviceability"
        options={options}
        sampleFileUrl="/sample-serviceability.csv"
        onSubmit={handleCreateTask}
        descriptionsByOption={{
          pincodeserviceability: [
            "1P Serviceability determines whether a delivery partner is serviceable at customer, store and store pincodes",
            "Format:",
            "-*pincode/store*",
            "-*lsp*",
            "-*fm_priority*",
            "-*lm_priority*",
            "-*rvp_priority*",
            "-*area_code*",
            "These three parameters fm, lm, and rvp determine an LSP's serviceability on a store or a pincode. So, for a lsp to be serviceable on a store, its fm should be positive on both store and store pincode. Similarly, a lsp is serviceable on a customer's pincode if its lm are positive on that very pincode",
            "rvp priority come into play in case of return/reverse serviceability, where a postive rvp reflects that a lsp is serviceable to pick at the customer pincode",
            "All the three parameters are strict integers, which can either be positive or negative",
          ],
          storeserviceability: [
            "RVSL Serviceability determines whether a delivery partner is serviceable at customer, store and store pincodes.",
            "Format:",
            "-*pincode/store*",
            "-*lsp*",
            "-*fm_priority*",
            "-*lm_priority*",
            "-*rvp_priority*",
            "-*area_code*",
            "These three parameters fm, lm, and rvp determine an LSP's serviceability on a store or a pincode. So, for a lsp to be serviceable on a store, its fm should be positive on both store and store pincode. Similarly, a lsp is serviceable on a customer's pincode if its lm are positive on that very pincode",
            "rvp priority come into play in case of return/reverse serviceability, where a postive rvp reflects that a lsp is serviceable to pick at the customer pincode",
            "All the three parameters are strict integers, which can either be positive or negative",
          ],
        }}
        sampleHeadersByOption={{
          pincodeserviceability: [
            "pincode/store",
            "lsp",
            "fm_priority",
            "lm_priority",
            "rvp_priority",
            "area_code",
          ],
          storeserviceability: [
            "pincode/store",
            "lsp",
            "fm_priority",
            "lm_priority",
            "rvp_priority",
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

export default Serviceability;
