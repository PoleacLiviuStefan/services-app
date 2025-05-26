// components/providerProfile/ProviderProfileSection.tsx
'use client';

import React, { useState } from 'react'
import Button from '../atoms/button'
import AboutProvider from './AboutProvider'
import ReviewsProvider from './ReviewsProvider'
import ScheduleMeeting from './ScheduleMeeting'
import { ProviderInterface } from '@/interfaces/ProviderInterface'
import { CiCircleInfo,CiStar,CiCalendar } from "react-icons/ci";
interface Props {
  provider: ProviderInterface & {
    // ne așteptăm să existe lista de review-uri pe provider
    reviews: Array<{
      id: string
      comment?: string
      date: string
      rating: number
      fromUser: { id: string; name: string; image?: string }
    }>
  }
}

const ProviderProfileSection: React.FC<Props> = ({ provider }) => {
  const [shownIndexSection, setIndexShownSection] = useState(1)

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
          <span className='text-lg'><CiCircleInfo /></span>Despre Mine
        </Button>
        <Button
          onClick={() => setIndexShownSection(2)}
          className={`w-full px-2 lg:px-4 py-1 lg:py-2 text-md gap-1 font-semibold border-2 text-center ${
            shownIndexSection === 2
              ? 'bg-gradient-to-tr from-buttonPrimaryColor to-buttonSecondaryColor text-white'
              : 'bg-transparent text-black'
          }`}
        >
          <span className='text-lg'><CiStar /></span>Recenzii
        </Button>
        <Button
          onClick={() => setIndexShownSection(3)}
          className={`w-full px-2 lg:px-4 py-1 lg:py-2 gap-1 text-md font-semibold border-2 text-center ${
            shownIndexSection === 3
              ? 'bg-gradient-to-tr from-buttonPrimaryColor to-buttonSecondaryColor text-white'
              : 'bg-transparent text-black'
          }`}
        >
          <span className='text-lg'><CiCalendar /></span>Programare Sedinta
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
          <ScheduleMeeting />
        )}
      </div>
    </div>
  )
}

export default ProviderProfileSection
