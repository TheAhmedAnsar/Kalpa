import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { enqueueSnackbar } from "notistack";
import CsvWorkflow from "../../../../components/CsvWorkflow";
import BulkActionModal from "../BulkActionModal";
import apiClient from "../../../../api/client";
import { resetWorkflow, setSubmitting } from "../../../../store";

const LaneTat = () => {
  const options = [
    { value: "regiontat", label: "Region TAT" },
    { value: "clustertat", label: "Cluster TAT" },
  ];
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const [taskId, setTaskId] = useState("");
  const dispatch = useDispatch();

  const handleCreateTask = async (payload) => {
    dispatch(setSubmitting({ id: "laneTat", value: true }));
    try {
      const type =
        payload.job_type === "regiontat"
          ? {
              type: "tat",
              sub_type: "region",
            }
          : {
              type: "tat",
              sub_type: "cluster",
            };

      const fd = new FormData();
      fd.append("file", payload.file);
      fd.append("execution_type", payload.execution_type);
      fd.append("job_type", JSON.stringify(type));
      fd.append("scheduled_at", payload.schedule_at);

      const { data } = await apiClient.post("/__deku/api/v1/job/create", fd);

      if (data?.success) {
        const createdTaskId = data.task_id || "";
        setTaskId(createdTaskId);
        enqueueSnackbar("Task created successfully", { variant: "success" });
        setShowConfirmationModal(true);
        dispatch(resetWorkflow("laneTat"));
      } else {
        const message = data?.message || "Failed to create task";
        console.error("Lane TAT task creation failed:", data);
        enqueueSnackbar(message, { variant: "error" });
      }
    } catch (error) {
      console.error("Lane TAT task creation error:", error);
      enqueueSnackbar("Something went wrong while creating the task", {
        variant: "error",
      });
    } finally {
      dispatch(setSubmitting({ id: "laneTat", value: false }));
    }
  };

  return (
    <div className="flex h-full justify-center">
      <CsvWorkflow
        workflowId="laneTat"
        options={options}
        sampleFileUrl="/sample-lanetat.csv"
        onSubmit={handleCreateTask}
        descriptionsByOption={{
          regiontat: [
            "Region TAT is used to evaluate 1P RFC promise and CPD",
            "Format:",
            "-*from_region:* city:INDIA|[STATE]|[CITY]",
            "-*to_region:* city:INDIA|[STATE]|[CITY]",
            "-*from_region*: City of the store pincode",
            "-*to_region*: City of the customer pincode",
            "Region TAT is a range of time period in days (min_days and max_days) that a delivery partner takes to deliver an order from one city to another. It differs from LSP to LSP",
            "Validations applicable on Region TAT:",
            "-Cannot be less than 0 days",
            "-Min TAT should always be less than or equal to Max TAT",
          ],
          clustertat: [
            "Cluster TAT is used to evaluate 3P promise and CPD",
            "Format:",
            "-*origin → destination*",
            "-*origin:* Cluster in which store pincode is located",
            "-*destination:* Cluster in which customer pincode is located",
            "Cluster is an entity that encloses a list of pincodes. All pincodes inside a cluster share the same TAT configurations",
            "Cluster TAT is a range of time period in days (min_days and max_days) that a delivery partner takes to deliver an order from one pincode to another. It differs from LSP to LSP",
            "Validations applicable on Cluster TAT:",
            "-Cannot be less than 0 days",
            "-Min TAT should always be less than or equal to Max TAT",
          ],
        }}
        sampleHeadersByOption={{
          regiontat: [
            "from_region: city:INDIA|[STATE]|[CITY]",
            "to_region: city:INDIA|[STATE]|[CITY]",
            "lsp",
            "min_tat",
            "max_tat",
          ],
          clustertat: ["origin", "destination", "lsp", "min_tat", "max_tat"],
        }}
      />
      <BulkActionModal
        open={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        taskId={taskId}
      />
    </div>
  );
};

export default LaneTat;
