import React from "react";
import PageLayout from "../../../components/PageLayout";

const WeAreWorking = () => {
  return (
    <PageLayout
      title="We Are Working"
      contentClassName="flex flex-1 flex-col overflow-hidden"
    >
      <div className="flex h-full min-h-0 flex-col items-center justify-center">
        <p className="text-lg text-gray-600">We are working on this page.</p>
      </div>
    </PageLayout>
  );
};

export default WeAreWorking;
