import React, { useState } from "react";
import { useDispatch } from "react-redux";
import BulkActionModal from "../BulkActionModal";
import CsvWorkflow from "../../../../components/CsvWorkflow";
import apiClient from "../../../../api/client";
import { resetWorkflow, setSubmitting } from "../../../../store";

const Stores = () => {
  const options = [
    { value: "store-tat", label: "Store TAT" },
    { value: "store-cutoff", label: "Store CutOff" },
    { value: "store-timings", label: "Store Timings" },
  ];
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [taskId, setTaskId] = useState("");

  const dispatch = useDispatch();

  const handleCreateTask = async (payload) => {
    dispatch(setSubmitting({ id: "stores", value: true }));
    const jobTypeMap = {
      "store-tat": { type: "store", sub_type: "tat" },
      "store-cutoff": { type: "store", sub_type: "cutoff_time" },
      "store-timings": { type: "store", sub_type: "timings" },
    };

    try {
      const type = jobTypeMap[payload.job_type];
      if (!type) {
        throw new Error(`Unsupported job type: ${payload.job_type}`);
      }

      const fd = new FormData();
      fd.append("file", payload.file);
      fd.append("execution_type", payload.execution_type);
      fd.append("job_type", JSON.stringify(type));
      fd.append("scheduled_at", payload.schedule_at);

      const res = await apiClient.post("/__deku/api/v1/job/create", fd);
      const data = await res.data;

      if (data.success) {
        const createdTaskId = data.task_id;
        setTaskId(createdTaskId);
        dispatch(resetWorkflow("stores"));
        setShowConfirmationModal(true);
      }
    } catch (error) {
      console.error("Stores task creation error:", error);
    } finally {
      dispatch(setSubmitting({ id: "stores", value: false }));
    }
  };
  return (
    <div className="flex h-full justify-center">
      <CsvWorkflow
        workflowId="stores"
        options={options}
        sampleFileUrl="/samples/store-create-sample.csv"
        sampleHeadersByOption={{
          "store-tat": ["store", "min", "max"],
          "store-cutoff": ["store", "hour", "minute"],
          "store-timings": [
            "store",
            "openingHour",
            "openingMinute",
            "closingHour",
            "closingMinute",
          ],
        }}
        descriptionsByOption={{
          "store-create": [
            "CSV with columns: store_code,pincode,latitude,longitude,jio_store_type,fynd_store_type,jio_sale_point,business_unit",
            "Header is optional; if present it will be ignored by the server.",
          ],
          "store-tat": [
            "Columns: store,min,max — min and max in days.",
            "Server will convert days → seconds internally.",
          ],
          "store-cutoff": [
            "Columns: store,hour,minute — hour (0-23), minute (0-59).",
          ],
          "store-timings": [
            "Columns: store,openingHour,openingMinute,closingHour,closingMinute",
            "Ensure opening < closing for the same day.",
          ],
        }}
        onSubmit={handleCreateTask}
      />
      <BulkActionModal
        taskId={taskId}
        open={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
      />
    </div>
  );
};

export default Stores;
