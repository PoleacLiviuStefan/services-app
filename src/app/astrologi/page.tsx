import FilteredPsychics from '@/components/FilteredPsychics'
import React from 'react'

const page = () => {
  return (
    <div className='flex flex-col items-center   min-h-screen w-full h-full   px-4 py-20  bg-gradient-to-t from-primaryColor to-secondaryColor  '>
            <div className='flex flex-col items-center lg:items-start w-full lg:w-[67rem] space-y-8 '>
            <h1 className='text-white font-semibold  text-2xl lg:text-4xl'>Astrologi Lorem Ipsum</h1>
            <FilteredPsychics />
            </div>
    </div>
  )
}

export default page 