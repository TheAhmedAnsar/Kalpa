import React from "react";
import PageLayout from "../../../components/PageLayout";
import VaultWorkspace from "./JmdConfigurations";

const Configuration = () => {
  return (
    <PageLayout
      title="Configuration"
      contentClassName="flex flex-1 flex-col overflow-hidden"
    >
      <div className="flex h-full min-h-0 flex-col">
        <VaultWorkspace enabledTabs={["moqRules", "holidayUpdate"]} />
      </div>
    </PageLayout>
  );
};

export default Configuration;
