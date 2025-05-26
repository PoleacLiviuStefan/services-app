import React from 'react'
import mysticLogo from '../../../public/mysticnoblack.svg'
import Image from 'next/image'
const ShowcaseCategory = () => {
  return (
    <div className='flex items-center justify-center w-[100px] lg:w-[150px] h-[100px] lg:h-[150px] bg-white shadow-lg rounded-full'>
            <Image src={mysticLogo} alt="Logo" className="w-[60px] h-full" />
    </div>
  )
}

export default ShowcaseCategory