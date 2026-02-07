import React from "react";
import PageLayout from "../../../components/PageLayout";
import ComingSoon from "../../../components/ComingSoon";

const JmdHome = () => {
  return (
    <PageLayout
      title="JMD Home"
      titleClassName="font-extrabold"
      contentClassName="flex flex-1 flex-col gap-4 overflow-hidden"
    >
      <ComingSoon />
    </PageLayout>
  );
};

export default JmdHome;
