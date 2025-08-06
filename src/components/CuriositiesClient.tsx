'use client';
import React from "react";
import PresentationContainer from "./ui/presentationContainer";
import { useTranslation } from "@/hooks/useTranslation";

const CuriositiesClient = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center space-y-8 w-screen bg-primaryColor p-4">
      {" "}
      {/* <SectionTitle>De ce noi?</SectionTitle> */}
      <div className="flex flex-col lg:flex-row space-y-8 lg:space-y-0 lg:space-x-8">
        <PresentationContainer
          title={t('curiosities.visionTitle')}
          description={t('curiosities.visionDescription')}
        />
        <PresentationContainer
          title={t('curiosities.differenceTitle')}
          description={t('curiosities.differenceDescription')}
        />
        <PresentationContainer
          title={t('curiosities.audienceTitle')}
          description={t('curiosities.audienceDescription')}
        />
      </div>
    </div>
  );
};

export default CuriositiesClient;
