import React from 'react'

const PresentationContainer = ({title,description}:{title:string,description:string}) => {
  return (
    <div className='flex flex-col items-center justify-center space-y-4 w-full lg:w-[300px] h-[250px] lg:h-[450px] p-4  text-primaryColor shadow-md shadow-primaryColor/50 cursor-pointer bg-white rounded-lg hover:scale-105 transition-all duration-300 ease-in-out '>
        <h3 className='font-bold text-xl'>{title}</h3>
        <p className='text-thin test-justify'>{description}</p>
    </div>
  )
}

export default PresentationContainer