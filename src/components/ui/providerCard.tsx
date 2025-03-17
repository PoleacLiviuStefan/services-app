import React from 'react'
import { FaStar,FaPhoneVolume,FaVideo } from "react-icons/fa";
import { MdMessage } from "react-icons/md";
import Image from 'next/image'
import type { StaticImageData } from 'next/image';
import Icon from '../atoms/icon';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface ProviderCardProps {
    name: string,
    photo: StaticImageData,
    rating: number,
    description: string,
    reviews: number,
    speciality:string
}

const ProviderCard:React.FC<ProviderCardProps> = ({name,photo,rating,description,reviews,speciality}) => {
    const { data: session } = useSession();
    const user = session?.user;
  return (
    <div className='relative h-[465px] lg:h-[500px] w-[220px] lg:w-[260px] border-8 border-primaryColor/10  rounded-lg hover:shadow-lg shadow-primaryColor transition duration-300 ease-in-out cursor-pointer bg-white text-black'>
      <span className='absolute top-[5px] left-1 bg-green-400 text-white font-extrabold text-[11px] px-1 bg-opacity-80 rounded-lg'>ONLINE</span>
      <span className='flex items-center space-x-2 absolute top-[5px] right-1 bg-orange-500 text-white font-extrabold text-[13px] px-1 bg-opacity-60 rounded-lg'>{rating}<span><FaStar/></span></span>
        <Image src={photo} className='h-[230px] w-full object-cover rounded-b-lg' alt="" />
        <div className='absolute flex justify-center items-center w-full -mt-[45px] h-[45px] bg-gradient-to-t from-[#000000]/70 to-transparent p-2 rounded-b-lg text-white  '>
            <span className='font-bold'>{name}</span>
        </div>
        <div className='flex flex-col items-center p-2 rounded-t-xl text-white  text-primaryColor'>
          <span className='text-sm lg:text-md border-2  px-2 py-1 rounded-xl text-primaryColor'>{reviews} Recenzii</span>
          <span className='font-bold mt-2 text-secondaryColor text-sm lg:text-sm'>Specialitate Principala</span>
          <span className='flex justify-center items-center w-full bg-secondaryColor h-[20px] lg:-[30px] text-white rounded-lg font-semibold text-sm lg:text-md'>{speciality}</span>
          <span className='text-semibold  py-2 text-black overflow-hidden text-ellipsis h-full leading-none lg:leading-1 lg:h-[70px] text-sm lg:text-md' >{description}</span>
          <div className='flex flex-col justify-center  lg:py-1 bg-primaryColor/40 rounded-lg w-full h-14 lg:h-20 lg:space-y-1 font-bold '>
          <p className='text-sm lg:text-md text-center  hidden lg:inline'>Alege una dintre cele 3 metode</p>
            <div className="flex items-center justify-between px-4 lg:px-8">
              <Link href={user ? "/servicii/apel":"/autentificare"}><Icon ><FaPhoneVolume /></Icon></Link>
              <Link href={user ? "/servicii/video":"/autentificare"}><Icon ><FaVideo /></Icon></Link>
              <Link href={user ? "/servicii/mesagerie":"/autentificare"}><Icon ><MdMessage /></Icon></Link>
            </div>
          </div>
        </div>
       
    </div>
  )
}

export default ProviderCard