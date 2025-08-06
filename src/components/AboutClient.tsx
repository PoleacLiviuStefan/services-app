'use client';
import React from "react";
import SectionTitle from "./ui/sectionTitle";
import { useTranslation } from "@/hooks/useTranslation";

const AboutClient = () => {
  const { t } = useTranslation();

  return (
    <div id="despre-noi" className="flex flex-col items-start text-white space-y-12 p-4 border-primaryColor border-2 rounded-lg w-full h-full">
      <SectionTitle>{t('about.title')}</SectionTitle>
      <div className="flex flex-col lg:grid lg:grid-cols-2 items-center gap-2 text-primaryColor px-3 lg:p-0">
        <div className="flex flex-col">
          <span className="text-lg lg:text-2xl font-bold">
            {t('about.storyTitle')}
          </span>
          <h3 className="font-bold">
            {t('about.subtitle')}
          </h3>
          <p className=" max-w-full lg:max-w-80">
            {t('about.description')}
            <br/> 
            {t('about.description2')} <span className="font-bold">{t('about.enough')}</span>. {t('about.description3')}
          </p>
        </div>
        <div className="flex flex-col items-center lg:flex-row gap-4">
          <span
            className="w-[200px] lg:w-[340px] h-[150px] lg:h-[250px] bg-gradient-to-tr from-secondaryColor to-[#001F44] shadow-lg shadow-secondaryColor"
            style={{
              clipPath:
                "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
            }}
          ></span>

          <span
            className="w-[200px] lg:w-[340px] h-[150px] lg:h-[250px] text-md lg:text-xl bg-gradient-to-tr from-buttonSecondaryColor to-buttonPrimaryColor  shadow-lg shadow-primaryColor"
            style={{
              clipPath:
                "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
            }}
          ></span>
        </div>
      </div>
    </div>
  );
};

export default AboutClient;
