'use client'
import React, { useState } from 'react'
import ProviderCard from './ui/providerCard';
import { FaCaretLeft, FaCaretRight } from 'react-icons/fa';
import ProviderInterface from '@/interfaces/ProviderInterface';
// import person from '../../public/person.avif';

interface AdminPsychicsProps {
  physics: (ProviderInterface & {
    provider: string;
  })[];
}

const AdminPsychics: React.FC<AdminPsychicsProps> = ({physics}) => {
    const items = Array.from({ length: 30 }, (_, i) => i + 1);
    const itemsPerPage = 12; 
    const totalPages = Math.ceil(items.length / itemsPerPage);

    const [currentIndex, setCurrentIndex] = useState(0);

    // const startIndex = currentIndex * itemsPerPage;
    // const currentItems = items.slice(startIndex, startIndex + itemsPerPage);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
      };
    
      const goToNext = () => {
        setCurrentIndex((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
      };
  return (
    <div className='flex flex-col items-center'>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {physics.map((physic:ProviderInterface) => (
            <ProviderCard
              key={physic.id}
              forAdmin={true}
              name={physic.name}
              image={physic.image}
              role={physic.role}
              email={physic.email}
              isProvider={physic.provider ? true : false}
              rating={4.5}
              description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
              reviews={Math.floor(Math.random() * 100)}
              speciality="Speciality"
            />
          ))}
          
    </div>
            <div className="flex items-center space-x-4 mt-6">
              <button
                onClick={goToPrevious}
                className="flex justify-center items-center bg-gradient-to-t from-buttonPrimaryColor to-buttonSecondaryColor text-2xl lg:text-4xl w-10 lg:w-12 h-10 lg:h-12 rounded-full text-white"
              >
                <FaCaretLeft />
              </button>
    
              <ul className="flex space-x-2">
                {Array.from({ length: totalPages }).map((_, page) => (
                  <li
                    key={page}
                    className={`flex items-center justify-center text-white  font-bold text-center w-7 h-7 rounded-full cursor-pointer ${page === currentIndex ? 'bg-gray-600' : 'bg-gray-400'}`}
                    onClick={() => setCurrentIndex(page)}
                  >{page+1}</li>
                ))}
              </ul>
    
              <button
                onClick={goToNext}
                className="flex justify-center items-center bg-gradient-to-t from-buttonPrimaryColor to-buttonSecondaryColor text-2xl lg:text-4xl w-10 lg:w-12 h-10 lg:h-12 rounded-full text-white"
              >
                <FaCaretRight />
              </button>
            </div>
            </div>
            
  )
}

export default AdminPsychics