// components/Review.tsx
'use client';

import React, { FC } from 'react';
import { FaStar, FaRegStar, FaStarHalfAlt,FaVideo } from 'react-icons/fa';
import { MdMessage } from 'react-icons/md';
export interface ReviewProps {
  userName: string;
  date: string | Date;
  rating: number;           // valoare între 0 și 5, poate zecimală
  comment?: string;
  service: string;
}

const Review: FC<ReviewProps> = ({ userName, date, rating, comment,service }) => {
  // transformăm date în obiect Date
  const reviewDate = typeof date === 'string' ? new Date(date) : date;
  // formatăm data
  const formattedDate = reviewDate.toLocaleDateString('ro-RO', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric'
  });

  // construim array-ul de stele
  const fullStars = Math.floor(rating);
  const hasHalf  = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="border-b pb-4 mb-4 last:border-none">
      <div className="flex items-center justify-between mb-2">
        <div>

        
        
        <span className='text-gray-400 font-bold text-sm lg:text-lg'>{userName}</span>
      
      
        <div className="flex items-center">
          {[...Array(fullStars)].map((_, i) => (
            <FaStar key={`full-${i}`} className="text-yellow-500 mr-1" />
          ))}
          {hasHalf && <FaStarHalfAlt className="text-yellow-500 mr-1" />}
          {[...Array(emptyStars)].map((_, i) => (
            <FaRegStar key={`empty-${i}`} className="text-yellow-500 mr-1" />
          ))}
        </div>
        
        </div>
        <div className="flex flex-col items-center text-sm text-gray-500 space-y-4">
           {formattedDate}
           <div className='flex flex-col items-center '>
           Tipul sedintei:
           <span className='flex justify-center items-center text-lg lg:text-xl w-8 lg:w-10 h-8 lg:h-10 text-white bg-gradient-to-t from-secondaryColor to-secondaryColor rounded-full shadow-md shadow-secondaryColor'>{service==='MEET' ? <FaVideo/> : <MdMessage/>} </span>
           </div>
        </div>
      </div>
      {comment && (
        <p className="text-gray-800 whitespace-pre-line text-sm lg:text-md">
          {comment}
        </p>
      )}
    </div>
  );
};

export default Review;
