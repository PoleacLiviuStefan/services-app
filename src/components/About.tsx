import React from 'react'
import SectionTitle from './ui/sectionTitle'

const About = () => {
  return (
    <div>
        <span className='flex flex-col items-center text-white'>
            <SectionTitle>Despre noi</SectionTitle>
            <div className='grid grid-cols-2 gap-4 text-primaryColor' >
                <div className='flex'>
                <span className='text-lg lg:text-2xl'>Care este scopul nostru?</span>
                </div>
                <div className='flex gap-4'>
                <span className='text-md lg:text-xl bg-gradient-to-tr from-secondaryColor to-[#001F44] h-[250px] w-[250px] rounded-full'></span>
                <span className='text-md lg:text-xl bg-gradient-to-tr from-buttonSecondaryColor to-buttonPrimaryColor h-[250px] w-[250px] rounded-full'></span>
                </div>
            </div>
        </span>
    </div>
  )
}

export default About