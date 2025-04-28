'use client';

import React from 'react';

const LoadingSkeleton = () => {
  return (
    <div className="relative w-card h-card border-8 border-primaryColor/10 rounded-lg bg-white shadow hover:shadow-lg animate-pulse cursor-pointer">
      
      {/* Poza */}
      <div className="h-[230px] w-full bg-gray-300 rounded-b-lg"></div>

      {/* Bara cu numele */}
      <div className="absolute flex justify-center items-center w-full -mt-[45px] h-[45px] bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
        <div className="w-24 h-4 bg-gray-400 rounded"></div>
      </div>

      {/* Conținutul de jos */}
      <div className="flex flex-col items-center p-2 rounded-t-xl">
        
        {/* Recenzii */}
        <div className="w-1/2 h-4 bg-gray-300 rounded mb-2"></div>

        {/* Specialitate principală */}
        <div className="h-4 w-1/2 bg-gray-300 rounded mb-2"></div>
        <div className="h-8 w-full bg-gray-300 rounded mb-2"></div>

        {/* Filtru activ */}
        <div className="h-4 w-2/3 bg-gray-300 rounded mb-2"></div>
        <div className="h-6 w-1/2 bg-gray-300 rounded mb-4"></div>

        {/* Descriere */}
        <div className="h-12 w-5/6 bg-gray-300 rounded mb-4"></div>

        {/* Iconuri metode de contact */}
        <div className="flex items-center justify-between bg-primaryColor/40 w-full h-14 lg:h-20 rounded-lg px-4 lg:px-8">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        </div>

      </div>
    </div>
  );
};

export default LoadingSkeleton;
