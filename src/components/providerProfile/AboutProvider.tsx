// components/AboutProvider.tsx
import React, { FC } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export interface AboutProviderProps {
  mainSpecialty: string;
  moreSpecialties: string[];
  mainTool: string;
  moreTools: string[];
  readingStyle: string;
  about: string;
}

const pillClasses = "inline-block px-3 py-1 mr-2 mb-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium uppercase";


const AboutProvider: FC<AboutProviderProps> = ({
  mainSpecialty,
  moreSpecialties,
  mainTool,
  moreTools,
  readingStyle,
  about,
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-8 text-sm lg:text-lg">
      <div>
        <h3 className="font-semibold mb-2">{t('providerDetails.mainSpeciality')}</h3>
        <span className={pillClasses}>{mainSpecialty?.name || t('providerDetails.notAvailable')}</span>
      </div>

      <div>
        <h3 className="font-semibold mb-2">{t('providerDetails.specialities')}</h3>
        {moreSpecialties.length > 0
          ? moreSpecialties.map((spec) => (
              <span key={spec} className={pillClasses}>
                {spec}
              </span>
            ))
          : <span className={pillClasses}>{t('providerDetails.none')}</span>
        }
      </div>

      <div>
        <h3 className="font-semibold mb-2">{t('providerDetails.mainTool')}</h3>
        <span className={pillClasses}>{mainTool || t('providerDetails.notAvailable')}</span>
      </div>

      <div>
        <h3 className="font-semibold mb-2">{t('providerDetails.tools')}</h3>
        {moreTools.length > 0
          ? moreTools.map((tool) => (
              <span key={tool} className={pillClasses}>
                {tool}
              </span>
            ))
          : <span className={pillClasses}>{t('providerDetails.none')}</span>
        }
      </div>

      <div>
        <h3 className="font-semibold mb-2">{t('providerDetails.reading')}</h3>
        <span className={pillClasses}>{readingStyle || t('providerDetails.notAvailable')}</span>
      </div>

      <div>
        <h3 className="font-semibold mb-2">{t('providerDetails.description')}</h3>
        <p className="text-gray-700 whitespace-pre-line">{about}</p>
      </div>
    </div>
  );
};

export default AboutProvider;
