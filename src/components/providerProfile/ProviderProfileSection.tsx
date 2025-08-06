// File: components/providerProfile/ProviderProfileSection.tsx
'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Button from '../atoms/button';
import AboutProvider from './AboutProvider';
import ReviewsProvider from './ReviewsProvider';
import ScheduleMeeting from './ScheduleMeeting';
import { ProviderInterface } from '@/interfaces/ProviderInterface';
import { CiCircleInfo, CiStar, CiCalendar } from "react-icons/ci";

interface Props {
  provider: ProviderInterface & {
    reviews: Array<{
      id: string;
      comment?: string;
      date: string;
      rating: number;
      fromUser: { id: string; name: string; image?: string };
    }>;
    packages: Array<{
      id: string;
      service: string;
      totalSessions: number;
      price: number;
      createdAt: string;
      expiresAt: string | null;
    }>;
  };
}

const ProviderProfileSection: React.FC<Props> = ({ provider }) => {
  const [shownIndexSection, setIndexShownSection] = useState(1);
  const { t } = useTranslation();

  // Serviciile unice extrase din pachete
  const services = Array.from(
    new Set(provider.packages.map(pkg => pkg.service))
  );
  console.log("Services este aici: ", services);
  console.log("provider.packages este aici: ", provider.packages);
  return (
    <div className="w-full bg-white flex flex-col">
      <div className="flex justify-center w-full">
        <Button
          onClick={() => setIndexShownSection(1)}
          className={`flex w-full px-2 lg:px-4 py-1 lg:py-2 gap-1 text-md font-semibold border-2 text-center ${
            shownIndexSection === 1
              ? 'bg-gradient-to-tr from-buttonPrimaryColor to-buttonSecondaryColor text-white'
              : 'bg-transparent text-black'
          }`}
        >
          <CiCircleInfo className="text-lg" /> {t('providerProfileSection.aboutMe')}
        </Button>
        <Button
          onClick={() => setIndexShownSection(2)}
          className={`flex w-full px-2 lg:px-4 py-1 lg:py-2 gap-1 text-md font-semibold border-2 text-center ${
            shownIndexSection === 2
              ? 'bg-gradient-to-tr from-buttonPrimaryColor to-buttonSecondaryColor text-white'
              : 'bg-transparent text-black'
          }`}
        >
          <CiStar className="text-lg" /> {t('providerProfileSection.reviews')}
        </Button>
        <Button
          onClick={() => setIndexShownSection(3)}
          className={`flex w-full px-2 lg:px-4 py-1 lg:py-2 gap-1 text-md font-semibold border-2 text-center ${
            shownIndexSection === 3
              ? 'bg-gradient-to-tr from-buttonPrimaryColor to-buttonSecondaryColor text-white'
              : 'bg-transparent text-black'
          }`}
        >
          <CiCalendar className="text-lg" /> {t('providerProfileSection.scheduleMeeting')}
        </Button>
      </div>

      <div className="py-6">
        {shownIndexSection === 1 && (
          <AboutProvider
            mainSpecialty={provider.mainSpeciality}
            moreSpecialties={provider.moreSpecialties}
            mainTool={provider.mainTool}
            moreTools={provider.moreTools}
            readingStyle={provider.readingStyle}
            about={provider.about}
          />
        )}

        {shownIndexSection === 2 && (
          <ReviewsProvider reviews={provider.reviews} />
        )}

        {shownIndexSection === 3 && (
          <ScheduleMeeting
            providerId={provider.id}
            services={provider.packages}
            providerStripeAccountId={provider.stripeAccountId}
            locale="ro"
          />
        )}
      </div>
    </div>
  );
};

export default ProviderProfileSection;
