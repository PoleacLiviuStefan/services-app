import React from 'react'
import { FaStar,FaPhoneVolume,FaVideo } from "react-icons/fa";
import { MdMessage } from "react-icons/md";
import Image from 'next/image'
import type { StaticImageData } from 'next/image';

interface ProviderCardProps {
    name: string,
    photo: StaticImageData,
    rating: number,
    description: string,
    reviews: number,
    speciality:string
}

const ProviderCard:React.FC<ProviderCardProps> = ({name,photo,rating,description,reviews,speciality}) => {
  return (
    <div className='relative h-[550px] w-[260px] border-8 border-primaryColor/10  rounded-lg hover:shadow-lg shadow-primaryColor transition duration-300 ease-in-out cursor-pointer bg-white text-black'>
      <span className='absolute top-[5px] left-1 bg-green-400 text-white font-extrabold text-[11px] px-1 bg-opacity-80 rounded-lg'>ONLINE</span>
      <span className='flex items-center space-x-2 absolute top-[5px] right-1 bg-orange-500 text-white font-extrabold text-[13px] px-1 bg-opacity-60 rounded-lg'>{rating}<span><FaStar/></span></span>
        <Image src={photo} className='h-[230px] w-full object-cover rounded-b-lg' alt="" />
        <div className='absolute flex justify-center items-center w-full -mt-[45px] h-[45px] bg-gradient-to-t from-[#000000]/70 to-transparent p-2 rounded-b-lg text-white  '>
            <span className='font-bold'>{name}</span>
        </div>
        <div className='flex flex-col items-center p-4 rounded-t-xl text-white  text-primaryColor'>
          <span className='text-sm lg:text-md border-2  px-2 py-1 rounded-xl text-primaryColor'>{reviews} Recenzii</span>
          <span className='font-bold mt-2 text-secondaryColor'>Specialitate Principala</span>
          <span className='flex justify-center items-center w-full bg-secondaryColor h-[30px] text-white rounded-lg font-semibold'>{speciality}</span>
          <span className='text-semibold my-2 text-black overflow-hidden text-ellipsis h-[70px]' >{description}</span>
          <div className='flex flex-col  py-1 bg-primaryColor/40 rounded-lg w-full h-20 space-y-1 font-bold '>
          <p className='text-sm lg:text-md text-center'>Alege una dintre cele 3 metode</p>
            <div className="flex items-center justify-between px-8">
              <span className='flex justify-center items-center  text-xl w-10 h-10 text-white bg-gradient-to-t from-secondaryColor to-secondaryColor rounded-full shadow-md shadow-secondaryColor'><FaPhoneVolume /></span>
              <span className='flex justify-center items-center  text-xl w-10 h-10 text-white bg-gradient-to-t from-secondaryColor to-secondaryColor rounded-full shadow-md shadow-secondaryColor'><FaVideo /></span>
              <span className='flex justify-center items-center  text-xl w-10 h-10 text-white bg-gradient-to-t from-secondaryColor to-secondaryColor rounded-full shadow-md shadow-secondaryColor'><MdMessage /></span>
            </div>
          </div>
        </div>
       
    </div>
  )
}

export default ProviderCard